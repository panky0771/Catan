import { ClientGameState, GameSettings, PlayerColor } from './game.types';

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

export interface GameEventPayload {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  playerId?: string;
  playerName?: string;
  timestamp: number;
}

export const SOCKET_EVENTS = {
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  LOBBY_CREATE: 'lobby:create',
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_UPDATE: 'lobby:update',
  LOBBY_READY: 'lobby:ready',
  LOBBY_START: 'lobby:start',
  LOBBY_SETTINGS_UPDATE: 'lobby:settings_update',
  LOBBY_KICK: 'lobby:kick',
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_ACTION_ERROR: 'game:action_error',
  GAME_EVENT: 'game:event',
  GAME_ENDED: 'game:ended',
  GAME_RECONNECT: 'game:reconnect',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
} as const;
