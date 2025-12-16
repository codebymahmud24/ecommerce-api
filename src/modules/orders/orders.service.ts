import { UsersService } from './../users/users.service';
import { NotificationsService } from './../notifications/notifications.service';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OrderStatus } from 'src/common/enums/orderStatus.enum';
import { schema } from 'src/database';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto';
import { orderItems, orderReservations, orders, orderStatusHistory } from 'src/database/schema';
import { desc, eq } from 'drizzle-orm';


@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private readonly STATE_TRANSITIONS = {
    [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  constructor(
    @Inject("DATABASE") private db: NodePgDatabase<typeof schema>,
    private inventoryService: InventoryService,
    private cartService: CartService,
    private couponsService: CouponsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService
  ) { }

  /**
   * STEP 1: CREATE ORDER & RESERVE INVENTORY
   * This is called when user clicks "Checkout"
   */

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<any> {
    const cart = await this.cartService.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    try {
      return await this.db.transaction(async (tx) => {
        let discount = 0;
        let couponId = null;

        // Apply coupon if provided
        if (createOrderDto.couponCode) {
          const couponDiscount = await this.couponsService.applyCoupon(
            createOrderDto.couponCode,
            userId,
            cart.total,
          );
          discount = couponDiscount.discountAmount;
          couponId = couponDiscount.couponId;
        }

        const subtotal = cart.total;
        const tax = subtotal * 0.1;
        const total = subtotal - discount + tax;

        // Create order with PENDING status
        const [order] = await tx
          .insert(orders)
          .values({
            userId,
            status: OrderStatus.PENDING,
            subtotal: subtotal.toString(),
            discount: discount.toString(),
            tax: tax.toString(),
            total: total.toString(),
            couponId,
            shippingAddress: createOrderDto.shippingAddress,
          })
          .returning();

        // Create order items
        for (const item of cart.items) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.toFixed(2),
          });
        }

        // Add initial status to history
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: OrderStatus.PENDING,
          note: 'Order created, awaiting payment',
        });

        // ⭐ RESERVE INVENTORY FOR ALL ITEMS (15-minute hold)
        const reservations = await this.inventoryService.batchReserveInventory(
          cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          userId,
        );

        // Store reservation IDs with the order for later confirmation/cancellation
        for (const reservation of reservations) {
          await tx.insert(orderReservations).values({
            orderId: order.id,
            reservationId: reservation.reservationId,
            productId: reservation.productId,
            quantity: reservation.quantity
          });
        }

        this.logger.verbose(`Order ${order.id} created with ${reservations.length} inventory reservations`);

        // Clear cart after successful order creation
        await this.cartService.clearCart(userId);

        // Send order confirmation email
        // Demo Notification Service

        return {
          orderId: order.id,
          total: order.total,
          status: order.status,
          reservations,
          message: 'Order created. Complete payment within 15 minutes to confirm.',
        };
      });
    } catch (error) {
      this.logger.error(`Error creating order`, error.message);
      throw new Error(error);
    }
  }

  /**
  * Update order status with state machine validation
  */
  async updateStatus(orderId: string, newStatus: OrderStatus, note?: string,): Promise<void> {
    try {
      const [order] = await this.db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Validate state transition
      const allowedTransitions = this.STATE_TRANSITIONS[order.status];
      if (!allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(
          `Cannot transition from ${order.status} to ${newStatus}`,
        );
      }

      await this.db.transaction(async (tx) => {
        // Update order status
        await tx
          .update(orders)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        // Add to status history
        await tx.insert(orderStatusHistory).values({
          orderId,
          status: newStatus,
          note: note || `Status changed to ${newStatus}`,
        });
      });

      // Send notification to customer about status change
      // ✅ Send email asynchronously (don't wait for it)
      this.sendStatusEmailAsync(orderId, order.userId, newStatus);
      this.logger.log(`Order ${orderId} status updated to ${newStatus}`);

    } catch (error) {
      this.logger.error(`Error updating order status for ${orderId}`, error.message);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      } else {
        throw new Error(error);
      }
    }
  }

  // Separate method to send email without blocking
  private sendStatusEmailAsync(orderId: string, userId: string, status: OrderStatus): void {
    this.usersService.findById(userId)
      .then(({ email }) => {
        return this.notificationsService.sendOrderStatusUpdate(orderId, email, status);
      })
      .catch((error) => {
        // Log but don't throw - email failure shouldn't break the flow
        this.logger.error(`Failed to send status email for order ${orderId}`, error);
      });
  }
  async findAllByUser(userId: string, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      return await this.db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      this.logger.error(`Error fetching orders for user ${userId}`, error.message);
      throw new Error(error);
    }
  }

  async findOne(orderId: string, userId: string) {
    try {
      const [order] = await this.db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Verify ownership
      if (order.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      // Get order items
      const items = await this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Get status history
      const statusHistory = await this.db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderId))
        .orderBy(desc(orderStatusHistory.createdAt));

      return {
        ...order,
        items,
        statusHistory,
      };
    } catch (error) {
      this.logger.error(`Error fetching order ${orderId}`, error.message);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * STEP 2: CONFIRM PAYMENT & CONFIRM RESERVATIONS
   * This is called by PaymentsService when payment succeeds
   */
  async confirmPayment(orderId: string, paymentIntentId: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        // Get all reservations for this order
        const reservations = await tx
          .select()
          .from(orderReservations)
          .where(eq(orderReservations.orderId, orderId));

        // ⭐ CONFIRM ALL RESERVATIONS (deduct from actual inventory)
        for (const reservation of reservations) {
          try {
            await this.inventoryService.confirmReservation(reservation.reservationId);
            this.logger.verbose(`Confirmed reservation ${reservation.reservationId} for order ${orderId}`);
          } catch (error) {
            this.logger.error(`Failed to confirm reservation ${reservation.reservationId}`, error);
            // In production, you might want to handle this more gracefully
            throw new BadRequestException('Failed to confirm inventory reservation');
          }
        }

        // Update order status to PROCESSING
        await tx
          .update(orders)
          .set({
            paymentIntentId,
            status: OrderStatus.PROCESSING,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        // Add to status history
        await tx.insert(orderStatusHistory).values({
          orderId,
          status: OrderStatus.PROCESSING,
          note: 'Payment confirmed, order being processed',
        });

        // Delete reservation records (they're now confirmed)
        await tx
          .delete(orderReservations)
          .where(eq(orderReservations.orderId, orderId));
      });
      8
      this.logger.verbose(`Payment confirmed for order ${orderId}, inventory deducted`);
    } catch (error) {
      this.logger.error(`Error confirming payment for order ${orderId}`, error.message);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new Error(error);
      }
    }
  }

  /**
* STEP 3: CANCEL ORDER & RELEASE RESERVATIONS
* Called when user cancels order or payment fails
*/
  async cancelOrder(orderId: string, userId: string): Promise<void> {
    try {
      const [order] = await this.db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('Cannot cancel shipped or delivered orders');
      }

      await this.db.transaction(async (tx) => {
        // Get all reservations for this order
        const reservations = await tx
          .select()
          .from(orderReservations)
          .where(eq(orderReservations.orderId, orderId));

        // ⭐ CANCEL ALL RESERVATIONS (release inventory back)
        for (const reservation of reservations) {
          try {
            await this.inventoryService.cancelReservation(reservation.reservationId);
            this.logger.log(`Cancelled reservation ${reservation.reservationId} for order ${orderId}`);
          } catch (error) {
            this.logger.error(`Failed to cancel reservation ${reservation.reservationId}`, error);
            // Continue with other reservations even if one fails
          }
        }

        // Update order status to CANCELLED
        await tx
          .update(orders)
          .set({
            status: OrderStatus.CANCELLED,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        // Add to status history
        await tx.insert(orderStatusHistory).values({
          orderId,
          status: OrderStatus.CANCELLED,
          note: 'Order cancelled by user',
        });

        // Delete reservation records
        await tx
          .delete(orderReservations)
          .where(eq(orderReservations.orderId, orderId));
      });

      this.logger.log(`Order ${orderId} cancelled, inventory released`);
    } catch (error) {
      this.logger.error(`Error cancelling order ${orderId}`, error.message);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * STEP 4: HANDLE PAYMENT FAILURE
   * Called by PaymentsService webhook when payment fails
   */
  async handlePaymentFailure(orderId: string): Promise<void> {
    try {
      this.logger.warn(`Payment failed for order ${orderId}, releasing inventory`);

      await this.db.transaction(async (tx) => {
        const reservations = await tx
          .select()
          .from(orderReservations)
          .where(eq(orderReservations.orderId, orderId));

        // ⭐ CANCEL ALL RESERVATIONS
        for (const reservation of reservations) {
          await this.inventoryService.cancelReservation(reservation.reservationId);
        }

        // Update order status
        await tx
          .update(orders)
          .set({
            status: OrderStatus.CANCELLED,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        await tx.insert(orderStatusHistory).values({
          orderId,
          status: OrderStatus.CANCELLED,
          note: 'Payment failed, order cancelled',
        });

        await tx
          .delete(orderReservations)
          .where(eq(orderReservations.orderId, orderId));
      });
    } catch (error) {
      this.logger.error(`Error handling payment failure for order ${orderId}`, error.message);
      throw new Error(error);
    }
  }

}
