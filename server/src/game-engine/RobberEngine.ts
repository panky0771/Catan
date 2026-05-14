import { Board, Player, ResourceType, RESOURCE_TYPES } from '../types/game.types';

// =============================================
// Robber Mechanics
// =============================================

export function moveRobber(
  board: Board,
  hexId: string,
  currentRobberHexId: string
): string | null {
  if (hexId === currentRobberHexId) {
    return 'Robber must move to a different hex';
  }
  const hex = board.hexes.find((h) => h.id === hexId);
  if (!hex) return 'Invalid hex';

  // Move robber
  const oldHex = board.hexes.find((h) => h.id === currentRobberHexId);
  if (oldHex) oldHex.hasRobber = false;
  hex.hasRobber = true;

  return null;
}

// Get players that can be robbed (have settlements adjacent to robber hex, excluding the acting player)
export function getRobbableTargets(
  board: Board,
  robberHexId: string,
  actingPlayerId: string
): string[] {
  const hex = board.hexes.find((h) => h.id === robberHexId);
  if (!hex) return [];

  const targets = new Set<string>();
  for (const vertex of board.vertices) {
    if (!vertex.adjacentHexIds.includes(robberHexId)) continue;
    if (!vertex.building) continue;
    if (vertex.building.playerId === actingPlayerId) continue;
    targets.add(vertex.building.playerId);
  }

  return Array.from(targets);
}

export function stealResource(
  from: Player,
  to: Player
): ResourceType | null {
  // Get all resources the victim has
  const available: ResourceType[] = [];
  for (const r of RESOURCE_TYPES) {
    for (let i = 0; i < from.resources[r]; i++) {
      available.push(r);
    }
  }

  if (available.length === 0) return null;

  const stolen = available[Math.floor(Math.random() * available.length)];
  from.resources[stolen]--;
  from.resourceCount--;
  to.resources[stolen]++;
  to.resourceCount++;

  return stolen;
}

// Knight card also moves robber - same logic
export function playKnight(
  board: Board,
  player: Player,
  hexId: string,
  currentRobberHexId: string
): string | null {
  return moveRobber(board, hexId, currentRobberHexId);
}

// Update largest army
export function updateLargestArmy(
  players: { id: string; knightsPlayed: number; victoryPoints: number; publicVictoryPoints: number }[],
  currentHolder: string | null,
  currentSize: number
): { holder: string | null; size: number } {
  let bestHolder = currentHolder;
  let bestSize = currentSize;

  for (const player of players) {
    if (player.knightsPlayed >= 3 && player.knightsPlayed > bestSize) {
      if (bestHolder && bestHolder !== player.id) {
        const prev = players.find((p) => p.id === bestHolder);
        if (prev) {
          prev.victoryPoints -= 2;
          prev.publicVictoryPoints -= 2;
        }
      }
      if (bestHolder !== player.id) {
        player.victoryPoints += 2;
        player.publicVictoryPoints += 2;
      }
      bestHolder = player.id;
      bestSize = player.knightsPlayed;
    }
  }

  return { holder: bestHolder, size: bestSize };
}
