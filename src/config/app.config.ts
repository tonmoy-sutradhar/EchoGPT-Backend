// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Backend Template',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  encryptionKey: process.env.ENCRYPTION_KEY,
  serpApiKey: process.env.SERPAPI_KEY,
  searchCacheTtlHours: parseInt(process.env.SEARCH_CACHE_TTL_HOURS || '24', 10),
}));
