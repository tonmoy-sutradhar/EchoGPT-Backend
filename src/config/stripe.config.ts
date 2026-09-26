// src/config/stripe.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  pricePremiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  pricePremiumYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  successUrl:
    process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
    'http://localhost:5173/billing/success',
  cancelUrl:
    process.env.STRIPE_CHECKOUT_CANCEL_URL ||
    'http://localhost:5173/billing/cancel',
  portalReturnUrl:
    process.env.STRIPE_PORTAL_RETURN_URL || 'http://localhost:5173/billing',
}));
