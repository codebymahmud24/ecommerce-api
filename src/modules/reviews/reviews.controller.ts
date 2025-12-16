import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, MarkHelpfulDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review' })
  async create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete review' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.reviewsService.delete(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/helpful')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markHelpful(
    @Request() req,
    @Param('id') id: string,
    @Body() markHelpfulDto: MarkHelpfulDto,
  ) {
    return this.reviewsService.markHelpful(id, req.user.id, markHelpfulDto.isHelpful);
  }
}