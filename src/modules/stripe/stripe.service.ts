// src/modules/stripe/stripe.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  public readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Stripe(
      this.configService.getOrThrow<string>('stripe.secretKey'),
    );
    this.webhookSecret = this.configService.getOrThrow<string>(
      'stripe.webhookSecret',
    );
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }
}
