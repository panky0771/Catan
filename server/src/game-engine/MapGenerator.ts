import {
  Board,
  Hex,
  TILE_DISTRIBUTION,
  NUMBER_TOKENS,
  TileType,
} from '../types/game.types';
import { buildEmptyBoard, buildPorts, PORT_POSITIONS, hexId } from './HexGrid';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =============================================
// Random Catan Map Generator
// =============================================

export function generateRandomBoard(): Board {
  const board = buildEmptyBoard();

  // 1. Shuffle and assign tile types
  const tiles = shuffleArray([...TILE_DISTRIBUTION]) as TileType[];
  for (let i = 0; i < board.hexes.length; i++) {
    board.hexes[i].tileType = tiles[i];
  }

  // 2. Assign number tokens to non-desert hexes
  // Standard method: place in spiral order skipping desert
  // For random: just shuffle and assign
  const tokens = shuffleArray([...NUMBER_TOKENS]);
  let tokenIdx = 0;

  for (const hex of board.hexes) {
    if (hex.tileType !== 'desert') {
      hex.numberToken = tokens[tokenIdx++];
    } else {
      hex.numberToken = null;
    }
  }

  // 3. Place robber on desert
  const desertHex = board.hexes.find((h) => h.tileType === 'desert');
  if (desertHex) {
    desertHex.hasRobber = true;
  }

  // 4. Shuffle port types and assign
  const portTypes = shuffleArray(PORT_POSITIONS.map((p) => p.type));
  board.ports = buildPorts(board, portTypes);

  return board;
}

// Returns the desert hex ID (robber starts here)
export function getDesertHexId(board: Board): string {
  return board.hexes.find((h) => h.tileType === 'desert')?.id ?? board.hexes[0].id;
}

// Get all hexes with a given number token
export function getHexesByToken(board: Board, token: number): Hex[] {
  return board.hexes.filter((h) => h.numberToken === token && !h.hasRobber);
}

// Get vertices adjacent to a hex that produce resources when rolled
export function getProducingVertices(board: Board, hexId: string): string[] {
  const hex = board.hexes.find((h) => h.id === hexId);
  if (!hex) return [];
  return board.vertices
    .filter((v) => v.adjacentHexIds.includes(hexId) && v.building !== null)
    .map((v) => v.id);
}
