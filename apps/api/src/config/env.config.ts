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
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  internalServiceSecret: string;
  enableDevAuthTokens: boolean;
  emailServiceEnabled: boolean;
}

const DEFAULT_JWT_SECRET = 'super_secret_jwt_access_key_ems_institutional_2026';
const DEFAULT_JWT_REFRESH_SECRET = 'super_secret_jwt_refresh_key_ems_institutional_2026';
const DEFAULT_INTERNAL_SERVICE_SECRET = 'dev_internal_secret_key_change_in_production';

export const loadConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const port = parseInt(process.env.PORT || '4000', 10);
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  const corsOriginsRaw = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
  const corsOrigins = corsOriginsRaw.split(',').map((origin) => origin.trim());

  // In production, Swagger is disabled by default unless SWAGGER_ENABLED=true is explicitly set
  const swaggerEnabled = isProduction
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.SWAGGER_ENABLED !== 'false';

  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5433/ems_database?schema=public';
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH_SECRET;
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const internalServiceSecret =
    process.env.INTERNAL_SERVICE_SECRET || DEFAULT_INTERNAL_SERVICE_SECRET;

  // Development helper tokens are strictly disabled in production
  const enableDevAuthTokens =
    process.env.ENABLE_DEV_AUTH_TOKENS === 'true' && !isProduction;

  // Out-of-band email delivery check
  const emailServiceEnabled =
    process.env.EMAIL_SERVICE_ENABLED === 'true' || Boolean(process.env.SMTP_HOST);

  // Production strict validations
  if (isProduction) {
    const missing: string[] = [];
    if (!process.env.DATABASE_URL) {
      missing.push('DATABASE_URL');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
      missing.push('JWT_SECRET (must be configured and must not use development fallback)');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH_SECRET) {
      missing.push('JWT_REFRESH_SECRET (must be configured and must not use development fallback)');
    }
    if (
      !process.env.INTERNAL_SERVICE_SECRET ||
      process.env.INTERNAL_SERVICE_SECRET === DEFAULT_INTERNAL_SERVICE_SECRET ||
      process.env.INTERNAL_SERVICE_SECRET.trim().length < 16
    ) {
      missing.push(
        'INTERNAL_SERVICE_SECRET (must be configured with at least 16 characters and must not use development fallback)',
      );
    }

    if (missing.length > 0) {
      throw new Error(
        `[CRITICAL CONFIGURATION ERROR] Missing or insecure production environment variables:\n` +
          missing.map((item) => `  - ${item}`).join('\n') +
          `\nPlease provide secure production credentials in your environment before starting in production mode.`,
      );
    }
  }

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
    jwtSecret,
    jwtExpiresIn,
    jwtRefreshSecret,
    jwtRefreshExpiresIn,
    internalServiceSecret,
    enableDevAuthTokens,
    emailServiceEnabled,
  };
};

export const config = loadConfig();
