import {
  Board,
  Player,
  ResourceCards,
  ResourceType,
  RESOURCE_TYPES,
  EMPTY_RESOURCES,
} from '../types/game.types';
import { getHexesByToken } from './MapGenerator';

// =============================================
// Resource Engine
// =============================================

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function distributeResources(
  board: Board,
  players: Player[],
  roll: number
): Map<string, ResourceCards> {
  const gains = new Map<string, ResourceCards>();
  players.forEach((p) => gains.set(p.id, { ...EMPTY_RESOURCES }));

  const hexes = getHexesByToken(board, roll);
  for (const hex of hexes) {
    if (hex.tileType === 'desert' || hex.hasRobber) continue;
    const resource = hex.tileType as ResourceType;

    for (const vertex of board.vertices) {
      if (!vertex.adjacentHexIds.includes(hex.id)) continue;
      if (!vertex.building) continue;

      const amount = vertex.building.type === 'city' ? 2 : 1;
      const gain = gains.get(vertex.building.playerId)!;
      gain[resource] += amount;
    }
  }

  return gains;
}

export function applyResourceGains(players: Player[], gains: Map<string, ResourceCards>): void {
  for (const player of players) {
    const gain = gains.get(player.id);
    if (!gain) continue;
    for (const res of RESOURCE_TYPES) {
      player.resources[res] += gain[res];
    }
    player.resourceCount = countResources(player.resources);
  }
}

export function countResources(cards: ResourceCards): number {
  return RESOURCE_TYPES.reduce((sum, r) => sum + cards[r], 0);
}

export function hasResources(player: Player, cost: ResourceCards): boolean {
  return RESOURCE_TYPES.every((r) => player.resources[r] >= cost[r]);
}

export function deductResources(player: Player, cost: ResourceCards): void {
  for (const r of RESOURCE_TYPES) {
    player.resources[r] -= cost[r];
  }
  player.resourceCount = countResources(player.resources);
}

export function addResources(player: Player, cards: ResourceCards): void {
  for (const r of RESOURCE_TYPES) {
    player.resources[r] += cards[r];
  }
  player.resourceCount = countResources(player.resources);
}

// Who must discard when a 7 is rolled (> 7 cards)
export function getDiscardPlayers(players: Player[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const p of players) {
    if (p.resourceCount > 7) {
      result.set(p.id, Math.floor(p.resourceCount / 2));
    }
  }
  return result;
}

// Validate and apply a discard action
export function discardResources(
  player: Player,
  toDiscard: ResourceCards,
  requiredAmount: number
): string | null {
  const totalDiscard = countResources(toDiscard);
  if (totalDiscard !== requiredAmount) {
    return `Must discard exactly ${requiredAmount} cards, got ${totalDiscard}`;
  }
  for (const r of RESOURCE_TYPES) {
    if ((toDiscard[r] ?? 0) > player.resources[r]) {
      return `Not enough ${r} to discard`;
    }
  }
  deductResources(player, toDiscard);
  return null;
}

// Maritime trade: player gives ratio:1 of one resource for 1 of another
export function maritimeTrade(
  player: Player,
  board: Board,
  give: ResourceType,
  receive: ResourceType,
  amount: number
): string | null {
  const ratio = getTradeRatio(player, board, give);
  if (amount !== ratio) {
    return `Trade ratio for ${give} is ${ratio}:1, not ${amount}:1`;
  }
  if (player.resources[give] < amount) {
    return `Not enough ${give}`;
  }
  player.resources[give] -= amount;
  player.resources[receive] += 1;
  player.resourceCount = countResources(player.resources);
  return null;
}

export function getTradeRatio(
  player: Player,
  board: Board,
  resource: ResourceType
): number {
  // Check for 2:1 port
  for (const vertex of board.vertices) {
    if (!vertex.building || vertex.building.playerId !== player.id) continue;
    if (!vertex.port) continue;
    if (vertex.port.type === resource) return 2;
    if (vertex.port.type === 'any') return 3;
  }
  return 4; // default maritime trade
}

// Get all valid trade ratios for a player
export function getAllTradeRatios(player: Player, board: Board): Record<ResourceType, number> {
  const ratios: Record<ResourceType, number> = {
    wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4,
  };
  for (const vertex of board.vertices) {
    if (!vertex.building || vertex.building.playerId !== player.id) continue;
    if (!vertex.port) continue;
    if (vertex.port.type === 'any') {
      for (const r of RESOURCE_TYPES) {
        ratios[r] = Math.min(ratios[r], 3);
      }
    } else {
      ratios[vertex.port.type as ResourceType] = Math.min(
        ratios[vertex.port.type as ResourceType],
        2
      );
    }
  }
  return ratios;
}
