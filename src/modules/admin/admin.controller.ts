import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getDashboardStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/sales')
  @ApiOperation({ summary: 'Get sales analytics (Admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSalesAnalytics(@Query('days') days?: number) {
    return this.adminService.getSalesAnalytics(days);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts (Admin only)' })
  async getLowStockAlerts() {
    return this.adminService.getLowStockProducts();
  }

  @Get('insights/customers')
  @ApiOperation({ summary: 'Get customer insights (Admin only)' })
  async getCustomerInsights() {
    return this.adminService.getCustomerInsights();
  }
}