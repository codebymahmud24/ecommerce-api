import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimiterModule } from 'nestjs-rate-limiter';
import { HealthController } from './modules/health/health.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrderModule } from './modules/order/order.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [
    // Make ConfigModule global
    ConfigModule.forRoot({
      isGlobal: true, // <-- important
      envFilePath: '.env', // optional, default is .env
    }),
    RateLimiterModule.register({
      for: 'Express',
      points: 10,
      duration: 1,
    }), // 10 requests in 1 second,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrderModule,
    InventoryModule,
    CartModule,
    CategoriesModule
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
