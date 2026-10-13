import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 400,
      reconnectionDelayMax: 3000,
    });
  }
  return socket;
}

/** Promise wrapper over socket.io acks so callers can `await` an action. */
export function emit<T = unknown>(event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => reject(new Error('The server did not respond')), 8000);
    s.emit(event, payload ?? {}, (response: T & { error?: string }) => {
      clearTimeout(timeout);
      if (response && typeof response === 'object' && 'error' in response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}
