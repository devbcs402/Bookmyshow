# 01. Backend Foundation & Initial Project Setup

## 1. Overview & Technology Decisions

The core backend application for the **Movie Ticket Booking Platform (BookMyShow Clone)** is constructed as a high-performance **Modular Monolith** using **Node.js (v20+ LTS)** and **Express.js**, adhering strictly to native **ECMAScript Modules (`type: "module"`)**.

### Technology Matrix & Core Dependencies

| Category | Package | Version | Architectural Responsibility |
| :--- | :--- | :---: | :--- |
| **HTTP Engine** | `express` | `^4.21.2` | Core web routing, middleware pipeline, and REST controller handling. |
| **ODM / Storage** | `mongoose` | `^8.10.1` | Document modeling, connection pooling, schema validation, and ACID multi-document transactions. |
| **In-Memory Store** | `ioredis` | `^5.5.0` | High-speed cache, distributed atomic seat locking, and real-time Socket.IO scaling adapter. |
| **Real-time Engine**| `socket.io` | `^4.8.1` | Bi-directional WebSocket communication for live seat lock state fanout. |
| **Validation** | `zod` | `^3.24.2` | Runtime schema parsing and type-safe validation for incoming request payloads and environment variables. |
| **Security Headers** | `helmet` | `^8.0.0` | Comprehensive HTTP header hardening (HSTS, CSP, X-Frame-Options, DNS Prefetch). |
| **CORS** | `cors` | `^2.8.5` | Origin validation with credential support and preflight caching. |
| **Rate Limiter** | `express-rate-limit` | `^7.5.0` | Tiered sliding-window rate limiting protecting against DDoS, brute force, and scalper bots. |
| **Telemetry / Log** | `pino` & `pino-http`| `^9.6.0` | Low-overhead structured JSON logging with automatic PII and credential redaction. |
| **API Contract** | `swagger-ui-express` & `swagger-jsdoc` | `^5.0.1` | Living interactive OpenAPI 3.0 documentation mounted at `/api/v1/docs`. |
| **Testing** | `jest` & `supertest`| `^29.7.0` | Automated unit testing and end-to-end HTTP integration test coverage with native ES modules. |

---

## 2. Package Manifest Configuration

The backend is initialized inside `apps/backend/` with standard scripts:

```json
{
  "name": "@bookmyshow/backend",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --detectOpenHandles --forceExit",
    "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --runInBand --detectOpenHandles --forceExit",
    "lint": "eslint \"src/**/*.js\" \"tests/**/*.js\"",
    "lint:fix": "eslint \"src/**/*.js\" \"tests/**/*.js\" --fix",
    "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\" \"tests/**/*.js\""
  }
}
```

---

## 3. Tooling & Code Quality Standards

1. **ESLint 9 (Flat Config)**: Configured in `eslint.config.js` with ECMAScript `latest`, enforcing strict variable declarations (`prefer-const`, `no-var`), type-safe equality (`eqeqeq: always`), and unused variable warnings with ignored prefix pattern (`^_`).
2. **Prettier Formatting**: Configured in `.prettierrc` with standard 2-space indentation, single quotes, and automated CI check script `npm run format:check`.
3. **Git Hygiene**: Comprehensive `.gitignore` preventing accidental commits of `.env` files, node_modules, log files, or coverage artifacts.

