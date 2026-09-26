// src/database/seeds/admin.seed.ts — dataSourceOptions reuse koro
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../data-source';

loadEnv();

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  // ... rest of the seed logic, but now use Role lookup instead of Role enum
  // (ei script-o update lagbe notun schema onujayi, porokhon age migration-i age thik koro)

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
