import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { eq, lt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/database';
import {
  inventory,
  inventoryReservations,
  products,
} from 'src/database/schema';

interface ReservationResult {
  reservationId: string;
  expiresAt: Date;
}

interface BatchReservationResult {
  reservationId: string;
  productId: string;
  expiresAt: Date;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name); // Logger instance for logging messages
  private readonly RESERVATION_TTL_MINUTES = 15; // Time to live in minutes for reservations
  constructor(@Inject('DATABASE') private db: NodePgDatabase<typeof schema>) {}

  // Run cleanup on startup and every minute
  onModuleInit() {
    this.cleanupExpiredReservations().catch((err) =>
      this.logger.error('Initial cleanup failed', err.stack),
    );
    setInterval(
      () =>
        this.cleanupExpiredReservations().catch((err) =>
          this.logger.error('Cleanup failed', err.stack),
        ),
      60 * 1000,
    );
  }


  /**
   *  --------------- Reserve inventory for a product ---------------
   * @readonlyfor future features like Buy now, Pre-order, Flash sales etc.
   * @param productId 
   * @param quantity 
   * @param userId 
   * @param sessionId 
   * @returns Promise<ReservationResult | null>
   */
  async reserveInventory(
    productId: string,
    quantity: number,
    userId?: string,
    sessionId?: string,
  ): Promise<ReservationResult | null> {
    try{
    return await this.db.transaction(async (tx) => {
      // Use FOR UPDATE to lock the row and prevent concurrent modifications
      const [inventoryRecord] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .for('update');

      if (!inventoryRecord) {
        throw new BadRequestException('Product not found in inventory');
      }

      const availableQuantity =
        inventoryRecord.quantity - inventoryRecord.reserved;

      if (availableQuantity < quantity) {
        throw new BadRequestException(
          `Insufficient inventory. Available: ${availableQuantity}, Requested: ${quantity}`,
        );
      }

      // Update reserved quantity atomically
      await tx
        .update(inventory)
        .set({
          reserved: sql`${inventory.reserved} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, productId));

      // Create reservation record
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.RESERVATION_TTL_MINUTES,
      );

      const [reservation] = await tx
        .insert(inventoryReservations)
        .values({
          productId,
          quantity,
          userId,
          sessionId,
          expiresAt,
        })
        .returning();

      this.logger.log(
        `Reserved ${quantity} units of product ${productId}. Reservation ID: ${reservation.id}`,
      );

      return {
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
      };

    });
  } catch (error) {
    this.logger.error('Error reserving inventory', error);
    throw new InternalServerErrorException('Failed to reserve inventory');
  }
}

  /**
   * ---- Confirm reservation and deduct from actual inventory (called after payment success) ------
   * @param reservationId 
   * @returns Promise<void>
   */
  async confirmReservation(reservationId: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.id, reservationId));

      if (!reservation) {
        throw new BadRequestException('Reservation not found');
      }

      if (new Date() > reservation.expiresAt) {
        throw new BadRequestException('Reservation has expired');
      }

      // Deduct from actual inventory and reserved count
      await tx
        .update(inventory)
        .set({
          quantity: sql`${inventory.quantity} - ${reservation.quantity}`,
          reserved: sql`${inventory.reserved} - ${reservation.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, reservation.productId));

      // Delete reservation record
      await tx
        .delete(inventoryReservations)
        .where(eq(inventoryReservations.id, reservationId));

      this.logger.log(`Confirmed reservation ${reservationId}`);
    });
    } catch (error) {
      this.logger.error(`Error confirming reservation ${reservationId}: ${error}`);
      throw new InternalServerErrorException('Failed to confirm reservation');
    }
  }

  /**
   * ---- Cancel reservation and release inventory (cart abandonment or payment failure)
   * @param reservationId 
   * @returns Promise<void>
   */
  async cancelReservation(reservationId: string): Promise<void> {
      try {
        await this.db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.id, reservationId));

      if (!reservation) {
        return; // Already cancelled or confirmed
      }

      // Release reserved inventory
      await tx
        .update(inventory)
        .set({
          reserved: sql`${inventory.reserved} - ${reservation.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, reservation.productId));

      // Delete reservation
      await tx
        .delete(inventoryReservations)
        .where(eq(inventoryReservations.id, reservationId));

      this.logger.log(`Cancelled reservation ${reservationId}`);
    });
      } catch (error) {
        this.logger.error(`Error cancelling reservation ${reservationId}: ${error}`);
        throw new InternalServerErrorException('Failed to cancel reservation');
      }
  }

 /**
  * ---Check available inventory (actual - reserved) ------
  * @param productId 
  * @returns Promise<number> 
  */
  async checkAvailability(productId: string): Promise<number> {
    try {
      const [inventoryRecord] = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId));

    if (!inventoryRecord) {
      return 0;
    }

    return inventoryRecord.quantity - inventoryRecord.reserved;
    } catch (error) {
      this.logger.error(`Error checking availability for product ${productId}: ${error}`);
      throw new InternalServerErrorException('Failed to check availability');
    }
  }

  /**
   * --------- Cleanup expired reservations and release inventory  ------
   * @returns Promise<void> 
   */
  async cleanupExpiredReservations(): Promise<void> {
    try {
      const expiredReservations = await this.db
        .select()
        .from(inventoryReservations)
        .where(lt(inventoryReservations.expiresAt, new Date()));

      for (const reservation of expiredReservations) {
        await this.cancelReservation(reservation.id);
      }

      if (expiredReservations.length > 0) {
        this.logger.log(
          `Cleaned up ${expiredReservations.length} expired reservations`,
        );
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired reservations', error);
    }
  }

  /**
   * ------------- Admin: Update inventory for a product ------
   * @param productId 
   * @param quantity 
   * @returns Promise<void>
   */
  async updateInventory(productId: string, quantity: number): Promise<void> {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }
    const [inventoryRecord] = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId));

    if (!inventoryRecord) {
      await this.db.insert(inventory).values({
        productId,
        quantity,
        reserved: 0,
      });
      this.logger.log(
        `Initialized inventory for product ${productId} with ${quantity}`,
      );
    } else {
      await this.db
        .update(inventory)
        .set({
          quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, productId));
      this.logger.log(
        `Updated inventory for product ${productId} to ${quantity}`,
      );
    }
  }

  /**
   * ------------- Admin: Get all inventory ------
   * @returns  Promise<any[]>
   */
  async getAllInventory(): Promise<any[] > {
    try {
      const inventoryList = await this.db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        quantity: inventory.quantity,
        reserved: inventory.reserved,
        available: sql<number>`${inventory.quantity} - ${inventory.reserved}`,
        lowStockThreshold: inventory.lowStockThreshold,
        isLowStock: sql<boolean>`${inventory.quantity} - ${inventory.reserved} <= ${inventory.lowStockThreshold}`,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id));

    return inventoryList;
    } catch (error) {
      this.logger.error('Error getting all inventory', error);
      throw new InternalServerErrorException('Failed to get all inventory');
    }
  }
  
}
