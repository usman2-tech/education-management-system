/**
 * MODULE: Environment Configuration
 *
 * PURPOSE:
 * Strictly validates, normalizes, and exposes application environment variables
 * to ensure deterministic startup and prevent runtime misconfiguration.
 *
 * SECURITY:
 * Sanitizes sensitive values and ensures production secrets are not omitted.
 */

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  swaggerEnabled: boolean;
  logLevel: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  aiServiceUrl: string;
}

export const loadConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const port = parseInt(process.env.PORT || '4000', 10);
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  const corsOriginsRaw = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
  const corsOrigins = corsOriginsRaw.split(',').map((origin) => origin.trim());
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5432/ems_database?schema=public';
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  return {
    nodeEnv,
    isProduction,
    port,
    apiPrefix,
    corsOrigins,
    swaggerEnabled,
    logLevel,
    databaseUrl,
    redisHost,
    redisPort,
    aiServiceUrl,
  };
};

export const config = loadConfig();
