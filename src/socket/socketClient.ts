import { io, Socket } from 'socket.io-client';
import { ClientGameState, ActionType } from '../types/game.types';
import { LobbyState, GameEventPayload, SOCKET_EVENTS } from '../types/socket.types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// =============================================
// Socket Client Singleton
// =============================================

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupBaseHandlers();
    return this.socket;
  }

  private setupBaseHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Re-authenticate on reconnect
      const token = localStorage.getItem('auth_token');
      if (token) this.authenticate(token);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnect attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after max attempts');
    });

    this.socket.on(SOCKET_EVENTS.PING, () => {
      this.socket?.emit(SOCKET_EVENTS.PONG);
    });
  }

  authenticate(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) reject(new Error('Not connected'));
      this.socket!.emit(SOCKET_EVENTS.AUTH, { token }, (error?: string) => {
        if (error) reject(new Error(error));
        else resolve();
      });
    });
  }

  createRoom(settings?: Record<string, unknown>): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(SOCKET_EVENTS.LOBBY_CREATE, { settings }, (error: string | null, roomCode?: string) => {
        if (error) reject(new Error(error));
        else resolve(roomCode!);
      });
    });
  }

  joinRoom(roomCode: string): Promise<LobbyState> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(SOCKET_EVENTS.LOBBY_JOIN, { roomCode }, (error: string | null, state?: LobbyState) => {
        if (error) reject(new Error(error));
        else resolve(state!);
      });
    });
  }

  leaveRoom(): void {
    this.socket?.emit(SOCKET_EVENTS.LOBBY_LEAVE);
  }

  setReady(isReady: boolean): void {
    this.socket?.emit(SOCKET_EVENTS.LOBBY_READY, { isReady });
  }

  updateSettings(settings: Record<string, unknown>): void {
    this.socket?.emit(SOCKET_EVENTS.LOBBY_SETTINGS_UPDATE, { settings });
  }

  kickPlayer(playerId: string): void {
    this.socket?.emit(SOCKET_EVENTS.LOBBY_KICK, { playerId });
  }

  startGame(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(SOCKET_EVENTS.LOBBY_START, (error: string | null) => {
        if (error) reject(new Error(error));
        else resolve();
      });
    });
  }

  sendAction(
    roomCode: string,
    type: ActionType,
    payload?: Record<string, unknown>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(
        SOCKET_EVENTS.GAME_ACTION,
        { roomCode, type, playerId: '', payload },
        (error: string | null) => {
          if (error) reject(new Error(error));
          else resolve();
        }
      );
    });
  }

  reconnectToGame(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.GAME_RECONNECT, { roomCode });
  }

  on<T>(event: string, handler: (data: T) => void): () => void {
    this.socket?.on(event, handler as (...args: unknown[]) => void);
    return () => this.socket?.off(event, handler as (...args: unknown[]) => void);
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    this.socket?.off(event, handler);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketClient = new SocketClient();
