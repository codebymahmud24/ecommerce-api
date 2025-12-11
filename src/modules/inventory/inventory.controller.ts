import { Controller, Get, Body, Param, UseGuards, Put } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all inventory (Admin only)' })
  async getAllInventory() {
    return this.inventoryService.getAllInventory();
  }

  @Public()
  @Get(':productId/availability')
  @ApiOperation({ summary: 'Check product availability' })
  async checkAvailability(@Param('productId') productId: string) {
    const available = await this.inventoryService.checkAvailability(productId);
    return { productId, available };
  }

  @Put(':productId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update inventory quantity (Admin only)' })
  async updateInventory(
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    await this.inventoryService.updateInventory(productId, body.quantity);
    return { message: 'Inventory updated successfully' };
  }
}
