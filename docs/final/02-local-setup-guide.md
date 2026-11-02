# Local Development & Setup Guide
## BookMyShow Multi-Theatre Ticket Booking Platform

This guide provides step-by-step instructions for getting the complete BookMyShow platform up and running on a local development machine.

---

## 1. Prerequisites

Before installing, ensure the following software is installed on your workstation:

- **Node.js**: `v20.0.0` or higher (`node -v`)
- **npm**: `v10.0.0` or higher (`npm -v`)
- **MongoDB**: `v7.0` (Local service on port `27017` or via Docker)
- **Redis**: `v7.2` (Local service on port `6379` or via Docker)
- **Docker & Docker Compose** (Optional, if using containerized database/redis services)

---

## 2. Fast-Track Setup (3 Easy Steps)

### Step 1: Install All Dependencies
Run from the repository root:
```bash
npm run install:all
```
This installs dependencies across `apps/backend`, `apps/customer-frontend`, `apps/theatre-dashboard`, and `apps/admin-dashboard`.

### Step 2: Ensure MongoDB & Redis Are Running
If you have local MongoDB and Redis installed:
- Ensure MongoDB is listening on `mongodb://localhost:27017`
- Ensure Redis is listening on `redis://localhost:6379`

Alternatively, start them via Docker Compose:
```bash
docker compose up -d mongodb redis
```

### Step 3: Seed Sample Demo Data
Bootstrap the platform with test accounts, cities, approved theatres, screens, layouts, published movies, and active shows:
```bash
npm run seed:dev
```

### Step 4: Start All Applications With One Command
```bash
npm run dev
```

---

## 3. Application Access Points

Once `npm run dev` is running, access the individual applications in your web browser:

| Application | URL | Default Test Account | Role |
|---|---|---|---|
| **Customer Web App** | `http://localhost:5173` | `customer@gmail.com` / `Customer@Secure2026!` | `CUSTOMER` |
| **Theatre Partner Portal** | `http://localhost:5174` | `owner@pvr.com` / `Owner@Secure2026!` | `THEATRE_OWNER` |
| **Super Admin Console** | `http://localhost:5175` | `admin@bookmyshow.clone` / `SuperAdmin@Secure2026!` | `SUPER_ADMIN` |
| **Backend REST API** | `http://localhost:5000/api/v1` | — | API Gateway |
| **Swagger Interactive Docs** | `http://localhost:5000/api-docs` | — | OpenAPI Specification |
| **System Health Probe** | `http://localhost:5000/api/v1/health` | — | Operational Diagnostics |

---

## 4. Running Individual Applications

If you prefer running specific applications in dedicated terminal tabs:

```bash
# Terminal 1: Backend API Gateway
npm run dev:backend

# Terminal 2: Customer Website
npm run dev:customer

# Terminal 3: Theatre Partner Dashboard
npm run dev:theatre

# Terminal 4: Super Admin Dashboard
npm run dev:admin
```

