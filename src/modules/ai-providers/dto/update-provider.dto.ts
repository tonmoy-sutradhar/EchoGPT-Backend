// src/modules/ai-providers/dto/update-provider.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsObject,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateProviderDto {
  @ApiPropertyOptional({ example: 'OpenAI GPT-4 Turbo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://api.openai.com/v1' })
  @IsOptional()
  @IsUrl()
  apiBaseUrl?: string;

  @ApiPropertyOptional({
    description: 'Provide only if you want to rotate the API key',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
