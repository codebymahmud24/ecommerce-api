import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ValidateCouponDto } from './dto';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsController {
  constructor(private couponsService: CouponsService) { }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all coupons (Admin only)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create coupon (Admin only)' })
  async create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate coupon code' })
  async validate(@Body() validateCouponDto: ValidateCouponDto) {
    return this.couponsService.validate(
      validateCouponDto.code,
      validateCouponDto.userId,
      validateCouponDto.orderTotal,
    );
  }

  // @Post('apply')
  // @ApiOperation({ summary: 'Validate coupon code' })
  // async applyCoupon(@Body() validateCouponDto: ValidateCouponDto) {
  //   return this.couponsService.applyCoupon(
  //     validateCouponDto.code,
  //     validateCouponDto.userId,
  //     validateCouponDto.orderTotal,
  //   );
  // }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate coupon (Admin only)' })
  async deactivate(@Param('id') id: string) {
    return this.couponsService.deactivate(id);
  }


}
