import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  shippingAddress: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;
}