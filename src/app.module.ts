import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimiterModule } from 'nestjs-rate-limiter';
import { HealthController } from './modules/health/health.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CouponsModule } from './modules/coupons/coupons.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 24 * 60 * 60 * 1000, // for 1 days
      max: 20, // number of items
    }),
    // Make ConfigModule global
    ConfigModule.forRoot({
      isGlobal: true, // <-- important
      envFilePath: '.env', // optional, default is .env
    }),
    RateLimiterModule.register({
      for: 'Express',
      points: 10, // 10 requests 
      duration: 1, // per second (1s)
    }), // 10 requests in 1 second,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    CategoriesModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
