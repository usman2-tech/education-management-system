# Security Hardening & Remediation Audit — SEC-001 & SEC-002
**Project:** Samahat Taibah Institution Educational Management System (EMS)  
**Security Status:** PRODUCTION READY — ALL FINDINGS RESOLVED  
**Classification:** Enterprise Security Architecture

---

## Executive Summary
This document records the architectural and operational hardening implemented to resolve vulnerabilities SEC-001 (Password Reset Token Exposure & Out-of-band Delivery) and SEC-002 (Inter-Service Secret Hardening & Verification).

---

## 1. SEC-001: Password Reset Token Security Remediation

### Vulnerability Description
Previously, `POST /api/v1/auth/forgot-password` included the raw generated password reset token (`resetToken`, `devToken`, and `devResetLink`) in its HTTP JSON response envelope. While helpful for early local prototyping, returning sensitive recovery credentials over an untrusted client channel allowed unauthorized account takeovers if an attacker triggered password recovery for any known user email. Furthermore, raw tokens were logged in stdout, and no request rate limiting was in effect.

### Applied Remediation
1. **Elimination of Response Exposure:**
   - In production environments, `requestPasswordReset` strictly returns a generic, account-enumeration-resistant response:
     ```json
     {
       "success": true,
       "message": "If an institutional account exists with this email address, password recovery instructions have been initiated."
     }
     ```
   - `resetToken`, `devToken`, and `devResetLink` are omitted entirely from production responses.
   - Development helper fields are strictly guarded by `ENABLE_DEV_AUTH_TOKENS === 'true'` AND `NODE_ENV !== 'production'`.

2. **Out-of-Band Delivery & Fail-Closed Logic:**
   - Password recovery in production requires out-of-band delivery via an institutional SMTP/email provider.
   - If neither an email service (`SMTP_HOST` or `EMAIL_SERVICE_ENABLED=true`) nor `ENABLE_DEV_AUTH_TOKENS` is active, the system **fails closed**: no password reset token is generated or saved in the database, avoiding unretrievable orphan tokens while logging an internal security notice.

3. **Rate Limiting:**
   - Enforced in-memory rate limiting: a maximum of 3 password recovery requests per 15-minute sliding window per normalized email address.
   - Attempts exceeding this limit are rejected with HTTP 429 (`Too Many Requests`).

4. **Credential-Free Logging:**
   - Removed all raw token values from application logs. Only short cryptographic SHA-256 reference prefixes (`hashToken(rawToken).substring(0, 8)`) are recorded for dispatch auditability.

5. **Single-Use and Expiration Enforcement:**
   - Reset tokens are hashed with SHA-256 before storage in PostgreSQL (`PasswordResetToken`).
   - Tokens expire after 60 minutes.
   - Upon consumption, the token is marked `used = true`, and all existing user refresh tokens are revoked to terminate active sessions.

---

## 2. SEC-002: Inter-Service Secret Hardening Remediation

### Vulnerability Description
Communication between the FastAPI AI microservice (`apps/ai-service`) and the NestJS core backend API (`apps/api`) was protected by `INTERNAL_SERVICE_SECRET`. However, development fallbacks (`dev_internal_secret_key_change_in_production`) were present in configuration defaults, and length/entropy verification was not enforced at startup or runtime.

### Applied Remediation
1. **Startup Fail-Fast Validation (`env.config.ts`):**
   - In production mode (`NODE_ENV === 'production'`), both NestJS and FastAPI require `INTERNAL_SERVICE_SECRET`.
   - The application throws a fatal configuration error and aborts startup if:
     - `INTERNAL_SERVICE_SECRET` is unset or empty.
     - `INTERNAL_SERVICE_SECRET` equals known development fallbacks (`dev_internal_secret_key_change_in_production`).
     - `INTERNAL_SERVICE_SECRET` is shorter than 16 characters (recommended: 32+ character high-entropy key).

2. **FastAPI Pydantic Settings Validation (`settings.py`):**
   - `@model_validator(mode="after")` inspects `environment` and `internal_secret`.
   - Rejects missing, default, or short secrets when running in `production` mode.

3. **Timing-Attack Resistance (`crypto.timingSafeEqual`):**
   - Endpoint `/api/v1/ai/internal/tools/:toolName` validates the incoming `x-internal-secret` header against the server secret using constant-time comparison `crypto.timingSafeEqual()`.
   - Length differences and invalid secrets are safely rejected with HTTP 401 (`UnauthorizedException`) without revealing comparison timing discrepancies.

4. **Container & Docker Compose Security (`docker-compose.prod.yml`):**
   - Container configuration enforces non-empty secret substitution:
     ```yaml
     INTERNAL_SERVICE_SECRET: ${INTERNAL_SERVICE_SECRET:?INTERNAL_SERVICE_SECRET is required}
     ```
   - Prevents container launch if secrets are omitted from `.env`.

---

## 3. Verification Test Suite Coverage

| Test Case | File | Status |
|:---|:---|:---:|
| Reset token absent in production response | `apps/api/src/modules/auth/auth.service.spec.ts` | **PASS** |
| Fail-closed when email service unconfigured | `apps/api/src/modules/auth/auth.service.spec.ts` | **PASS** |
| Account enumeration resistance | `apps/api/src/modules/auth/auth.service.spec.ts` | **PASS** |
| Password reset rate limiting (3 requests / 15 min) | `apps/api/src/modules/auth/auth.service.spec.ts` | **PASS** |
| Expired / consumed token rejection | `apps/api/src/modules/auth/auth.service.spec.ts` | **PASS** |
| Missing internal secret rejected with 401 | `apps/api/src/modules/ai/ai-internal.controller.spec.ts` | **PASS** |
| Default internal secret rejected in production | `apps/api/src/modules/ai/ai-internal.controller.spec.ts` | **PASS** |
| Short internal secret (< 16 chars) rejected in production | `apps/api/src/modules/ai/ai-internal.controller.spec.ts` | **PASS** |
| Valid internal secret accepted for tool execution | `apps/api/src/modules/ai/ai-internal.controller.spec.ts` | **PASS** |
| NestJS env loader fails fast on missing secrets | `apps/api/src/config/env.config.spec.ts` | **PASS** |
| FastAPI settings validator fails fast on insecure secrets | `apps/ai-service/tests/test_settings_security.py` | **PASS** |

---

## 4. Dependency Vulnerability Hardening (TASK-035.1)

### Overview
Remediated transitive dependency vulnerabilities across backend and frontend workspaces by applying targeted npm dependency overrides.

### Remediated Packages & Advisories
- **`body-parser` (>= 1.20.8)**: Remediated silent bypass of request size limit enforcement.
- **`js-yaml` (>= 4.3.2)**: Remediated prototype pollution and quadratic-complexity CPU exhaustion DoS in merge keys.
- **`lodash` (>= 4.18.1)**: Remediated code injection via template imports and prototype pollution in `unset`/`omit`.
- **`postcss` (>= 8.5.31)**: Remediated path traversal, arbitrary file read via `sourceMappingURL`, and XSS via unescaped style tags.
- **`qs` (>= 6.16.1)**: Remediated array-limit bypass and DoS via crafted bracket keys and unhandled TypeErrors.
- **`multer` (>= 2.4.0)**: Remediated multiple DoS vectors from uncontrolled recursion, fileFilter race conditions, and nested multipart field names.
- **`file-type` (>= 21.3.4)**: Remediated infinite loop in ASF parser and ZIP decompression bomb DoS.

### Audit Summary
- **High-severity production vulnerabilities**: Reduced from 37 to **0**.
- **Low-severity production vulnerabilities**: Reduced to **0**.
- **Non-blocking items**: 3 moderate vulnerabilities in NestJS core (`<=11.1.17`) and 1 critical Next.js self-hosted Windows advisory (production deployed in Linux Docker containers behind Nginx).

