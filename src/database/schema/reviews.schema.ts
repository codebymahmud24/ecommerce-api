import { pgTable, uuid, integer, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { users } from './users.schema';
import { orders } from './orders.schema';

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  rating: integer('rating').notNull(), // 1-5
  title: varchar('title', { length: 200 }),
  comment: text('comment'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviewHelpfulness = pgTable('review_helpfulness', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  isHelpful: boolean('is_helpful').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});