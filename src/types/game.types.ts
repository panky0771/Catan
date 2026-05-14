// Mirrors server/src/types/game.types.ts (client-side version)

export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
export type TileType = ResourceType | 'desert';
export type BuildingType = 'settlement' | 'city';
export type DevCardType = 'knight' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly' | 'victoryPoint';
export type PlayerColor = 'red' | 'blue' | 'green' | 'orange' | 'white';
export type GamePhase = 'waiting' | 'setup' | 'playing' | 'ended';
export type TurnPhase =
  | 'setup_settlement'
  | 'setup_road'
  | 'pre_roll'
  | 'post_roll'
  | 'move_robber'
  | 'discard'
  | 'ended';
export type PortType = ResourceType | 'any';

export interface ResourceCards {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

export const EMPTY_RESOURCES: ResourceCards = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

export const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: '#8B5E3C',
  brick: '#C1440E',
  sheep: '#7CB518',
  wheat: '#F5C518',
  ore: '#708090',
};

export const RESOURCE_ICONS: Record<ResourceType | 'desert', string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
  desert: '🏜️',
};

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  white: '#F1F5F9',
};

export const TILE_COLORS: Record<TileType, string> = {
  wood: '#5a7a3a',
  brick: '#b85c2a',
  sheep: '#7aba3a',
  wheat: '#c8a830',
  ore: '#6a7a8a',
  desert: '#c8a870',
};

export interface Building {
  type: BuildingType;
  playerId: string;
  color: PlayerColor;
}

export interface Road {
  playerId: string;
  color: PlayerColor;
}

export interface Port {
  type: PortType;
  vertexIds: [string, string];
  hexId: string;
  direction: number;
}

export interface Hex {
  id: string;
  q: number;
  r: number;
  tileType: TileType;
  numberToken: number | null;
  hasRobber: boolean;
}

export interface Vertex {
  id: string;
  adjacentHexIds: string[];
  adjacentEdgeIds: string[];
  adjacentVertexIds: string[];
  building: Building | null;
  port: Port | null;
}

export interface Edge {
  id: string;
  adjacentHexIds: string[];
  vertexIds: [string, string];
  adjacentEdgeIds: string[];
  road: Road | null;
}

export interface Board {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
}

export interface DevCard {
  type: DevCardType;
  purchasedTurn: number;
  played: boolean;
}

export interface PublicPlayer {
  id: string;
  socketId: string;
  username: string;
  color: PlayerColor;
  resources: null;
  devCards: null;
  resourceCount: number;
  devCardCount: number;
  knightsPlayed: number;
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
  victoryPoints: number;
  publicVictoryPoints: number;
  isConnected: boolean;
  isReady: boolean;
  hasPlayedDevCardThisTurn: boolean;
}

export interface MyPlayer extends Omit<PublicPlayer, 'resources' | 'devCards' | 'victoryPoints'> {
  resources: ResourceCards;
  devCards: DevCard[];
  victoryPoints: number;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string | null;
  offer: ResourceCards;
  request: ResourceCards;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  createdAt: number;
}

export interface GameSettings {
  maxPlayers: number;
  victoryPointsToWin: number;
  turnTimerSeconds: number;
  allowBots: boolean;
  enableFogOfWar: boolean;
}

export interface ClientGameState {
  gameId: string;
  roomCode: string;
  phase: GamePhase;
  turnPhase: TurnPhase;
  settings: GameSettings;
  board: Board;
  players: PublicPlayer[];
  myPlayer?: MyPlayer;
  currentPlayerIndex: number;
  setupRound: 1 | 2;
  setupDirection: 'forward' | 'backward';
  setupSettlementPlaced: boolean;
  lastDiceRoll: [number, number] | null;
  diceRolledThisTurn: boolean;
  robberHexId: string;
  mustDiscardPlayers: string[];
  discardAmounts: Record<string, number>;
  devCardDeckSize: number;
  longestRoadHolder: string | null;
  longestRoadLength: number;
  largestArmyHolder: string | null;
  largestArmySize: number;
  activeTrade: TradeOffer | null;
  winner: string | null;
  turnNumber: number;
  startedAt: number;
}

export type ActionType =
  | 'ROLL_DICE'
  | 'BUILD_ROAD'
  | 'BUILD_SETTLEMENT'
  | 'BUILD_CITY'
  | 'BUY_DEV_CARD'
  | 'PLAY_KNIGHT'
  | 'PLAY_ROAD_BUILDING'
  | 'PLAY_YEAR_OF_PLENTY'
  | 'PLAY_MONOPOLY'
  | 'MOVE_ROBBER'
  | 'STEAL_RESOURCE'
  | 'DISCARD_RESOURCES'
  | 'OFFER_TRADE'
  | 'ACCEPT_TRADE'
  | 'REJECT_TRADE'
  | 'CANCEL_TRADE'
  | 'MARITIME_TRADE'
  | 'END_TURN';

export const BUILDING_COSTS: Record<string, ResourceCards> = {
  road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  devCard: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
};
