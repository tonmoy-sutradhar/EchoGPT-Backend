// src/modules/auth/dto/verify-email.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Raw verification token from the email link' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
