import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
   imports: [OrdersModule, ProductsModule, InventoryModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
