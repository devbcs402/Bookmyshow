# BookMyShow Clone - Core Backend API

Enterprise-grade Modular Monolith REST API powering the Movie Ticket Booking Platform. Built with Node.js 20+, Express, MongoDB, Redis, and Socket.IO.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- MongoDB `>= 7.0` (Local or Docker)
- Redis `>= 7.0` (Local or Docker)

### Installation
```bash
# Navigate to backend directory
cd apps/backend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env
```

### Running Locally
```bash
# Start development server with live reload
npm run dev

# Run in production mode
npm start
```

The server will initialize at `http://localhost:5000` with the API root mounted at `/api/v1`.

---

## 2. Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts server with `nodemon` live-reload. |
| `npm start` | Runs production server with `node src/server.js`. |
| `npm test` | Executes Jest test suites with native ES Modules. |
| `npm run test:watch` | Runs Jest in interactive watch mode. |
| `npm run test:coverage`| Generates code coverage report. |
| `npm run lint` | Runs ESLint validation. |
| `npm run lint:fix` | Fixes linting violations automatically. |
| `npm run format` | Formats all code with Prettier. |
| `npm run format:check`| Checks Prettier compliance. |

---

## 3. Docker Deployment

### Run All Services (Backend + MongoDB + Redis)
```bash
docker-compose up --build -d
```

### View Service Health & Logs
```bash
docker-compose ps
docker-compose logs -f backend
```

---

## 4. Key Endpoints

- **Swagger API Docs**: [`http://localhost:5000/api/v1/docs`](http://localhost:5000/api/v1/docs)
- **Comprehensive Health Check**: [`http://localhost:5000/api/v1/health`](http://localhost:5000/api/v1/health)
- **Liveness Probe (Kubernetes)**: [`http://localhost:5000/api/v1/health/live`](http://localhost:5000/api/v1/health/live)
- **Readiness Probe (Kubernetes)**: [`http://localhost:5000/api/v1/health/ready`](http://localhost:5000/api/v1/health/ready)

