import { Server } from 'socket.io';
import config from '../config/env.js';
import logger from '../config/logger.js';
import SocketEvents from './events.js';

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

  // Socket Authentication Middleware Hook (Ready for JWT handshake verification in Part 4)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    // For development/initialization phase, allow unauthenticated connection with guest scope
    socket.data.user = token ? { role: 'AUTHENTICATED' } : { role: 'GUEST' };
    next();
  });

  io.on(SocketEvents.CONNECTION, socket => {
    logger.info({
      msg: 'Socket client connected',
      socketId: socket.id,
      role: socket.data.user?.role
    });

    socket.on(SocketEvents.DISCONNECT, reason => {
      logger.info({ msg: 'Socket client disconnected', socketId: socket.id, reason });
    });

    socket.on(SocketEvents.ERROR, error => {
      logger.error({ msg: 'Socket client error', socketId: socket.id, error: error.message });
    });
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
