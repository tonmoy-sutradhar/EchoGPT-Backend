// src/modules/web-search/dto/search-query.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ example: 'latest AI developments 2026' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  query!: string;

  @ApiPropertyOptional({
    description:
      'AI provider to use for summarizing results. Omit to use the default.',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
