import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  imageUrl?: string;
}