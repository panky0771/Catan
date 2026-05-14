import { Board } from '../types/game.types';

// =============================================
// Longest Road Algorithm
// DFS/backtracking through player's road network
// Opponent buildings on vertices break continuity
// =============================================

interface AdjEntry {
  edgeId: string;
  vertexId: string;
}

function buildAdjacency(
  board: Board,
  playerId: string
): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  const playerEdges = board.edges.filter((e) => e.road?.playerId === playerId);

  for (const edge of playerEdges) {
    const [v1, v2] = edge.vertexIds;
    if (!adj.has(v1)) adj.set(v1, []);
    if (!adj.has(v2)) adj.set(v2, []);
    adj.get(v1)!.push({ edgeId: edge.id, vertexId: v2 });
    adj.get(v2)!.push({ edgeId: edge.id, vertexId: v1 });
  }

  return adj;
}

function dfs(
  current: string,
  visitedEdges: Set<string>,
  adj: Map<string, AdjEntry[]>,
  board: Board,
  playerId: string
): number {
  const neighbors = adj.get(current) ?? [];
  let max = 0;

  for (const { edgeId, vertexId } of neighbors) {
    if (visitedEdges.has(edgeId)) continue;

    // Check if next vertex is blocked by an opponent building
    const nextVertex = board.vertices.find((v) => v.id === vertexId);
    if (nextVertex?.building && nextVertex.building.playerId !== playerId) {
      // Opponent building breaks the road — skip
      continue;
    }

    visitedEdges.add(edgeId);
    const length = 1 + dfs(vertexId, visitedEdges, adj, board, playerId);
    max = Math.max(max, length);
    visitedEdges.delete(edgeId);
  }

  return max;
}

export function calculateLongestRoad(board: Board, playerId: string): number {
  const adj = buildAdjacency(board, playerId);
  if (adj.size === 0) return 0;

  let maxLength = 0;

  for (const startVertex of adj.keys()) {
    const visited = new Set<string>();
    const length = dfs(startVertex, visited, adj, board, playerId);
    maxLength = Math.max(maxLength, length);
  }

  return maxLength;
}

// Update longest road award among all players
export function updateLongestRoad(
  board: Board,
  players: { id: string; victoryPoints: number; publicVictoryPoints: number }[],
  currentHolder: string | null,
  currentLength: number
): { holder: string | null; length: number } {
  let bestHolder = currentHolder;
  let bestLength = currentLength;

  for (const player of players) {
    const length = calculateLongestRoad(board, player.id);

    if (length >= 5 && length > bestLength) {
      // New longest road holder
      if (bestHolder && bestHolder !== player.id) {
        // Remove VP from previous holder
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
      bestLength = length;
    }
  }

  // If current holder no longer has a road >= bestLength, reassign
  if (bestHolder) {
    const holderLength = calculateLongestRoad(board, bestHolder);
    if (holderLength < 5) {
      // Remove VP
      const holder = players.find((p) => p.id === bestHolder);
      if (holder) {
        holder.victoryPoints -= 2;
        holder.publicVictoryPoints -= 2;
      }
      return { holder: null, length: 0 };
    }
  }

  return { holder: bestHolder, length: bestLength };
}
