# Multi-stage production Dockerfile for BookMyShow Clone Backend API
# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run container as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

USER nodejs

EXPOSE 5000

# Native health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health/live || exit 1

CMD ["node", "src/server.js"]
