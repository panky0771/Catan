import { create } from 'zustand';
import { ClientGameState, ActionType, ResourceCards, ResourceType, DevCardType } from '../types/game.types';
import { GameEventPayload } from '../types/socket.types';
import { socketClient } from '../socket/socketClient';

interface BuildMode {
  type: 'settlement' | 'city' | 'road' | 'robber' | null;
  isSetup?: boolean;
  setupVertexId?: string;
  freeRoads?: number;
}

interface GameStoreState {
  gameState: ClientGameState | null;
  events: GameEventPayload[];
  buildMode: BuildMode;
  selectedVertex: string | null;
  selectedEdge: string | null;
  isMyTurn: boolean;
  isLoading: boolean;
  actionError: string | null;

  setGameState: (state: ClientGameState) => void;
  addEvent: (event: GameEventPayload) => void;
  setBuildMode: (mode: BuildMode) => void;
  clearBuildMode: () => void;
  setSelectedVertex: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  clearError: () => void;

  // Actions
  rollDice: () => Promise<void>;
  buildRoad: (edgeId: string) => Promise<void>;
  buildSettlement: (vertexId: string) => Promise<void>;
  buildCity: (vertexId: string) => Promise<void>;
  buyDevCard: () => Promise<void>;
  playKnight: () => Promise<void>;
  playRoadBuilding: () => Promise<void>;
  playYearOfPlenty: (resources: [ResourceType, ResourceType]) => Promise<void>;
  playMonopoly: (resource: ResourceType) => Promise<void>;
  moveRobber: (hexId: string) => Promise<void>;
  stealResource: (targetPlayerId: string) => Promise<void>;
  discardResources: (resources: ResourceCards) => Promise<void>;
  offerTrade: (toPlayerId: string | null, offer: ResourceCards, request: ResourceCards) => Promise<void>;
  acceptTrade: () => Promise<void>;
  rejectTrade: () => Promise<void>;
  cancelTrade: () => Promise<void>;
  maritimeTrade: (give: ResourceType, receive: ResourceType, amount: number) => Promise<void>;
  endTurn: () => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  events: [],
  buildMode: { type: null },
  selectedVertex: null,
  selectedEdge: null,
  isMyTurn: false,
  isLoading: false,
  actionError: null,

  setGameState: (state) => {
    const userId = state.myPlayer?.id;
    const isMyTurn = userId
      ? state.players[state.currentPlayerIndex]?.id === userId
      : false;
    set({ gameState: state, isMyTurn });
  },

  addEvent: (event) =>
    set((s) => ({
      events: [...s.events.slice(-49), event], // keep last 50
    })),

  setBuildMode: (mode) => set({ buildMode: mode }),
  clearBuildMode: () => set({ buildMode: { type: null }, selectedVertex: null, selectedEdge: null }),
  setSelectedVertex: (id) => set({ selectedVertex: id }),
  setSelectedEdge: (id) => set({ selectedEdge: id }),
  clearError: () => set({ actionError: null }),

  // =============================================
  // Game Action helpers
  // =============================================

  rollDice: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    set({ isLoading: true, actionError: null });
    try {
      await socketClient.sendAction(roomCode, 'ROLL_DICE');
    } catch (err) {
      set({ actionError: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  buildRoad: async (edgeId) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    set({ isLoading: true, actionError: null });
    try {
      await socketClient.sendAction(roomCode, 'BUILD_ROAD', { edgeId });
      get().clearBuildMode();
    } catch (err) {
      set({ actionError: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  buildSettlement: async (vertexId) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    set({ isLoading: true, actionError: null });
    try {
      await socketClient.sendAction(roomCode, 'BUILD_SETTLEMENT', { vertexId });
      get().clearBuildMode();
    } catch (err) {
      set({ actionError: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  buildCity: async (vertexId) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    set({ isLoading: true, actionError: null });
    try {
      await socketClient.sendAction(roomCode, 'BUILD_CITY', { vertexId });
      get().clearBuildMode();
    } catch (err) {
      set({ actionError: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  buyDevCard: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'BUY_DEV_CARD');
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  playKnight: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'PLAY_KNIGHT');
      set({ buildMode: { type: 'robber' } });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  playRoadBuilding: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'PLAY_ROAD_BUILDING');
      set({ buildMode: { type: 'road', freeRoads: 2 } });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  playYearOfPlenty: async (resources) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'PLAY_YEAR_OF_PLENTY', { resources });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  playMonopoly: async (resource) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'PLAY_MONOPOLY', { resource });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  moveRobber: async (hexId) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'MOVE_ROBBER', { hexId });
      get().clearBuildMode();
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  stealResource: async (targetPlayerId) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'STEAL_RESOURCE', { targetPlayerId });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  discardResources: async (resources) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'DISCARD_RESOURCES', { resources });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  offerTrade: async (toPlayerId, offer, request) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'OFFER_TRADE', { toPlayerId, offer, request });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  acceptTrade: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'ACCEPT_TRADE');
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  rejectTrade: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'REJECT_TRADE');
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  cancelTrade: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'CANCEL_TRADE');
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  maritimeTrade: async (give, receive, amount) => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'MARITIME_TRADE', { give, receive, amount });
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },

  endTurn: async () => {
    const roomCode = get().gameState?.roomCode;
    if (!roomCode) return;
    try {
      await socketClient.sendAction(roomCode, 'END_TURN');
      get().clearBuildMode();
    } catch (err) {
      set({ actionError: (err as Error).message });
    }
  },
}));
