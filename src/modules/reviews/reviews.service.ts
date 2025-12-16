import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { reviews, reviewHelpfulness, orders, orderItems } from '../../database/schema';
import * as schema from 'src/database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  private logger = new Logger(ReviewsService.name);
  constructor(
    @Inject("DATABASE") private db: NodePgDatabase<typeof schema>,
  ) { }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    try {
      let isVerifiedPurchase = false;
      
      // Verify purchase (optional but recommended)
      if (createReviewDto.orderId) {
        const [order] = await this.db
          .select()
          .from(orders)
          .where(and(eq(orders.id, createReviewDto.orderId), eq(orders.userId, userId)));

        if (order) {
          // Check if product was in this order
          const [orderItem] = await this.db
            .select()
            .from(orderItems)
            .where(
              and(
                eq(orderItems.orderId, createReviewDto.orderId),
                eq(orderItems.productId, createReviewDto.productId),
              ),
            );

          isVerifiedPurchase = !!orderItem;
        }
      }

      // Check if user already reviewed this product
      const [existingReview] = await this.db
        .select()
        .from(reviews)
        .where(
          and(eq(reviews.productId, createReviewDto.productId), eq(reviews.userId, userId)),
        );

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this product');
      }

      // Create review with explicit field mapping
      const [review] = await this.db
        .insert(reviews)
        .values({
          productId: createReviewDto.productId,
          userId: userId,
          orderId: createReviewDto.orderId || null, // Explicitly set to null if not provided
          rating: Math.round(createReviewDto.rating),
          title: createReviewDto.title,
          comment: createReviewDto.comment,
          isVerifiedPurchase: isVerifiedPurchase,
        })
        .returning();

      return review;
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async update(reviewId: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const [review] = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId));

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    const [updatedReview] = await this.db
      .update(reviews)
      .set({ ...updateReviewDto, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();

    return updatedReview;
  }

  async delete(reviewId: string, userId: string) {
    const [review] = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId));

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    await this.db.delete(reviews).where(eq(reviews.id, reviewId));

    return { message: 'Review deleted successfully' };
  }

  // Mark a review as helpful or unhelpful
  async markHelpful(reviewId: string, userId: string, isHelpful: boolean) {
    // Check if user already marked this review
    const [existing] = await this.db
      .select()
      .from(reviewHelpfulness)
      .where(
        and(eq(reviewHelpfulness.reviewId, reviewId), eq(reviewHelpfulness.userId, userId)),
      );

    if (existing) {
      throw new BadRequestException('You have already marked this review');
    }

    await this.db.insert(reviewHelpfulness).values({
      reviewId,
      userId,
      isHelpful,
    });

    // Update helpful count
    if (isHelpful) {
      await this.db
        .update(reviews)
        .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
        .where(eq(reviews.id, reviewId));
    }

    return { message: 'Thank you for your feedback' };
  }
}