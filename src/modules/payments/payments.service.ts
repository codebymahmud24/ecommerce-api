import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(private ordersService: OrdersService) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createPaymentIntent( orderId: string ,userId: string) {
    const order = await this.ordersService.findOne(orderId, userId);

    if (order.paymentIntentId) {
      throw new BadRequestException('Order already has a payment intent');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.total) * 100),
      currency: 'usd',
      metadata: {
        orderId: order.id,
        userId: order.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    this.logger.log(`Created payment intent ${paymentIntent.id} for order ${orderId}`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * WEBHOOK HANDLER - Processes payment events from Stripe
   */
  async handleWebhook(signature: string, rawBody: Buffer) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    this.logger.verbose(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        // ⭐ PAYMENT SUCCESS → CONFIRM RESERVATIONS
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        // ⭐ PAYMENT FAILED → CANCEL RESERVATIONS
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
    } catch (error) {
      this.logger.error("error from payments service", error);
      throw error;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    // const orderId = "6abc957e-e593-4857-b306-7e03cb3d78bf"; // demo uses for testing in Backend
    const orderId = paymentIntent.metadata.orderId;
    this.logger.verbose(`Payment succeeded for paymentIntent `, paymentIntent);

    if (!orderId) {
      this.logger.error('No orderId in payment intent metadata');
      return;
    }

    try {
      // ⭐ THIS CALLS confirmReservation() for all items
      await this.ordersService.confirmPayment(orderId, paymentIntent.id);
      this.logger.verbose(`Payment successful for order ${orderId}, inventory confirmed`);
    } catch (error) {
      this.logger.error(`Error confirming payment for order ${orderId}`, error);
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      const orderId = paymentIntent.metadata.orderId;

      if (!orderId) {
        this.logger.error('No orderId in payment intent metadata');
        return;
      }

      // ⭐ THIS CALLS cancelReservation() for all items
      await this.ordersService.handlePaymentFailure(orderId);
      this.logger.warn(`Payment failed for order ${orderId}, inventory released`);
    } catch (error) {
      this.logger.error(`Error handling payment failure for order `, error);
      throw error;
    }
  }

  async getPaymentIntent(id: string) {
    return this.stripe.paymentIntents.retrieve(id);
  }
}