// src/modules/subscriptions/dto/checkout-session.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    example: 'premium_monthly',
    enum: ['premium_monthly', 'premium_yearly'],
  })
  @IsString()
  @IsIn(['premium_monthly', 'premium_yearly'])
  planCode!: string;
}
