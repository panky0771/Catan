import { ClientGameState, GameAction, GameSettings, PlayerColor } from './game.types';

// =============================================
// Socket Event Names
// =============================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',

  // Auth
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Lobby
  LOBBY_CREATE: 'lobby:create',
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_UPDATE: 'lobby:update',
  LOBBY_READY: 'lobby:ready',
  LOBBY_START: 'lobby:start',
  LOBBY_SETTINGS_UPDATE: 'lobby:settings_update',
  LOBBY_KICK: 'lobby:kick',
  LOBBY_MESSAGE: 'lobby:message',

  // Game
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_ACTION_ERROR: 'game:action_error',
  GAME_EVENT: 'game:event',
  GAME_ENDED: 'game:ended',
  GAME_RECONNECT: 'game:reconnect',

  // System
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
} as const;

// =============================================
// Lobby Types
// =============================================

export interface LobbyPlayer {
  id: string;
  username: string;
  color: PlayerColor | null;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
  avatarUrl?: string;
}

export interface LobbyState {
  roomCode: string;
  hostId: string;
  players: LobbyPlayer[];
  settings: GameSettings;
  status: 'waiting' | 'starting' | 'active';
  maxPlayers: number;
}

// =============================================
// Socket Event Payloads
// =============================================

export interface AuthPayload {
  token: string;
}

export interface CreateLobbyPayload {
  settings?: Partial<GameSettings>;
}

export interface JoinLobbyPayload {
  roomCode: string;
}

export interface UpdateSettingsPayload {
  settings: Partial<GameSettings>;
}

export interface ReadyPayload {
  isReady: boolean;
}

export interface GameActionPayload extends GameAction {
  roomCode: string;
}

export interface GameEventPayload {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  playerId?: string;
  playerName?: string;
  timestamp: number;
}

// =============================================
// Server → Client Events
// =============================================

export interface ServerToClientEvents {
  'auth:success': (data: { userId: string; username: string }) => void;
  'auth:error': (data: { message: string }) => void;
  'lobby:update': (state: LobbyState) => void;
  'lobby:message': (data: { from: string; message: string; timestamp: number }) => void;
  'game:state': (state: ClientGameState) => void;
  'game:action_error': (data: { message: string; actionType: string }) => void;
  'game:event': (event: GameEventPayload) => void;
  'game:ended': (data: { winner: string; finalState: ClientGameState }) => void;
  ping: () => void;
  error: (data: { message: string }) => void;
}

// =============================================
// Client → Server Events
// =============================================

export interface ClientToServerEvents {
  auth: (payload: AuthPayload, callback?: (error?: string) => void) => void;
  'lobby:create': (
    payload: CreateLobbyPayload,
    callback: (error: string | null, roomCode?: string) => void
  ) => void;
  'lobby:join': (
    payload: JoinLobbyPayload,
    callback: (error: string | null, state?: LobbyState) => void
  ) => void;
  'lobby:leave': () => void;
  'lobby:ready': (payload: ReadyPayload) => void;
  'lobby:start': (callback: (error: string | null) => void) => void;
  'lobby:settings_update': (payload: UpdateSettingsPayload) => void;
  'lobby:kick': (payload: { playerId: string }) => void;
  'game:action': (
    payload: GameActionPayload,
    callback?: (error: string | null) => void
  ) => void;
  'game:reconnect': (payload: { roomCode: string }) => void;
  pong: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  currentRoom: string | null;
}
