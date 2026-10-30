# Production Configuration Management & Environment Architecture
**Document Reference**: `docs/production/02-production-configuration.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Backend Architect, DevOps Engineer, Security Engineer  
**Status**: APPROVED  

---

## 1. Overview & Core Philosophy

Production configuration management in the BookMyShow platform adheres to **The Twelve-Factor App** methodology (Factor III: Config). All configurations that vary between environments (Development, Staging, Production, Test) are strictly separated from application code and managed through centralized environment variables.

### Key Tenets
1. **Zero Secret Hardcoding**: Secrets (private keys, database credentials, API tokens) are injected at container runtime via secure secret managers (e.g. AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets).
2. **Fail-Fast Validation**: The Node.js process validates all required variables upon application startup using Zod schemas. If any mandatory variable is missing or malformed, the process halts immediately with exit code 1.
3. **Immutable Config Object**: Once parsed, the configuration object is deeply frozen (`Object.freeze`) to prevent runtime mutations.
4. **Environment Separation**: Strict isolation between `development`, `test`, `staging`, and `production`.

---

## 2. Environment Schema & Validation Rules

Configuration validation is executed in [`apps/backend/src/config/env.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/config/env.js) using Zod.

```javascript
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default(''),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is mandatory'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is mandatory'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  TRUST_PROXY: z.number().default(0),
  COOKIE_SECURE: z.boolean().default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().default(''),

  ENABLE_SWAGGER: z.boolean().default(true),
  METRICS_ENABLED: z.boolean().default(true),
  INTERNAL_METRICS_TOKEN: z.string().default('bms_internal_metrics_secret_token_12345'),

  SEAT_LOCK_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
  MAX_SEATS_PER_LOCK: z.coerce.number().int().min(1).max(10).default(10),
  MAX_LOCK_RENEWALS: z.coerce.number().int().min(0).max(5).default(2),

  BOOKING_PAYMENT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  DEFAULT_CONVENIENCE_FEE: z.coerce.number().min(0).default(30.0),
  DEFAULT_TAX_PERCENT: z.coerce.number().min(0).default(18.0),
  BOOKING_CANCELLATION_CUTOFF_HOURS: z.coerce.number().min(0).default(2),

  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  RAZORPAY_CURRENCY: z.string().default('INR'),
  PAYMENT_ORDER_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(120).default(15)
});
```

---

## 3. Production Hardening Settings

### 3.1 Reverse Proxy & Client IP Resolution (`TRUST_PROXY`)
In production environments where the API runs behind Cloudflare, AWS Application Load Balancer (ALB), or an Nginx ingress controller, `req.ip` must resolve the original client address from the `X-Forwarded-For` header rather than the proxy pod's internal IP.
- In Development: `TRUST_PROXY=0` (direct socket connection).
- In Production: `TRUST_PROXY=1` (trusts 1 hop upstream).
- Configured in [`apps/backend/src/app.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/app.js):
  ```javascript
  if (config.TRUST_PROXY) {
    app.set('trust proxy', config.TRUST_PROXY);
  }
  ```

### 3.2 Secure Cookie Policy (`COOKIE_SECURE`, `COOKIE_SAME_SITE`)
Authentication refresh tokens and session tokens stored in client cookies are hardened against XSS and CSRF:
- `HttpOnly`: Always `true` (prohibits JavaScript document.cookie access).
- `Secure`: `true` in production (enforces HTTPS transmission).
- `SameSite`: `lax` (prevents cross-site request forgery while allowing top-level navigation).

### 3.3 Dynamic Multi-Origin CORS Whitelist
In production, multiple web applications interact with the API (Customer Web App, Theatre Partner Portal, Super Admin Console).
Configured in [`apps/backend/src/config/cors.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/config/cors.js):
```javascript
const parseAllowedOrigins = () => {
  const origins = new Set([config.CLIENT_URL]);
  if (config.ALLOWED_ORIGINS) {
    config.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean)
      .forEach(o => origins.add(o));
  }
  return Array.from(origins);
};
```

### 3.4 OpenAPI / Swagger Production Toggling (`ENABLE_SWAGGER`)
In development, interactive documentation is served at `/api/v1/docs`. In high-security production deployments, public discovery of OpenAPI specifications can be disabled by setting `ENABLE_SWAGGER=false`.

---

## 4. Environment Comparison Matrix

| Configuration Variable | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | `production` |
| `PORT` | `5000` | `5000` | `5000` (or `PORT` provided by PaaS/K8s) |
| `LOG_LEVEL` | `debug` (pretty-print) | `info` (JSON) | `info` (JSON) |
| `TRUST_PROXY` | `0` | `1` | `1` |
| `COOKIE_SECURE` | `false` | `true` | `true` |
| `ENABLE_SWAGGER` | `true` | `true` | `false` (or VPN/IP-restricted) |
| `REDIS_URL` | `redis://localhost:6379` | `rediss://...` (TLS) | `rediss://...` (Managed Sentinel / Cluster TLS) |
| `MONGODB_URI` | `mongodb://localhost:27017/...` | `mongodb+srv://...` (Replica) | `mongodb+srv://...` (Multi-AZ Replica Atlas) |
| `EMAIL_PROVIDER` | `mock` | `resend` / `smtp` | `resend` / `smtp` |
| `SMS_PROVIDER` | `mock` | `twilio` / `fast2sms` | `twilio` / `fast2sms` |
| `WHATSAPP_PROVIDER` | `mock` | `whatsapp_cloud` | `whatsapp_cloud` |

---

## 5. Secret Rotation Procedures

1. **JWT Secret Keys**:
   - Rotate keys without dropping active sessions by supporting dual keys in verification verification middleware during maintenance windows.
2. **Razorpay Webhook Secrets**:
   - Update webhook endpoint secret on the Razorpay dashboard, then redeploy updated container task.
3. **Database Credentials**:
   - Handled via MongoDB Atlas IAM user roles or automated rotation via AWS Secrets Manager.

