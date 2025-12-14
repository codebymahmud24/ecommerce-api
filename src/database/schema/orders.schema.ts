import { pgTable, uuid, varchar, decimal, timestamp, pgEnum, text, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { products } from './products.schema';
import { coupons } from './coupons.schema';
import { OrderStatus } from 'src/common/enums/orderStatus.enum';

export const orderStatusEnum = pgEnum('order_status', Object.values(OrderStatus) as [string, ...string[]]);

// Schema for orders table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: orderStatusEnum('order_status').default(OrderStatus.PENDING).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  couponId: uuid('coupon_id').references(() => coupons.id),
  shippingAddress: text('shipping_address').notNull(),
  paymentIntentId: varchar('payment_intent_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Schema for order items associated with an order
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Schema to track order status history
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  status: orderStatusEnum('status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

//  Schema to track reservations with Inventory per order
export const orderReservations = pgTable('order_reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  reservationId: uuid('reservation_id').notNull(), // Inventory reservation ID
  productId: uuid('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});