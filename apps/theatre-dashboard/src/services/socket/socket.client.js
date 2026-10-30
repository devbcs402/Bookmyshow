import { io } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.activeRooms = new Set();
  }

  connect() {
    const accessToken = useAuthStore.getState().accessToken;
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: {
          token: accessToken
        },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.info('Partner Socket.IO connected:', this.socket.id);
        // Re-join any active rooms after reconnect
        this.activeRooms.forEach((room) => {
          this.socket.emit('join', room);
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('Partner Socket.IO disconnected:', reason);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('Partner Socket.IO connection error:', err.message);
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.activeRooms.clear();
    }
  }

  joinRoom(room) {
    if (!room) return;
    this.activeRooms.add(room);
    if (this.socket?.connected) {
      this.socket.emit('join', room);
    }
  }

  leaveRoom(room) {
    if (!room) return;
    this.activeRooms.delete(room);
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
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

