// src/modules/web-search/dto/search-suggestions-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchSuggestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Partial text to get autocomplete suggestions for',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
