import {
  pgTable,
  uuid,
  integer,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { users } from './users.schema';

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull()
    .unique(),
  quantity: integer('quantity').default(0).notNull(),
  reserved: integer('reserved').default(0).notNull(), // For pending orders
  lowStockThreshold: integer('low_stock_threshold').default(10), // for notifications and alerts
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// For temporary reservations of items in the inventory of users or guests.
export const inventoryReservations = pgTable('inventory_reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
