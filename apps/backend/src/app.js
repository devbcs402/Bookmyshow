import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import config from './config/env.js';
import logger from './config/logger.js';
import corsOptions from './config/cors.js';
import swaggerSpec from './docs/swagger.js';

import requestIdMiddleware from './middlewares/request-id.middleware.js';
import { globalRateLimiter } from './middlewares/rate-limit.middleware.js';
import notFoundHandler from './middlewares/not-found.middleware.js';
import errorHandler from './middlewares/error.middleware.js';

import apiRoutes from './routes/index.js';

export const createApp = () => {
  const app = express();

  // 1. Request ID & Timing Interceptor
  app.use(requestIdMiddleware);

  // 2. HTTP Security Headers Hardening
  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false
    })
  );

  // 3. Cross-Origin Resource Sharing (CORS)
  app.use(cors(corsOptions));

  // 4. JSON Body Parser (Bounded at 10MB to prevent memory exhaustion, with rawBody preservation for webhooks)
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      }
    })
  );

  // 5. URL-Encoded Body Parser
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Cookie Parser for secure HttpOnly cookie management
  app.use(cookieParser());

  // 6. Request Logging & Duration Telemetry
  app.use((req, res, next) => {
    logger.debug({
      msg: 'Incoming Request',
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });

    res.on('finish', () => {
      const durationMs = Date.now() - req.startTime;
      const logPayload = {
        msg: 'Request Finished',
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      };

      if (res.statusCode >= 500) {
        logger.error(logPayload);
      } else if (res.statusCode >= 400) {
        logger.warn(logPayload);
      } else {
        logger.info(logPayload);
      }
    });

    next();
  });

  // 7. Interactive OpenAPI / Swagger Documentation
  app.use(
    `${config.API_PREFIX}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'BookMyShow Clone API Docs',
      customCss: '.swagger-ui .topbar { display: none }'
    })
  );

  // 8. Global Rate Limiter
  app.use(globalRateLimiter);

  // 9. Mount Versioned API Routes (/api/v1)
  app.use(config.API_PREFIX, apiRoutes);

  // 10. 404 Route Not Found Interceptor
  app.use(notFoundHandler);

  // 11. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
