import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkHelpfulDto {
  @ApiProperty()
  @IsBoolean()
  isHelpful: boolean;
}
