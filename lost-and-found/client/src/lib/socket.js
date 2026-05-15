import { io } from 'socket.io-client';
import { SERVER_BASE } from './api';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (!socket) {
    socket = io(SERVER_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnect:', reason);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
