// src/modules/ai-providers/dto/create-provider.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsUrl,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AiProviderName } from '../../../common/enums/ai-provider-name.enum';

export class CreateProviderDto {
  @ApiProperty({ enum: AiProviderName, example: AiProviderName.OPENAI })
  @IsEnum(AiProviderName)
  name!: AiProviderName;

  @ApiProperty({ example: 'OpenAI GPT-4' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @ApiProperty({ example: 'https://api.openai.com/v1' })
  @IsUrl()
  apiBaseUrl!: string;

  @ApiProperty({ example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  @MinLength(10)
  apiKey!: string;

  @ApiPropertyOptional({
    description: 'Extra config (org ID, custom headers, etc.)',
    example: { organizationId: 'org-xxxx' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
