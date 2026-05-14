import {
  Board,
  Player,
  Building,
  Road,
  BUILDING_COSTS,
} from '../types/game.types';
import { hasResources, deductResources } from './ResourceEngine';

// =============================================
// Building Validation & Placement
// =============================================

// A vertex is "clear" if it has no building AND no building on adjacent vertices
export function isVertexClear(board: Board, vertexId: string): boolean {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return false;
  if (vertex.building) return false;
  return vertex.adjacentVertexIds.every((adjId) => {
    const adj = board.vertices.find((v) => v.id === adjId);
    return !adj?.building;
  });
}

// Settlement must be on a vertex connected to the player's road (except during setup)
export function isConnectedToPlayerRoad(
  board: Board,
  vertexId: string,
  playerId: string
): boolean {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return false;
  return vertex.adjacentEdgeIds.some((eid) => {
    const edge = board.edges.find((e) => e.id === eid);
    return edge?.road?.playerId === playerId;
  });
}

export function canPlaceSettlement(
  board: Board,
  player: Player,
  vertexId: string,
  isSetup: boolean
): string | null {
  if (player.settlementsLeft <= 0) return 'No settlements remaining';
  if (!isVertexClear(board, vertexId)) return 'Location not available (distance rule)';
  if (!isSetup && !hasResources(player, BUILDING_COSTS.settlement)) {
    return 'Not enough resources';
  }
  if (!isSetup && !isConnectedToPlayerRoad(board, vertexId, player.id)) {
    return 'Settlement must connect to your road';
  }
  return null;
}

export function placeSettlement(
  board: Board,
  player: Player,
  vertexId: string,
  isSetup: boolean
): void {
  const vertex = board.vertices.find((v) => v.id === vertexId)!;
  vertex.building = { type: 'settlement', playerId: player.id, color: player.color };
  player.settlementsLeft--;
  player.victoryPoints += 1;
  player.publicVictoryPoints += 1;
  if (!isSetup) deductResources(player, BUILDING_COSTS.settlement);
}

export function canUpgradeToCity(
  board: Board,
  player: Player,
  vertexId: string
): string | null {
  if (player.citiesLeft <= 0) return 'No cities remaining';
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return 'Invalid vertex';
  if (!vertex.building) return 'No settlement to upgrade';
  if (vertex.building.type !== 'settlement') return 'Already a city';
  if (vertex.building.playerId !== player.id) return 'Not your settlement';
  if (!hasResources(player, BUILDING_COSTS.city)) return 'Not enough resources';
  return null;
}

export function upgradeToCity(board: Board, player: Player, vertexId: string): void {
  const vertex = board.vertices.find((v) => v.id === vertexId)!;
  vertex.building = { type: 'city', playerId: player.id, color: player.color };
  player.citiesLeft--;
  player.settlementsLeft++; // city replaces settlement piece
  player.victoryPoints += 1;
  player.publicVictoryPoints += 1;
  deductResources(player, BUILDING_COSTS.city);
}

export function canPlaceRoad(
  board: Board,
  player: Player,
  edgeId: string,
  isSetup: boolean,
  setupVertexId?: string
): string | null {
  if (player.roadsLeft <= 0) return 'No roads remaining';
  const edge = board.edges.find((e) => e.id === edgeId);
  if (!edge) return 'Invalid edge';
  if (edge.road) return 'Road already exists here';

  if (isSetup && setupVertexId) {
    // During setup, road must be adjacent to the just-placed settlement
    if (!edge.vertexIds.includes(setupVertexId)) {
      return 'Road must be adjacent to your settlement';
    }
    return null;
  }

  if (!isSetup && !hasResources(player, BUILDING_COSTS.road)) {
    return 'Not enough resources';
  }

  // Road must connect to player's existing road or settlement
  const connectedToRoad = edge.adjacentEdgeIds.some((adjEid) => {
    const adjEdge = board.edges.find((e) => e.id === adjEid);
    return adjEdge?.road?.playerId === player.id;
  });

  const connectedToBuilding = edge.vertexIds.some((vid) => {
    const vertex = board.vertices.find((v) => v.id === vid);
    return vertex?.building?.playerId === player.id;
  });

  if (!connectedToRoad && !connectedToBuilding) {
    return 'Road must connect to your network';
  }

  // Check that road isn't blocked by opponent building at connection point
  // (A road can still be placed if at least one endpoint is yours or empty,
  //  but cannot go through an opponent's building)
  const hasValidEndpoint = edge.vertexIds.some((vid) => {
    const vertex = board.vertices.find((v) => v.id === vid);
    if (!vertex) return false;
    if (vertex.building?.playerId === player.id) return true;
    if (!vertex.building) {
      // Check if connected to player's road through this vertex
      return vertex.adjacentEdgeIds.some((adjEid) => {
        if (adjEid === edgeId) return false;
        const adjEdge = board.edges.find((e) => e.id === adjEid);
        return adjEdge?.road?.playerId === player.id;
      });
    }
    return false;
  });

  if (!hasValidEndpoint) return 'Road cannot be placed here';
  return null;
}

export function placeRoad(
  board: Board,
  player: Player,
  edgeId: string,
  isSetup: boolean
): void {
  const edge = board.edges.find((e) => e.id === edgeId)!;
  edge.road = { playerId: player.id, color: player.color };
  player.roadsLeft--;
  if (!isSetup) deductResources(player, BUILDING_COSTS.road);
}

// Get valid placement positions for UI highlighting
export function getValidSettlementPositions(
  board: Board,
  player: Player,
  isSetup: boolean
): string[] {
  return board.vertices
    .filter((v) => canPlaceSettlement(board, player, v.id, isSetup) === null)
    .map((v) => v.id);
}

export function getValidRoadPositions(
  board: Board,
  player: Player,
  isSetup: boolean,
  setupVertexId?: string
): string[] {
  return board.edges
    .filter((e) => canPlaceRoad(board, player, e.id, isSetup, setupVertexId) === null)
    .map((e) => e.id);
}

export function getValidCityPositions(board: Board, player: Player): string[] {
  return board.vertices
    .filter((v) => canUpgradeToCity(board, player, v.id) === null)
    .map((v) => v.id);
}
