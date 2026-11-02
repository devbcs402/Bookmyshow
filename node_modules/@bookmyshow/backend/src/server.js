import http from 'node:http';
import config from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { createApp } from './app.js';
import { initSocketServer, closeSocketServer } from './sockets/index.js';

let server = null;
let isShuttingDown = false;

const startServer = async () => {
  try {
    logger.info({
      msg: 'Bootstrapping Movie Ticket Booking Platform API...',
      env: config.NODE_ENV,
      port: config.PORT,
      prefix: config.API_PREFIX
    });

    // 1. Establish persistent database connection (Fail-fast if unavailable in production)
    try {
      await connectDatabase();
    } catch (dbError) {
      if (config.NODE_ENV === 'production') {
        logger.fatal({
          msg: 'Database connection failed in production. Halting startup.',
          error: dbError.message
        });
        process.exit(1);
      } else {
        logger.warn({
          msg: 'MongoDB is unavailable in development mode. Proceeding in degraded state.',
          error: dbError.message
        });
      }
    }

    // 2. Establish in-memory Redis connection
    try {
      await connectRedis();
    } catch (redisError) {
      if (config.NODE_ENV === 'production') {
        logger.fatal({
          msg: 'Redis connection failed in production. Halting startup.',
          error: redisError.message
        });
        process.exit(1);
      } else {
        logger.warn({
          msg: 'Redis is unavailable in development mode. Proceeding in degraded state.',
          error: redisError.message
        });
      }
    }

    // 3. Create Express application
    const app = createApp();

    // 4. Create HTTP server instance
    server = http.createServer(app);

    // 5. Initialize Socket.IO server bound to HTTP server
    initSocketServer(server);

    // 6. Listen for incoming client connections
    server.listen(config.PORT, () => {
      logger.info({
        msg: `🚀 Server successfully started and listening on http://localhost:${config.PORT}`,
        apiPrefix: config.API_PREFIX,
        docsUrl: `http://localhost:${config.PORT}${config.API_PREFIX}/docs`,
        healthUrl: `http://localhost:${config.PORT}${config.API_PREFIX}/health`
      });
    });
  } catch (startupError) {
    logger.fatal({
      msg: 'CRITICAL: Failed to start application server',
      error: startupError.message,
      stack: startupError.stack
    });
    process.exit(1);
  }
};

// Graceful Shutdown Coordinator
const gracefulShutdown = async signal => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.warn({ msg: `Received ${signal}. Initiating graceful shutdown sequence...` });

  // Safety failsafe: Force exit if shutdown hangs beyond 10 seconds
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    // 1. Stop receiving new HTTP requests
    if (server) {
      logger.info('Stopping HTTP server from accepting new connections...');
      await new Promise(resolve => server.close(resolve));
      logger.info('HTTP server closed.');
    }

    // 2. Close active WebSocket connections
    await closeSocketServer();

    // 3. Close Redis connection
    await disconnectRedis();

    // 4. Close MongoDB connection
    await disconnectDatabase();

    logger.info('Graceful shutdown completed successfully. Process exiting.');
    process.exit(0);
  } catch (shutdownError) {
    logger.error({ msg: 'Error occurred during graceful shutdown', error: shutdownError.message });
    process.exit(1);
  }
};

// Process Termination Signal Listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', error => {
  logger.fatal({
    msg: 'UNCAUGHT EXCEPTION! Initiating emergency shutdown...',
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', reason => {
  logger.error({ msg: 'UNHANDLED PROMISE REJECTION', reason });
});

// Bootstrap application
startServer();

export { server, gracefulShutdown };
