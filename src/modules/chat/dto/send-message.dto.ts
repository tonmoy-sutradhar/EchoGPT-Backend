// src/modules/chat/dto/send-message.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Existing conversation to continue. Omit to start a new one.',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Specific AI provider to use. Omit to use the system default.',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
