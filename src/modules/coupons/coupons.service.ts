import { varchar } from 'drizzle-orm/pg-core';
import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { eq, and, gte, or, isNull, sql } from 'drizzle-orm';
import { coupons, couponUsage } from '../../database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/database';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { couponResponse, ValidateCouponDto } from './dto';

export type validateCouponType = {
  valid?: boolean;
  discountAmount?: number;
  couponId?: string;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @Inject("DATABASE") private db: NodePgDatabase<typeof schema>,
  ) { }


  /**
   * ------------------ Create New Coupon -----------------
   * @param createCouponDto 
   * @returns couponResponse 
   */
  async create(createCouponDto: CreateCouponDto): Promise<couponResponse> {
    try {
      // if already exists with same code
      const [existingCoupon] = await this.db.select().from(coupons).where(eq(coupons.code, createCouponDto.code));
      if (existingCoupon) {
        throw new BadRequestException('Coupon with this code already exists');
      }
      const [coupon] = await this.db
        .insert(coupons)
        .values({
          ...createCouponDto, discountValue: createCouponDto.discountValue.toFixed(2), // or String(...)
          minOrderValue: createCouponDto.minOrderValue?.toFixed(2),
          expiresAt: createCouponDto.expiresAt ? new Date(createCouponDto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
        })
        .returning();

      return coupon as couponResponse;
    } catch (error) {
      this.logger.error('Error creating coupon', error.message);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
    }
  }

  /**
   * ------------------ Get All Coupons -----------------
   */
  async findAll(): Promise<any> {
    return await this.db.select().from(coupons);
  }

  /**
   * ------------------ Validate Coupon -----------------
   * @param code 
   * @param userId 
   * @param orderTotal
   * @returns promise<validateCouponType>
   */
  async validate(code: string, userId: string, orderTotal: number): Promise<validateCouponType> {
    try {
      const [coupon] = await this.db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, code), eq(coupons.isActive, true)));

      if (!coupon) {
        throw new BadRequestException('Invalid coupon code');
      }

      // Check expiration
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw new BadRequestException('Coupon has expired');
      }

      // Check min order value
      if (coupon.minOrderValue && orderTotal < parseFloat(coupon.minOrderValue)) {
        throw new BadRequestException(
          `Minimum order value of ${coupon.minOrderValue} required`,
        );
      }

      // Check max usage
      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      // Check per-user usage
      const userUsageCount = await this.db
        .select()
        .from(couponUsage)
        .where(and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId)));

      if (userUsageCount.length >= coupon.maxUsagePerUser) {
        throw new BadRequestException('You have already used this coupon');
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (orderTotal * parseFloat(coupon.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(coupon.discountValue);
      }

      return {
        valid: true,
        discountAmount,
        couponId: coupon.id,
      };
    } catch (error) {
      this.logger.error('Error validating coupon', error.message);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
    }
  }

  /**
   * ------------------ Apply Coupon -----------------
   * @param code
   * @param userId
   * @param orderTotal
   * @returns promise<validateCouponType>
   */
  async applyCoupon(code: string, userId: string, orderTotal: number): Promise<validateCouponType> {
    try {
      // Validate coupon
      const validation = await this.validate(code, userId, orderTotal);

      // Increment usage count
      await this.db
        .update(coupons)
        .set({ usageCount: sql`${coupons.usageCount} + 1` })
        .where(eq(coupons.code, code));
      return validation;
    } catch (error) {
      this.logger.error('Error applying coupon', error.message);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
    }
  }

  /**
   * ------------------ Record Coupon Usage -----------------
   * @param couponId
   * @param userId
   * @param orderId
   * @returns promise<void>
   */
  async recordUsage(couponId: string, userId: string, orderId: string): Promise<void> {
    try {
      await this.db.insert(couponUsage).values({
        couponId,
        userId,
        orderId,
      });
    } catch (error) {
      this.logger.error('Error recording coupon usage', error.message);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
    }
  }


  /**
   * ------------------ Deactivate Coupon -----------------
   * @param couponId
   */
  async deactivate(couponId: string) : Promise<{ message: string }> {
    await this.db
      .update(coupons)
      .set({ isActive: false })
      .where(eq(coupons.id, couponId));

    return { message: 'Coupon deactivated successfully' };
  }
}