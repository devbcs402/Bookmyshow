import { io } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    const accessToken = useAuthStore.getState().accessToken;
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.info('Super Admin Socket.IO connected:', this.socket.id);
        this.socket.emit('join', 'admin:alerts');
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('Super Admin Socket.IO disconnected:', reason);
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  emit(event, data) {
    if (!this.socket) this.connect();
    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
export default socketService;

