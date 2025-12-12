import { pgTable, uuid, varchar, decimal, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { orders } from './orders.schema';

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal('min_order_value', { precision: 10, scale: 2 }),
  maxUsage: integer('max_usage'),
  usageCount: integer('usage_count').default(0),
  maxUsagePerUser: integer('max_usage_per_user').default(1),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const couponUsage = pgTable('coupon_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  couponId: uuid('coupon_id').references(() => coupons.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
});