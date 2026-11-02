import mongoose from 'mongoose';
import config from './env.js';
import logger from './logger.js';

const connectionOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  autoIndex: config.NODE_ENV !== 'production'
};

// Mongoose lifecycle listeners
mongoose.connection.on('connected', () => {
  logger.info({
    msg: 'MongoDB connection established successfully',
    host: mongoose.connection.host,
    db: mongoose.connection.name
  });
});

mongoose.connection.on('error', err => {
  logger.error({ msg: 'MongoDB connection error', error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost / disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

export const connectDatabase = async (maxAttempts = 3, retryDelayMs = 1500) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const maskedUri = config.MONGODB_URI.replace(/:([^@]+)@/, ':****@');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info({ msg: `Connecting to MongoDB (attempt ${attempt}/${maxAttempts})...`, uri: maskedUri });
      await mongoose.connect(config.MONGODB_URI, connectionOptions);
      return mongoose.connection;
    } catch (error) {
      logger.error({
        msg: `Failed to connect to MongoDB (attempt ${attempt}/${maxAttempts})`,
        error: error.message
      });

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        logger.fatal({ msg: 'CRITICAL: Exhausted all MongoDB connection attempts', error: error.message });
        throw error;
      }
    }
  }
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed.');
  }
};

export const getDatabaseHealth = async () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const status = states[readyState] || 'unknown';
  const isHealthy = readyState === 1;

  let latencyMs = null;
  if (isHealthy && mongoose.connection.db) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      latencyMs = Date.now() - start;
    } catch (_err) {
      latencyMs = -1;
    }
  }

  return {
    status,
    isHealthy,
    latencyMs
  };
};

export default {
  connectDatabase,
  disconnectDatabase,
  getDatabaseHealth
};
