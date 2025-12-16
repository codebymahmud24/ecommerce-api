import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, products, categories, inventory, inventoryReservations, reviews, reviewHelpfulness, orders, coupons } from './schema/index';

import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const schema = {
  users,
  products,
  categories,
  inventory,
  orders,
  coupons,
  inventoryReservations,
  reviews,
  reviewHelpfulness
};

export const db = drizzle(pool, { schema });
