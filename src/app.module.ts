import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { redisStore } from 'cache-manager-redis-yet';
import { CouponsModule } from './modules/coupons/coupons.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/healt.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'redis'),
            port: configService.get('REDIS_PORT', 6379),
          },
          // password: configService.get('REDIS_PASSWORD'), // Uncomment if using password
          ttl: 24 * 60 * 60 * 1000, // 1 day in milliseconds
        }),
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RateLimiterModule.register({
      for: 'Express',
      points: 10,
      duration: 1,
    }),
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
    AdminModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}