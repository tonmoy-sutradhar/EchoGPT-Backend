// src/config/index.ts
export { default as appConfig } from './app.config';
export { default as databaseConfig } from './database.config';
export { default as jwtConfig } from './jwt.config';
export { default as redisConfig } from './redis.config';
export { default as mailConfig } from './mail.config';
export { default as stripeConfig } from './stripe.config';
export { validateEnv, Environment } from './env.validation';
export type { EnvironmentVariables } from './env.validation';

// export { default as appConfig } from './app.config';
// export { default as databaseConfig } from './database.config';
// export { default as jwtConfig } from './jwt.config';
// export { default as redisConfig } from './redis.config';
// export { validateEnv, Environment } from './env.validation';
// export type { EnvironmentVariables } from './env.validation';
