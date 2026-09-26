// src/database/seeds/plans.seed.ts
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { dataSourceOptions } from '../data-source';

loadEnv();

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const monthlyPriceId = process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
  const yearlyPriceId = process.env.STRIPE_PRICE_PREMIUM_YEARLY;

  if (monthlyPriceId) {
    await dataSource.query(
      `UPDATE plans SET stripe_price_id = $1 WHERE code = 'premium_monthly'`,
      [monthlyPriceId],
    );
    console.log(`Linked premium_monthly -> ${monthlyPriceId}`);
  } else {
    console.warn('STRIPE_PRICE_PREMIUM_MONTHLY not set in .env, skipping');
  }

  if (yearlyPriceId) {
    await dataSource.query(
      `UPDATE plans SET stripe_price_id = $1 WHERE code = 'premium_yearly'`,
      [yearlyPriceId],
    );
    console.log(`Linked premium_yearly -> ${yearlyPriceId}`);
  } else {
    console.warn('STRIPE_PRICE_PREMIUM_YEARLY not set in .env, skipping');
  }

  await dataSource.destroy();
  console.log('Plan seeding completed');
}

seed().catch((error: unknown) => {
  console.error('Plan seed failed', error);
  process.exit(1);
});
