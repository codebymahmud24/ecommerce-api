import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAllByUser(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancel(@Request() req, @Param('id') id: string) {
    await this.ordersService.cancelOrder(id, req.user.id);
    return { message: 'Order cancelled successfully' };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    await this.ordersService.updateStatus(
      id,
      updateOrderStatusDto.status,
      updateOrderStatusDto.note,
    );
    return { message: 'Order status updated successfully' };
  }
}