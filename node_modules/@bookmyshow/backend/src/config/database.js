import mongoose from 'mongoose';
import config from './env.js';
import logger from './logger.js';

const connectionOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
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

export const connectDatabase = async () => {
  try {
    const maskedUri = config.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    logger.info({ msg: 'Connecting to MongoDB...', uri: maskedUri });

    await mongoose.connect(config.MONGODB_URI, connectionOptions);
    return mongoose.connection;
  } catch (error) {
    logger.error({ msg: 'CRITICAL: Failed to connect to MongoDB', error: error.message });
    throw error;
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
