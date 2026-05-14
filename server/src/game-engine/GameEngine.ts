import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  PlayerColor,
  GameSettings,
  DEFAULT_SETTINGS,
  GameAction,
  ResourceCards,
  ResourceType,
  DevCardType,
  EMPTY_RESOURCES,
  ClientGameState,
  PublicPlayer,
  RESOURCE_TYPES,
} from '../types/game.types';
import { generateRandomBoard, getDesertHexId } from './MapGenerator';
import { createDevCardDeck, buyDevCard, canPlayDevCard, markCardPlayed, playYearOfPlenty, playMonopoly } from './CardEngine';
import {
  rollDice,
  distributeResources,
  applyResourceGains,
  getDiscardPlayers,
  discardResources,
  maritimeTrade,
  countResources,
} from './ResourceEngine';
import {
  canPlaceSettlement,
  canPlaceRoad,
  canUpgradeToCity,
  placeSettlement,
  placeRoad,
  upgradeToCity,
  getValidSettlementPositions,
  getValidRoadPositions,
  getValidCityPositions,
} from './BuildingEngine';
import { moveRobber, stealResource, getRobbableTargets, updateLargestArmy } from './RobberEngine';
import { createTradeOffer, acceptTrade, rejectTrade, cancelTrade } from './TradeEngine';
import { updateLongestRoad } from './LongestRoadEngine';
import { checkVictory, revealAllVP } from './VictoryEngine';

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'orange', 'white'];

// =============================================
// Main Game Engine
// =============================================

export class GameEngine {
  private state: GameState;
  private roadBuildingRoadsLeft = 0;

  constructor(settings: Partial<GameSettings> = {}) {
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    const board = generateRandomBoard();
    const desertHexId = getDesertHexId(board);

    this.state = {
      gameId: uuidv4(),
      roomCode: '',
      phase: 'waiting',
      turnPhase: 'setup_settlement',
      settings: mergedSettings,
      board,
      players: [],
      currentPlayerIndex: 0,
      setupRound: 1,
      setupDirection: 'forward',
      setupSettlementPlaced: false,
      lastDiceRoll: null,
      diceRolledThisTurn: false,
      robberHexId: desertHexId,
      mustDiscardPlayers: [],
      discardAmounts: {},
      devCardDeck: createDevCardDeck(),
      longestRoadHolder: null,
      longestRoadLength: 0,
      largestArmyHolder: null,
      largestArmySize: 0,
      activeTrade: null,
      winner: null,
      turnNumber: 1,
      startedAt: 0,
    };
  }

  getState(): GameState {
    return this.state;
  }

  // Create client-safe state (hide other players' cards)
  getClientState(forPlayerId?: string): ClientGameState {
    const s = this.state;
    const publicPlayers: PublicPlayer[] = s.players.map((p) => ({
      ...p,
      resources: null,
      devCards: null,
      victoryPoints: p.publicVictoryPoints,
    }));

    return {
      ...s,
      players: publicPlayers,
      myPlayer: forPlayerId ? s.players.find((p) => p.id === forPlayerId) : undefined,
      devCardDeckSize: s.devCardDeck.length,
    };
  }

  addPlayer(playerId: string, socketId: string, username: string): string | null {
    if (this.state.phase !== 'waiting') return 'Game already started';
    if (this.state.players.length >= this.state.settings.maxPlayers) return 'Game is full';
    if (this.state.players.some((p) => p.id === playerId)) return 'Already in game';

    const colorIndex = this.state.players.length;
    const player: Player = {
      id: playerId,
      socketId,
      username,
      color: PLAYER_COLORS[colorIndex],
      resources: { ...EMPTY_RESOURCES },
      devCards: [],
      resourceCount: 0,
      devCardCount: 0,
      knightsPlayed: 0,
      settlementsLeft: 5,
      citiesLeft: 4,
      roadsLeft: 15,
      victoryPoints: 0,
      publicVictoryPoints: 0,
      isConnected: true,
      isReady: false,
      hasPlayedDevCardThisTurn: false,
    };

    this.state.players.push(player);
    return null;
  }

  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
  }

  startGame(): string | null {
    if (this.state.players.length < 3) return 'Need at least 3 players';
    if (this.state.phase !== 'waiting') return 'Game already started';

    // Randomize player order
    this.state.players = shuffleArray(this.state.players).map((p, i) => ({
      ...p,
      color: PLAYER_COLORS[i],
    }));

    this.state.phase = 'setup';
    this.state.turnPhase = 'setup_settlement';
    this.state.currentPlayerIndex = 0;
    this.state.setupRound = 1;
    this.state.setupDirection = 'forward';
    this.state.setupSettlementPlaced = false;
    this.state.startedAt = Date.now();

    return null;
  }

  processAction(action: GameAction): { success: boolean; error?: string; events: string[] } {
    const events: string[] = [];

    try {
      const result = this.handleAction(action, events);
      return { success: result === null, error: result ?? undefined, events };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return { success: false, error: msg, events };
    }
  }

  private handleAction(action: GameAction, events: string[]): string | null {
    const s = this.state;
    const player = s.players.find((p) => p.id === action.playerId);
    if (!player) return 'Player not found';

    // Setup phase actions
    if (s.phase === 'setup') {
      return this.handleSetupAction(action, player, events);
    }

    if (s.phase !== 'playing') return 'Game not in playing state';

    // Must be current player for most actions
    const isCurrentPlayer = s.players[s.currentPlayerIndex]?.id === action.playerId;

    // Discard can be done by any player who needs to discard
    if (action.type === 'DISCARD_RESOURCES') {
      return this.handleDiscard(action, player, events);
    }

    if (!isCurrentPlayer) return 'Not your turn';

    switch (action.type) {
      case 'ROLL_DICE': return this.handleRollDice(action, player, events);
      case 'BUILD_ROAD': return this.handleBuildRoad(action, player, events);
      case 'BUILD_SETTLEMENT': return this.handleBuildSettlement(action, player, events);
      case 'BUILD_CITY': return this.handleBuildCity(action, player, events);
      case 'BUY_DEV_CARD': return this.handleBuyDevCard(action, player, events);
      case 'PLAY_KNIGHT': return this.handlePlayKnight(action, player, events);
      case 'PLAY_ROAD_BUILDING': return this.handlePlayRoadBuilding(action, player, events);
      case 'PLAY_YEAR_OF_PLENTY': return this.handlePlayYearOfPlenty(action, player, events);
      case 'PLAY_MONOPOLY': return this.handlePlayMonopoly(action, player, events);
      case 'MOVE_ROBBER': return this.handleMoveRobber(action, player, events);
      case 'STEAL_RESOURCE': return this.handleStealResource(action, player, events);
      case 'OFFER_TRADE': return this.handleOfferTrade(action, player, events);
      case 'ACCEPT_TRADE': return this.handleAcceptTrade(action, player, events);
      case 'REJECT_TRADE': return this.handleRejectTrade(action, player, events);
      case 'CANCEL_TRADE': return this.handleCancelTrade(action, player, events);
      case 'MARITIME_TRADE': return this.handleMaritimeTrade(action, player, events);
      case 'END_TURN': return this.handleEndTurn(action, player, events);
      default: return `Unknown action: ${action.type}`;
    }
  }

  // =============================================
  // Setup Phase
  // =============================================

  private handleSetupAction(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    const isCurrentPlayer = s.players[s.currentPlayerIndex]?.id === action.playerId;
    if (!isCurrentPlayer) return 'Not your turn';

    if (action.type === 'BUILD_SETTLEMENT') {
      if (s.turnPhase !== 'setup_settlement') return 'Place a settlement first';
      const { vertexId } = action.payload as { vertexId: string };
      const err = canPlaceSettlement(s.board, player, vertexId, true);
      if (err) return err;

      placeSettlement(s.board, player, vertexId, true);
      s.setupSettlementPlaced = true;
      // Store last placed vertex for road validation
      (s as unknown as Record<string, unknown>)._setupVertexId = vertexId;
      s.turnPhase = 'setup_road';
      events.push(`${player.username} placed a settlement`);

      // In round 2, give initial resources
      if (s.setupRound === 2) {
        const vertex = s.board.vertices.find((v) => v.id === vertexId)!;
        for (const hexId of vertex.adjacentHexIds) {
          const hex = s.board.hexes.find((h) => h.id === hexId);
          if (hex && hex.tileType !== 'desert') {
            player.resources[hex.tileType as ResourceType]++;
            player.resourceCount++;
          }
        }
        events.push(`${player.username} received starting resources`);
      }
      return null;
    }

    if (action.type === 'BUILD_ROAD') {
      if (s.turnPhase !== 'setup_road') return 'Place a road after your settlement';
      const { edgeId } = action.payload as { edgeId: string };
      const setupVertexId = (s as unknown as Record<string, unknown>)._setupVertexId as string;
      const err = canPlaceRoad(s.board, player, edgeId, true, setupVertexId);
      if (err) return err;

      placeRoad(s.board, player, edgeId, true);
      events.push(`${player.username} placed a road`);
      this.advanceSetupTurn(events);
      return null;
    }

    return 'Invalid setup action';
  }

  private advanceSetupTurn(events: string[]): void {
    const s = this.state;
    const playerCount = s.players.length;

    if (s.setupRound === 1) {
      if (s.currentPlayerIndex < playerCount - 1) {
        s.currentPlayerIndex++;
      } else {
        // End of round 1, start round 2 in reverse
        s.setupRound = 2;
        s.setupDirection = 'backward';
        // currentPlayerIndex stays at last player
      }
    } else {
      // Round 2: go backward
      if (s.currentPlayerIndex > 0) {
        s.currentPlayerIndex--;
      } else {
        // Setup complete - start main game
        s.phase = 'playing';
        s.turnPhase = 'pre_roll';
        s.currentPlayerIndex = 0;
        s.turnNumber = 1;
        events.push('Setup complete! Game begins!');
      }
    }

    s.setupSettlementPlaced = false;
    s.turnPhase = 'setup_settlement';
    delete (s as unknown as Record<string, unknown>)._setupVertexId;
  }

  // =============================================
  // Main Game Actions
  // =============================================

  private handleRollDice(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'pre_roll') return 'Already rolled this turn';

    const roll = rollDice();
    s.lastDiceRoll = roll;
    s.diceRolledThisTurn = true;
    const total = roll[0] + roll[1];

    events.push(`${player.username} rolled ${roll[0]} + ${roll[1]} = ${total}`);

    if (total === 7) {
      // Check for mandatory discards
      const discardMap = getDiscardPlayers(s.players);
      if (discardMap.size > 0) {
        s.mustDiscardPlayers = Array.from(discardMap.keys());
        s.discardAmounts = Object.fromEntries(discardMap);
        s.turnPhase = 'discard';
        events.push('Some players must discard half their resources');
      } else {
        s.turnPhase = 'move_robber';
        events.push('Move the robber!');
      }
    } else {
      const gains = distributeResources(s.board, s.players, total);
      applyResourceGains(s.players, gains);
      s.turnPhase = 'post_roll';
      events.push(`Resources distributed for roll of ${total}`);
    }

    return null;
  }

  private handleDiscard(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'discard') return 'Not in discard phase';
    if (!s.mustDiscardPlayers.includes(player.id)) return 'You do not need to discard';

    const { resources } = action.payload as { resources: ResourceCards };
    const required = s.discardAmounts[player.id];
    const err = discardResources(player, resources, required);
    if (err) return err;

    s.mustDiscardPlayers = s.mustDiscardPlayers.filter((id) => id !== player.id);
    delete s.discardAmounts[player.id];
    events.push(`${player.username} discarded ${required} cards`);

    if (s.mustDiscardPlayers.length === 0) {
      s.turnPhase = 'move_robber';
      events.push('Move the robber!');
    }

    return null;
  }

  private handleMoveRobber(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'move_robber') return 'Cannot move robber now';
    const { hexId } = action.payload as { hexId: string };

    const err = moveRobber(s.board, hexId, s.robberHexId);
    if (err) return err;
    s.robberHexId = hexId;

    const targets = getRobbableTargets(s.board, hexId, player.id);
    if (targets.length > 0) {
      // Player must steal - wait for STEAL_RESOURCE action
      (s as unknown as Record<string, unknown>)._robbableTargets = targets;
      events.push(`${player.username} moved the robber - must steal from a player`);
      // Don't advance turn phase yet
      return null;
    }

    s.turnPhase = 'post_roll';
    events.push(`${player.username} moved the robber`);
    return null;
  }

  private handleStealResource(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    const { targetPlayerId } = action.payload as { targetPlayerId: string };
    const targets = (s as unknown as Record<string, unknown>)._robbableTargets as string[] | undefined;
    if (!targets?.includes(targetPlayerId)) return 'Cannot steal from that player';

    const target = s.players.find((p) => p.id === targetPlayerId);
    if (!target) return 'Target player not found';

    const stolen = stealResource(target, player);
    delete (s as unknown as Record<string, unknown>)._robbableTargets;
    s.turnPhase = 'post_roll';

    if (stolen) {
      events.push(`${player.username} stole a ${stolen} from ${target.username}`);
    } else {
      events.push(`${player.username} stole from ${target.username} (they had no resources)`);
    }

    return null;
  }

  private handleBuildRoad(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll' && this.roadBuildingRoadsLeft === 0) {
      return 'Cannot build road now';
    }
    const { edgeId } = action.payload as { edgeId: string };
    const free = this.roadBuildingRoadsLeft > 0;
    const err = canPlaceRoad(s.board, player, edgeId, free);
    if (err) return err;

    placeRoad(s.board, player, edgeId, free);
    events.push(`${player.username} built a road`);

    if (free) {
      this.roadBuildingRoadsLeft--;
      if (this.roadBuildingRoadsLeft === 0) {
        events.push('Road Building complete');
      }
    }

    this.updateSpecialAwards(events);
    return null;
  }

  private handleBuildSettlement(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const { vertexId } = action.payload as { vertexId: string };
    const err = canPlaceSettlement(s.board, player, vertexId, false);
    if (err) return err;

    placeSettlement(s.board, player, vertexId, false);
    events.push(`${player.username} built a settlement`);
    this.checkWin(player, events);
    return null;
  }

  private handleBuildCity(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const { vertexId } = action.payload as { vertexId: string };
    const err = canUpgradeToCity(s.board, player, vertexId);
    if (err) return err;

    upgradeToCity(s.board, player, vertexId);
    events.push(`${player.username} upgraded to a city`);
    this.checkWin(player, events);
    return null;
  }

  private handleBuyDevCard(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';

    const { card, error } = buyDevCard(player, s.devCardDeck, s.turnNumber);
    if (error) return error;
    events.push(`${player.username} bought a development card`);

    if (card?.type === 'victoryPoint') {
      this.checkWin(player, events);
    }

    return null;
  }

  private handlePlayKnight(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    const err = canPlayDevCard(player, 'knight', s.turnNumber, s.turnPhase);
    if (err) return err;

    markCardPlayed(player, 'knight', s.turnNumber);
    player.knightsPlayed++;
    events.push(`${player.username} played a Knight card`);

    // Update largest army
    const { holder, size } = updateLargestArmy(s.players, s.largestArmyHolder, s.largestArmySize);
    if (holder !== s.largestArmyHolder) {
      s.largestArmyHolder = holder;
      s.largestArmySize = size;
      if (holder) events.push(`${s.players.find((p) => p.id === holder)?.username} now has Largest Army!`);
    }

    // Knight moves robber
    s.turnPhase = 'move_robber';
    events.push('Move the robber!');
    this.checkWin(player, events);
    return null;
  }

  private handlePlayRoadBuilding(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const err = canPlayDevCard(player, 'roadBuilding', s.turnNumber, s.turnPhase);
    if (err) return err;
    if (player.roadsLeft === 0) return 'No roads remaining';

    markCardPlayed(player, 'roadBuilding', s.turnNumber);
    this.roadBuildingRoadsLeft = Math.min(2, player.roadsLeft);
    events.push(`${player.username} played Road Building - place ${this.roadBuildingRoadsLeft} roads`);
    return null;
  }

  private handlePlayYearOfPlenty(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const err = canPlayDevCard(player, 'yearOfPlenty', s.turnNumber, s.turnPhase);
    if (err) return err;

    const { resources } = action.payload as { resources: [ResourceType, ResourceType] };
    const yopErr = playYearOfPlenty(player, resources);
    if (yopErr) return yopErr;

    markCardPlayed(player, 'yearOfPlenty', s.turnNumber);
    events.push(`${player.username} played Year of Plenty - gained ${resources[0]} and ${resources[1]}`);
    return null;
  }

  private handlePlayMonopoly(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const err = canPlayDevCard(player, 'monopoly', s.turnNumber, s.turnPhase);
    if (err) return err;

    const { resource } = action.payload as { resource: ResourceType };
    const { stolen, error } = playMonopoly(player, s.players, resource);
    if (error) return error;

    markCardPlayed(player, 'monopoly', s.turnNumber);
    events.push(`${player.username} played Monopoly on ${resource} - stole ${stolen} cards`);
    return null;
  }

  private handleOfferTrade(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    if (s.activeTrade) return 'A trade is already in progress';

    const { toPlayerId, offer, request } = action.payload as {
      toPlayerId: string | null;
      offer: ResourceCards;
      request: ResourceCards;
    };

    const { trade, error } = createTradeOffer(player, toPlayerId, offer, request);
    if (error) return error;

    s.activeTrade = trade!;
    events.push(`${player.username} offered a trade`);
    return null;
  }

  private handleAcceptTrade(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (!s.activeTrade) return 'No active trade';
    if (s.activeTrade.fromPlayerId === player.id) return 'Cannot accept your own trade';
    if (s.activeTrade.toPlayerId && s.activeTrade.toPlayerId !== player.id) {
      return 'This trade is not directed to you';
    }

    const fromPlayer = s.players.find((p) => p.id === s.activeTrade!.fromPlayerId)!;
    const err = acceptTrade(fromPlayer, player, s.activeTrade);
    if (err) return err;

    events.push(`${player.username} accepted ${fromPlayer.username}'s trade`);
    s.activeTrade = null;
    return null;
  }

  private handleRejectTrade(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (!s.activeTrade) return 'No active trade';
    rejectTrade(s.activeTrade);
    s.activeTrade = null;
    events.push(`${player.username} rejected the trade`);
    return null;
  }

  private handleCancelTrade(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (!s.activeTrade) return 'No active trade';
    if (s.activeTrade.fromPlayerId !== player.id) return 'Not your trade to cancel';
    cancelTrade(s.activeTrade);
    s.activeTrade = null;
    events.push(`${player.username} cancelled the trade`);
    return null;
  }

  private handleMaritimeTrade(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase !== 'post_roll') return 'Must roll dice first';
    const { give, receive, amount } = action.payload as {
      give: ResourceType;
      receive: ResourceType;
      amount: number;
    };
    const err = maritimeTrade(player, s.board, give, receive, amount);
    if (err) return err;
    events.push(`${player.username} traded ${amount} ${give} for 1 ${receive}`);
    return null;
  }

  private handleEndTurn(action: GameAction, player: Player, events: string[]): string | null {
    const s = this.state;
    if (s.turnPhase === 'pre_roll') return 'Must roll dice before ending turn';
    if (s.mustDiscardPlayers.length > 0) return 'Players must discard first';
    if (s.turnPhase === 'move_robber') return 'Must move the robber first';
    if (this.roadBuildingRoadsLeft > 0 && player.roadsLeft > 0) {
      return 'Must place all roads from Road Building card';
    }

    // Cancel any active trade
    if (s.activeTrade) {
      s.activeTrade = null;
    }

    events.push(`${player.username} ended their turn`);
    this.advanceTurn();
    return null;
  }

  private advanceTurn(): void {
    const s = this.state;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.turnNumber++;
    s.turnPhase = 'pre_roll';
    s.diceRolledThisTurn = false;
    s.lastDiceRoll = null;
    s.mustDiscardPlayers = [];
    s.discardAmounts = {};
    this.roadBuildingRoadsLeft = 0;

    // Reset dev card play flag for new player
    const newPlayer = s.players[s.currentPlayerIndex];
    if (newPlayer) newPlayer.hasPlayedDevCardThisTurn = false;
  }

  private updateSpecialAwards(events: string[]): void {
    const s = this.state;
    const longestRoad = updateLongestRoad(
      s.board,
      s.players,
      s.longestRoadHolder,
      s.longestRoadLength
    );
    if (longestRoad.holder !== s.longestRoadHolder) {
      s.longestRoadHolder = longestRoad.holder;
      s.longestRoadLength = longestRoad.length;
      if (longestRoad.holder) {
        const name = s.players.find((p) => p.id === longestRoad.holder)?.username;
        events.push(`${name} now has Longest Road! (${longestRoad.length} roads)`);
      }
    }
  }

  private checkWin(player: Player, events: string[]): void {
    const s = this.state;
    const winner = checkVictory(s.players, s.settings.victoryPointsToWin);
    if (winner) {
      s.winner = winner.id;
      s.phase = 'ended';
      revealAllVP(s.players);
      events.push(`🏆 ${winner.username} wins with ${winner.victoryPoints} victory points!`);
    }
  }

  reconnectPlayer(playerId: string, socketId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.socketId = socketId;
      player.isConnected = true;
    }
  }

  disconnectPlayer(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  isGameOver(): boolean {
    return this.state.phase === 'ended';
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
