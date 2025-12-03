 import { defineConfig } from 'drizzle-kit';
   import * as dotenv from 'dotenv';
   
   dotenv.config();
   
   export default defineConfig({
     dialect: 'postgresql',
     schema: './src/database/schema',
     out: './src/database/migrations',
     dbCredentials: {
       host: process.env.DB_HOST || 'localhost',
       port: parseInt(process.env.DB_PORT || '5432'),
       user: process.env.DB_USER || 'postgres',
       password: process.env.DB_PASSWORD || 'password',
       database: process.env.DB_NAME || 'ecommerce',
       ssl: false,
     },
     verbose: true,
     strict: true,
   });