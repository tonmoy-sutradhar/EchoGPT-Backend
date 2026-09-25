export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export interface EnvironmentVariables {
  NODE_ENV: Environment;
  APP_NAME: string;
  APP_PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_SSL: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  LOG_LEVEL: string;
}

function requireString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid environment variable: ${key}`);
  }
  return value;
}

function requireNumber(config: Record<string, unknown>, key: string): number {
  const raw = config[key];
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Missing or invalid numeric environment variable: ${key}`);
  }
  return value;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
  return fallback;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnv = (config.NODE_ENV as string) || Environment.Development;
  if (!Object.values(Environment).includes(nodeEnv as Environment)) {
    throw new Error(
      `NODE_ENV must be one of: ${Object.values(Environment).join(', ')}`,
    );
  }

  return {
    NODE_ENV: nodeEnv as Environment,
    APP_NAME: (config.APP_NAME as string) || 'Backend Template',
    APP_PORT: requireNumber(config, 'APP_PORT'),
    API_PREFIX: (config.API_PREFIX as string) || 'api',
    CORS_ORIGINS: (config.CORS_ORIGINS as string) || 'http://localhost:3000',
    THROTTLE_TTL: Number(config.THROTTLE_TTL ?? 60),
    THROTTLE_LIMIT: Number(config.THROTTLE_LIMIT ?? 100),
    DATABASE_HOST: requireString(config, 'DATABASE_HOST'),
    DATABASE_PORT: requireNumber(config, 'DATABASE_PORT'),
    DATABASE_USERNAME: requireString(config, 'DATABASE_USERNAME'),
    DATABASE_PASSWORD: requireString(config, 'DATABASE_PASSWORD'),
    DATABASE_NAME: requireString(config, 'DATABASE_NAME'),
    DATABASE_SSL: toBoolean(config.DATABASE_SSL, false),
    JWT_ACCESS_SECRET: requireString(config, 'JWT_ACCESS_SECRET'),
    JWT_ACCESS_EXPIRES_IN: (config.JWT_ACCESS_EXPIRES_IN as string) || '15m',
    JWT_REFRESH_SECRET: requireString(config, 'JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRES_IN: (config.JWT_REFRESH_EXPIRES_IN as string) || '7d',
    REDIS_HOST: requireString(config, 'REDIS_HOST'),
    REDIS_PORT: requireNumber(config, 'REDIS_PORT'),
    REDIS_PASSWORD: (config.REDIS_PASSWORD as string) || '',
    REDIS_DB: Number(config.REDIS_DB ?? 0),
    LOG_LEVEL: (config.LOG_LEVEL as string) || 'info',
  };
}
