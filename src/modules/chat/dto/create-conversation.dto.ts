// src/modules/chat/dto/create-conversation.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({ example: 'Trip planning' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
