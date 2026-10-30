import { io } from 'socket.io-client';
import { STORAGE_KEYS, SOCKET_EVENTS } from '../../constants';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentShowId = null;
    this.activeListeners = new Map();
  }

  /**
   * Initializes or returns existing Socket.IO connection
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      // If we previously had a show room joined before disconnect, re-join it
      if (this.currentShowId) {
        this.joinShowRoom(this.currentShowId);
      }
    });

    this.socket.on(SOCKET_EVENTS.ERROR, error => {
      console.warn('[Socket.IO] Error:', error);
    });

    return this.socket;
  }

  /**
   * Updates authorization token on existing or reconnecting socket
   */
  updateAuth(token) {
    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.connected) {
        this.socket.disconnect().connect();
      }
    }
  }

  /**
   * Subscribes to real-time seat status updates for a show
   * @param {string} showId
   */
  joinShowRoom(showId) {
    if (!showId) return;
    this.connect();
    this.currentShowId = showId;
    this.socket.emit(SOCKET_EVENTS.JOIN_SHOW_ROOM, { showId });
  }

  /**
   * Leaves show room on component unmount
   * @param {string} showId
   */
  leaveShowRoom(showId) {
    if (!this.socket || !showId) return;
    this.socket.emit(SOCKET_EVENTS.LEAVE_SHOW_ROOM, { showId });
    if (this.currentShowId === showId) {
      this.currentShowId = null;
    }
  }

  /**
   * Registers a callback for a specific socket event
   */
  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.on(event, callback);
  }

  /**
   * Unregisters a callback
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Disconnects socket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentShowId = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;

