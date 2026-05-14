// =============================================
// Core Catan Game Types
// =============================================

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

export const EMPTY_RESOURCES: ResourceCards = {
  wood: 0,
  brick: 0,
  sheep: 0,
  wheat: 0,
  ore: 0,
};

export const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const BUILDING_COSTS: Record<string, ResourceCards> = {
  road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  devCard: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
};

export const DEV_CARD_DISTRIBUTION: DevCardType[] = [
  ...Array(14).fill('knight'),
  ...Array(5).fill('victoryPoint'),
  ...Array(2).fill('roadBuilding'),
  ...Array(2).fill('yearOfPlenty'),
  ...Array(2).fill('monopoly'),
];

export const TILE_DISTRIBUTION: TileType[] = [
  ...Array(4).fill('wood'),
  ...Array(3).fill('brick'),
  ...Array(4).fill('sheep'),
  ...Array(4).fill('wheat'),
  ...Array(3).fill('ore'),
  'desert',
];

export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// =============================================
// Board Types
// =============================================

export interface HexCoord {
  q: number;
  r: number;
}

export interface Hex {
  id: string;
  q: number;
  r: number;
  tileType: TileType;
  numberToken: number | null;
  hasRobber: boolean;
}

export interface Port {
  type: PortType;
  vertexIds: [string, string]; // two vertex IDs forming the port
  hexId: string;
  direction: number; // 0-5, facing direction
}

export interface Building {
  type: BuildingType;
  playerId: string;
  color: PlayerColor;
}

export interface Road {
  playerId: string;
  color: PlayerColor;
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

// =============================================
// Player Types
// =============================================

export interface DevCard {
  type: DevCardType;
  purchasedTurn: number; // can only play after the turn purchased
  played: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  color: PlayerColor;
  resources: ResourceCards;
  devCards: DevCard[];
  // Public info visible to all
  resourceCount: number;
  devCardCount: number;
  knightsPlayed: number;
  // Pieces remaining
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
  // VP
  victoryPoints: number; // total (includes hidden VP cards)
  publicVictoryPoints: number; // visible to others
  // State
  isConnected: boolean;
  isReady: boolean;
  hasPlayedDevCardThisTurn: boolean;
}

// =============================================
// Trade Types
// =============================================

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string | null; // null = offer to all
  offer: ResourceCards; // what the initiator gives
  request: ResourceCards; // what the initiator wants
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  createdAt: number;
}

// =============================================
// Game Settings
// =============================================

export interface GameSettings {
  maxPlayers: number;
  victoryPointsToWin: number;
  turnTimerSeconds: number; // 0 = no timer
  allowBots: boolean;
  enableFogOfWar: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 4,
  victoryPointsToWin: 10,
  turnTimerSeconds: 120,
  allowBots: false,
  enableFogOfWar: false,
};

// =============================================
// Game State
// =============================================

export interface GameState {
  gameId: string;
  roomCode: string;
  phase: GamePhase;
  turnPhase: TurnPhase;
  settings: GameSettings;

  // Board
  board: Board;

  // Players
  players: Player[];
  currentPlayerIndex: number;

  // Setup phase tracking
  setupRound: 1 | 2;
  setupDirection: 'forward' | 'backward';
  setupSettlementPlaced: boolean;

  // Dice
  lastDiceRoll: [number, number] | null;
  diceRolledThisTurn: boolean;

  // Robber
  robberHexId: string;
  mustDiscardPlayers: string[]; // player IDs who must discard
  discardAmounts: Record<string, number>;

  // Dev cards
  devCardDeck: DevCardType[]; // server only - not sent to client

  // Special awards
  longestRoadHolder: string | null;
  longestRoadLength: number;
  largestArmyHolder: string | null;
  largestArmySize: number;

  // Active trade
  activeTrade: TradeOffer | null;

  // Win
  winner: string | null;
  turnNumber: number;
  startedAt: number;
}

// =============================================
// Actions (Client → Server)
// =============================================

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

export interface GameAction {
  type: ActionType;
  playerId: string;
  payload?: Record<string, unknown>;
}

// =============================================
// Client-safe state (cards hidden)
// =============================================
export interface PublicPlayer extends Omit<Player, 'devCards' | 'resources' | 'victoryPoints'> {
  victoryPoints: number; // only public VP
  resources: null; // hidden
  devCards: null; // hidden
}

export interface ClientGameState extends Omit<GameState, 'devCardDeck' | 'players'> {
  players: PublicPlayer[];
  myPlayer?: Player; // only the requesting player's full data
  devCardDeckSize: number;
}
