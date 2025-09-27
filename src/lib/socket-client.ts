import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  connect(): Socket {
    if (!this.socket && !this.isConnecting) {
      this.isConnecting = true;
      this.socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnecting = false;
      });
      
      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnecting = false;
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnecting = false;
      });
    }
    return this.socket!;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event listeners
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Event emitters
  emit(event: string, ...args: unknown[]): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }
}

export const socketService = new SocketService();
