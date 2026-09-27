// src/modules/chat/dto/rename-conversation.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RenameConversationDto {
  @ApiProperty({ example: 'Trip planning notes' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
}
