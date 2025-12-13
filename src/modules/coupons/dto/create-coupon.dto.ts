import { IsString, IsEnum, IsNumber, IsOptional, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
}

export class CreateCouponDto {
    @ApiProperty()
    @IsString()
    code: string;

    @ApiProperty({ enum: DiscountType })
    @IsEnum(DiscountType)
    discountType: DiscountType;

    @ApiProperty()
    @IsNumber()
    discountValue: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    minOrderValue?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    maxUsage?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    maxUsagePerUser?: number;

    @ApiProperty({ required: false })
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    expiresAt?: Date;
}