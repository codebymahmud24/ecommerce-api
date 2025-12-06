import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, products, categories } from './schema/index';

import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const schema = {
  users,
  products,
  categories,
};

export const db = drizzle(pool, { schema });
