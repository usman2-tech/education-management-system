/**
 * MODULE: Environment Configuration - Unit Tests
 *
 * PURPOSE:
 * Verifies that the configuration loader enforces strict production safety rules (SEC-002 Hardening).
 * Ensures that startup fails fast if production secrets are omitted or using dev fallbacks.
 *
 * DEPENDENCIES:
 * env.config.ts
 */

import { loadConfig } from './env.config';

describe('Environment Configuration Loader (Production Security)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load successfully in development mode with defaults', () => {
    process.env.NODE_ENV = 'development';
    const cfg = loadConfig();

    expect(cfg.isProduction).toBe(false);
    expect(cfg.port).toBe(4000);
    expect(cfg.jwtSecret).toBeDefined();
    expect(cfg.internalServiceSecret).toBe('dev_internal_secret_key_change_in_production');
  });

  it('should throw critical configuration error in production if DATABASE_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'a_very_secure_jwt_secret_key_for_production_testing';
    process.env.JWT_REFRESH_SECRET = 'a_very_secure_refresh_secret_key_for_production_testing';
    process.env.INTERNAL_SERVICE_SECRET = 'a_very_secure_internal_secret_key_32chars';

    expect(() => loadConfig()).toThrow(/Missing or insecure production environment variables/);
  });

  it('should throw critical configuration error in production if JWT_SECRET uses fallback', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.JWT_SECRET = 'super_secret_jwt_access_key_ems_institutional_2026'; // dev fallback
    process.env.JWT_REFRESH_SECRET = 'a_very_secure_refresh_secret_key_for_production_testing';
    process.env.INTERNAL_SERVICE_SECRET = 'a_very_secure_internal_secret_key_32chars';

    expect(() => loadConfig()).toThrow(/JWT_SECRET \(must be configured and must not use development fallback\)/);
  });

  it('should throw critical configuration error in production if INTERNAL_SERVICE_SECRET uses fallback', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.JWT_SECRET = 'a_very_secure_jwt_secret_key_for_production_testing';
    process.env.JWT_REFRESH_SECRET = 'a_very_secure_refresh_secret_key_for_production_testing';
    process.env.INTERNAL_SERVICE_SECRET = 'dev_internal_secret_key_change_in_production'; // dev fallback

    expect(() => loadConfig()).toThrow(/INTERNAL_SERVICE_SECRET \(must be configured with at least 16 characters/);
  });

  it('should throw critical configuration error in production if INTERNAL_SERVICE_SECRET is too short (< 16 chars)', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.JWT_SECRET = 'a_very_secure_jwt_secret_key_for_production_testing';
    process.env.JWT_REFRESH_SECRET = 'a_very_secure_refresh_secret_key_for_production_testing';
    process.env.INTERNAL_SERVICE_SECRET = 'short_sec'; // < 16 chars

    expect(() => loadConfig()).toThrow(/INTERNAL_SERVICE_SECRET \(must be configured with at least 16 characters/);
  });

  it('should succeed in production when all secrets are securely supplied', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.JWT_SECRET = 'a_very_secure_jwt_secret_key_for_production_testing';
    process.env.JWT_REFRESH_SECRET = 'a_very_secure_refresh_secret_key_for_production_testing';
    process.env.INTERNAL_SERVICE_SECRET = 'a_very_secure_internal_secret_key_32chars';

    const cfg = loadConfig();
    expect(cfg.isProduction).toBe(true);
    expect(cfg.swaggerEnabled).toBe(false); // default disabled in prod
    expect(cfg.enableDevAuthTokens).toBe(false); // strictly false in prod
    expect(cfg.internalServiceSecret).toBe('a_very_secure_internal_secret_key_32chars');
  });
});
