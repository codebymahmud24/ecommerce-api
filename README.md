# E-commerce API with Advanced Inventory Management

## Project Structure

``` bash
ecommerce-api/
├── package.json                          # ✅ Root directory - dependencies and scripts
├── package-lock.json                     # Auto-generated
├── tsconfig.json                         # TypeScript configuration
├── tsconfig.build.json                   # Build-specific TS config
├── nest-cli.json                         # NestJS CLI configuration
├── .env                                  # ✅ Environment variables (NEVER commit!)
├── .env.example                          # Template for .env file
├── .gitignore                            # Git ignore rules
├── .eslintrc.js                          # ESLint configuration
├── .prettierrc                           # Prettier configuration
├── drizzle.config.ts                     # ✅ Drizzle ORM configuration (ROOT)
├── Dockerfile                            # Docker image definition
├── docker-compose.yml                    # Multi-container setup
├── README.md                             # Project documentation
│
├── src/
│   ├── main.ts                           # Application entry point
│   ├── app.module.ts                     # Root application module
│   │
│   ├── config/                           # Configuration files
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── elasticsearch.config.ts
│   │
│   ├── common/                           # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── enums/
│   │       ├── role.enum.ts
│   │       └── order-status.enum.ts
│   │
│   ├── database/
│   │   ├── database.module.ts            # Database connection provider
│   │   ├── schema/                       # ✅ Database schema definitions
│   │   │   ├── users.schema.ts
│   │   │   ├── products.schema.ts
│   │   │   ├── inventory.schema.ts
│   │   │   ├── orders.schema.ts
│   │   │   ├── coupons.schema.ts
│   │   │   ├── reviews.schema.ts
│   │   │   └── index.ts                  # Export all schemas
│   │   └── migrations/                   # ✅ Auto-generated migration files
│   │       ├── 0000_initial.sql
│   │       ├── 0001_add_reviews.sql
│   │       └── meta/
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/
│       │   │   ├── register.dto.ts
│       │   │   ├── login.dto.ts
│       │   │   └── index.ts
│       │   └── strategies/
│       │       └── jwt.strategy.ts
│       │
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   └── users.service.ts
│       │
│       ├── products/
│       │   ├── products.module.ts
│       │   ├── products.controller.ts
│       │   ├── products.service.ts
│       │   └── dto/
│       │       ├── create-product.dto.ts
│       │       ├── update-product.dto.ts
│       │       ├── search-products.dto.ts
│       │       └── index.ts
│       │
│       ├── inventory/
│       │   ├── inventory.module.ts
│       │   ├── inventory.controller.ts
│       │   └── inventory.service.ts
│       │
│       ├── cart/
│       │   ├── cart.module.ts
│       │   ├── cart.controller.ts
│       │   ├── cart.service.ts
│       │   └── dto/
│       │       ├── add-to-cart.dto.ts
│       │       ├── update-cart-item.dto.ts
│       │       └── index.ts
│       │
│       ├── orders/
│       │   ├── orders.module.ts
│       │   ├── orders.controller.ts
│       │   ├── orders.service.ts
│       │   └── dto/
│       │       ├── create-order.dto.ts
│       │       ├── update-order-status.dto.ts
│       │       └── index.ts
│       │
│       ├── payments/
│       │   ├── payments.module.ts
│       │   ├── payments.controller.ts
│       │   └── payments.service.ts
│       │
│       ├── coupons/
│       │   ├── coupons.module.ts
│       │   ├── coupons.controller.ts
│       │   ├── coupons.service.ts
│       │   └── dto/
│       │       ├── create-coupon.dto.ts
│       │       ├── validate-coupon.dto.ts
│       │       └── index.ts
│       │
│       ├── reviews/
│       │   ├── reviews.module.ts
│       │   ├── reviews.controller.ts
│       │   ├── reviews.service.ts
│       │   └── dto/
│       │       ├── create-review.dto.ts
│       │       ├── update-review.dto.ts
│       │       ├── mark-helpful.dto.ts
│       │       └── index.ts
│       │
│       └── notifications/
│           ├── notifications.module.ts
│           └── notifications.service.ts
│
├── scripts/                              # Utility scripts
│   └── seed.ts                           # ✅ Database seeding script
│
│
└── dist/                                 # Compiled output (auto-generated)
    └── ...
```

KEY FILES LOCATIONS:
====================
📦 package.json          → ROOT directory
⚙️  drizzle.config.ts     → ROOT directory
🗄️  Database schemas      → src/database/schema/*.schema.ts
🔄 Migrations            → src/database/migrations/ (auto-generated)
🌱 Seed script           → scripts/seed.ts
🔐 Environment vars      → .env (ROOT directory)
🐳 Docker config         → docker-compose.yml (ROOT)
📝 Main entry           → src/main.ts


INSTALLATION COMMANDS:
======================
# 1. Create project
npm i -g @nestjs/cli
nest new ecommerce-api
cd ecommerce-api

# 2. Install all dependencies
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install drizzle-orm pg
npm install @nestjs/cache-manager cache-manager cache-manager-redis-store
npm install stripe
npm install @nestjs/throttler helmet
npm install nodemailer
npm install class-validator class-transformer
npm install @nestjs/swagger
npm install @nestjs/config
npm install dotenv

# 3. Install dev dependencies
npm install -D @types/passport-jwt @types/bcrypt @types/nodemailer
npm install -D @types/pg @types/cache-manager
npm install -D drizzle-kit
npm install -D ts-node

# 4. Setup environment file
cp .env.example .env
# Edit .env with your values

# 5. Start infrastructure
docker-compose up -d postgres redis

# 6. Generate and run migrations
npm run db:generate
npm run db:push

# 7. Seed database
npm run db:seed

# 8. Start development server
npm run start:dev


QUICK REFERENCE:
================
- Config files:        ROOT directory
- Source code:         src/
- Database schemas:    src/database/schema/
- Migrations:          src/database/migrations/
- Business logic:      src/modules/
- Scripts:             scripts/
- Tests:               test/


### 2. Environment Variables (.env)

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=ecommerce

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Backend Test Command
stripeURL= stripe listen --forward-to localhost:3000/api/v1/payments/webhook
SUCCESS = stripe trigger payment_intent.succeeded
Failed = stripe trigger payment_intent.payment_failed

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@ecommerce.com

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001

### 5. Drizzle Configuration (drizzle.config.ts)

```typescript
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/database/schema/*.schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 6. Running the Project

```bash
# Start infrastructure
docker-compose up -d postgres redis elasticsearch

# Run migrations
npm run db:generate
npm run db:migrate

# Seed initial data (admin user, sample products)
npm run db:seed

# Start development server
npm run start:dev

# Access Swagger documentation
# http://localhost:3000/api/docs
```

## Key Features Implementation

### 1. **Authentication & RBAC**
- JWT-based authentication
- Role-based access control (Admin, Customer, Guest)
- Permission-based guards
- Refresh token mechanism

### 2. **Inventory Management**
- Real-time stock tracking
- Reservation system with TTL
- Race condition handling using database locks
- Low stock alerts

### 3. **Shopping Cart**
- Redis-based caching for performance
- Automatic cart expiration
- Cart-to-order conversion
- Guest cart support

### 4. **Order Processing**
- State machine pattern (Pending → Processing → Shipped → Delivered)
- Distributed transaction handling
- Idempotency for payment processing
- Order cancellation with inventory rollback

### 5. **Payment Integration**
- Stripe payment gateway
- Webhook handling for async events
- Payment retry mechanism
- Refund processing

### 6. **Coupon System**
- Percentage and fixed amount discounts
- Usage limits per user
- Expiry date validation
- Minimum order value requirements

### 8. **Reviews & Ratings**
- Verified purchase validation
- Rating aggregation
- Helpful vote system
- Admin moderation

### 9. **Security & Performance**
- Rate limiting per endpoint
- Helmet for security headers
- Request validation with class-validator
- Database query optimization
- Response caching strategies

### 10. **Notifications**
- Email notifications for orders
- Template-based emails
- Notification preferences

## API Endpoints Overview

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products (Admin)
PUT    /api/v1/products/:id (Admin)
DELETE /api/v1/products/:id (Admin)
GET    /api/v1/products/search

GET    /api/v1/cart
POST   /api/v1/cart/items
PUT    /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
DELETE /api/v1/cart

GET    /api/v1/orders
GET    /api/v1/orders/:id
POST   /api/v1/orders
PUT    /api/v1/orders/:id/cancel
GET    /api/v1/orders/:id/track

POST   /api/v1/payments/create-intent
POST   /api/v1/payments/webhook

GET    /api/v1/coupons (Admin)
POST   /api/v1/coupons (Admin)
POST   /api/v1/coupons/validate

GET    /api/v1/reviews/product/:id
POST   /api/v1/reviews
PUT    /api/v1/reviews/:id
DELETE /api/v1/reviews/:id

GET    /api/v1/inventory (Admin)
PUT    /api/v1/inventory/:id (Admin)
```

## Next Steps

I'll now provide the complete implementation files for each module. Would you like me to start with:
1. Database schema definitions
2. Core modules (Auth, Products, Orders)
3. Advanced features (Inventory reservation, Payment processing)

Let me know which part you'd like to see first!