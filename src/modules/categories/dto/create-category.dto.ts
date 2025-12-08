import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'electronics',
    description: 'URL-friendly slug (lowercase, hyphens only)',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lowercase with hyphens only (e.g., electronics, smart-home)',
  })
  slug: string;

  @ApiProperty({
    example: 'Electronic devices and accessories',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
