import { Server } from 'socket.io';
import config from '../config/env.js';
import logger from '../config/logger.js';
import SocketEvents from './events.js';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';
import {
  registerSeatLockSocketHandlers,
  initRedisPubSub,
  closeRedisPubSub
} from '../modules/seat-locks/seat-lock.socket.js';

let io = null;

export const initSocketServer = httpServer => {
  if (io) {
    return io;
  }

  const allowedOrigins = [
    config.CLIENT_URL,
    ...(config.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ]
      : [])
  ];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const token = rawToken?.replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload?.sub) {
          socket.data.user = {
            id: payload.sub,
            role: payload.role,
            email: payload.email,
            isAuthenticated: true
          };
          return next();
        }
      } catch (_err) {
        // Fall back to guest scope on invalid or expired token
      }
    }

    socket.data.user = { role: 'GUEST', isAuthenticated: false };
    return next();
  });

  io.on(SocketEvents.CONNECTION, socket => {
    logger.info({
      msg: 'Socket client connected',
      socketId: socket.id,
      role: socket.data.user?.role,
      isAuthenticated: socket.data.user?.isAuthenticated
    });

    // Register Seat Lock real-time room listeners
    registerSeatLockSocketHandlers(socket, io);

    socket.on(SocketEvents.DISCONNECT, reason => {
      logger.info({ msg: 'Socket client disconnected', socketId: socket.id, reason });
    });

    socket.on(SocketEvents.ERROR, error => {
      logger.error({ msg: 'Socket client error', socketId: socket.id, error: error.message });
    });
  });

  // Initialize cross-instance Redis Pub/Sub adapter
  initRedisPubSub(io).catch(err => {
    logger.warn({ msg: 'Redis Pub/Sub adapter initialization deferred', error: err.message });
  });

  logger.info('Socket.IO event server initialized successfully');
  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error(
      'Socket.IO server has not been initialized. Call initSocketServer(httpServer) first.'
    );
  }
  return io;
};

export const closeSocketServer = async () => {
  await closeRedisPubSub();
  if (io) {
    logger.info('Closing Socket.IO connections...');
    await new Promise(resolve => io.close(resolve));
    io = null;
    logger.info('Socket.IO server closed.');
  }
};

export default {
  initSocketServer,
  getSocketIO,
  closeSocketServer
};
