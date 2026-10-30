# 03. Centralized Environment Configuration & Zod Validation

## 1. Overview & Security Principles

Enterprise applications must never run with missing, malformed, or insecure configuration. The platform implements **Fail-Fast Environment Validation** at startup using **Zod**:

- **Startup Halting**: If any mandatory environment variable is absent or violates type/length constraints, the process immediately logs clear diagnostics and exits with code 1.
- **Strict Typing & Coercion**: Numeric fields (`PORT`) are safely coerced to integers; URLs are validated against standard RFC schemas.
- **Zero Secret Exposure**: Configuration is validated in memory and exported as an immutable frozen object (`Object.freeze(result.data)`). Secrets are never logged to console or exposed in error responses.

---

## 2. Environment Schema Specification (`src/config/env.js`)

```javascript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is mandatory'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is mandatory'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long for security'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long for security'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
});
```

---

## 3. Variable Dictionary & Requirements

| Variable Name | Required | Default | Format / Constraints | Description |
| :--- | :---: | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` | Runtime environment mode |
| `PORT` | No | `5000` | Positive integer (e.g. `5000`) | Network TCP port for HTTP listener |
| `API_PREFIX` | No | `/api/v1` | String starting with `/` | Global route prefix for versioned endpoints |
| `CLIENT_URL` | No | `http://localhost:3000`| Valid HTTP/HTTPS URL | Allowed client frontend origin for CORS |
| `MONGODB_URI`| **Yes** | - | Valid MongoDB connection string | MongoDB cluster replica set URI |
| `REDIS_URL` | **Yes** | - | Valid Redis connection string | Redis cache and distributed lock store URI |
| `JWT_ACCESS_SECRET` | **Yes** | - | String $\ge 32$ characters | Symmetric key for signing short-lived access JWTs |
| `JWT_REFRESH_SECRET`| **Yes** | - | String $\ge 32$ characters | Symmetric key for signing rotating refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | String duration (e.g. `15m`) | Access token lifespan |
| `JWT_REFRESH_EXPIRES_IN`| No | `7d` | String duration (e.g. `7d`) | Refresh token lifespan |
| `LOG_LEVEL` | No | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` | Minimum log output verbosity |

---

## 4. Fail-Fast Diagnostic Output Example

If an administrator starts the application with a missing database URI or insecure secret:
```
CRITICAL: Environment configuration validation failed:
  - MONGODB_URI: MONGODB_URI is mandatory
  - JWT_ACCESS_SECRET: JWT_ACCESS_SECRET must be at least 32 characters long for security
Process exiting with code 1.
```
This protects production deployments from launching in a broken or compromised state.
