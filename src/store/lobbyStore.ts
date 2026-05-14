import { create } from 'zustand';
import { LobbyState, GameEventPayload, SOCKET_EVENTS } from '../types/socket.types';
import { GameSettings } from '../types/game.types';
import { socketClient } from '../socket/socketClient';

interface LobbyStoreState {
  lobby: LobbyState | null;
  isLoading: boolean;
  error: string | null;

  createRoom: (settings?: Partial<GameSettings>) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  kickPlayer: (playerId: string) => void;
  startGame: () => Promise<void>;
  setLobby: (state: LobbyState) => void;
  clearLobby: () => void;
  clearError: () => void;
}

export const useLobbyStore = create<LobbyStoreState>((set, get) => ({
  lobby: null,
  isLoading: false,
  error: null,

  createRoom: async (settings) => {
    set({ isLoading: true, error: null });
    try {
      const roomCode = await socketClient.createRoom(settings as Record<string, unknown>);
      set({ isLoading: false });
      return roomCode;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  joinRoom: async (roomCode) => {
    set({ isLoading: true, error: null });
    try {
      const lobbyState = await socketClient.joinRoom(roomCode);
      set({ lobby: lobbyState, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  leaveRoom: () => {
    socketClient.leaveRoom();
    set({ lobby: null });
  },

  setReady: (isReady) => {
    socketClient.setReady(isReady);
  },

  updateSettings: (settings) => {
    socketClient.updateSettings(settings as Record<string, unknown>);
  },

  kickPlayer: (playerId) => {
    socketClient.kickPlayer(playerId);
  },

  startGame: async () => {
    set({ isLoading: true, error: null });
    try {
      await socketClient.startGame();
      set({ isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setLobby: (state) => set({ lobby: state }),
  clearLobby: () => set({ lobby: null }),
  clearError: () => set({ error: null }),
}));
