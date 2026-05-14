import {
  Hex,
  Vertex,
  Edge,
  Board,
  Port,
  HexCoord,
} from '../types/game.types';

// =============================================
// Hex coordinate helpers (axial system, pointy-top)
// =============================================

// The 6 neighbor directions in axial (q, r) for pointy-top
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
];

export function hexNeighbor(hex: HexCoord, direction: number): HexCoord {
  const d = HEX_DIRECTIONS[direction];
  return { q: hex.q + d.q, r: hex.r + d.r };
}

export function hexId(q: number, r: number): string {
  return `h_${q}_${r}`;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// =============================================
// Vertex ID: sorted triple of hex IDs meeting at vertex
// For vertices at the board border, missing hexes use 'X' prefix
// =============================================

function sortedKey(...parts: string[]): string {
  return parts.sort().join('|');
}

// Each hex has 6 vertices. Vertex i is shared by this hex and the two
// hexes at directions i and (i+1)%6.
export function getHexVertexNeighborDirs(corner: number): [number, number] {
  return [corner, (corner + 1) % 6];
}

export function vertexId(hexQ: number, hexR: number, corner: number): string {
  // The vertex at corner `c` of hex (q,r) is shared with neighbors at dirs c and (c+1)%6
  const [d1, d2] = getHexVertexNeighborDirs(corner);
  const n1 = hexNeighbor({ q: hexQ, r: hexR }, d1);
  const n2 = hexNeighbor({ q: hexQ, r: hexR }, d2);
  return `v_${sortedKey(hexId(hexQ, hexR), hexId(n1.q, n1.r), hexId(n2.q, n2.r))}`;
}

// Edge between two adjacent hexes
export function edgeId(hexQ1: number, hexR1: number, hexQ2: number, hexR2: number): string {
  return `e_${sortedKey(hexId(hexQ1, hexR1), hexId(hexQ2, hexR2))}`;
}

// =============================================
// Standard Catan board: radius-2 hex of hexes
// Axial coords: |q| <= 2, |r| <= 2, |q+r| <= 2
// =============================================

export const CATAN_HEX_COORDS: HexCoord[] = [];
for (let q = -2; q <= 2; q++) {
  for (let r = -2; r <= 2; r++) {
    if (Math.abs(q + r) <= 2) {
      CATAN_HEX_COORDS.push({ q, r });
    }
  }
}

// =============================================
// Board builder
// =============================================

export function buildEmptyBoard(): Board {
  const hexMap = new Map<string, Hex>();

  // Create hexes
  for (const { q, r } of CATAN_HEX_COORDS) {
    const id = hexId(q, r);
    hexMap.set(id, {
      id,
      q,
      r,
      tileType: 'desert',
      numberToken: null,
      hasRobber: false,
    });
  }

  // Collect all vertex IDs per hex
  const vertexMap = new Map<string, Set<string>>(); // vertexId -> set of hexIds
  const edgeMap = new Map<string, [string, string]>(); // edgeId -> [hexId1, hexId2]

  for (const { q, r } of CATAN_HEX_COORDS) {
    const hid = hexId(q, r);
    for (let corner = 0; corner < 6; corner++) {
      const vid = vertexId(q, r, corner);
      if (!vertexMap.has(vid)) vertexMap.set(vid, new Set());
      vertexMap.get(vid)!.add(hid);
    }

    // Each hex has 6 edges (one per direction neighbor)
    for (let dir = 0; dir < 6; dir++) {
      const nb = hexNeighbor({ q, r }, dir);
      const nbId = hexId(nb.q, nb.r);
      if (hexMap.has(nbId)) {
        const eid = edgeId(q, r, nb.q, nb.r);
        if (!edgeMap.has(eid)) {
          edgeMap.set(eid, [hid, nbId]);
        }
      }
    }
  }

  // Build vertex objects with adjacency
  const vertexObjects = new Map<string, Vertex>();
  for (const [vid, hexIds] of vertexMap) {
    vertexObjects.set(vid, {
      id: vid,
      adjacentHexIds: Array.from(hexIds),
      adjacentEdgeIds: [],
      adjacentVertexIds: [],
      building: null,
      port: null,
    });
  }

  // Build edge objects
  const edgeObjects = new Map<string, Edge>();
  for (const [eid, [h1, h2]] of edgeMap) {
    // Vertices of this edge: intersection of vertices of h1 and h2
    const h1Verts = getHexVertices(
      CATAN_HEX_COORDS.find((c) => hexId(c.q, c.r) === h1)!
    );
    const h2Verts = getHexVertices(
      CATAN_HEX_COORDS.find((c) => hexId(c.q, c.r) === h2)!
    );
    const shared = h1Verts.filter((v) => h2Verts.includes(v));

    edgeObjects.set(eid, {
      id: eid,
      adjacentHexIds: [h1, h2],
      vertexIds: [shared[0], shared[1]] as [string, string],
      adjacentEdgeIds: [],
      road: null,
    });
  }

  // Compute vertex adjacency (two vertices sharing an edge are adjacent)
  for (const edge of edgeObjects.values()) {
    const [v1id, v2id] = edge.vertexIds;
    const v1 = vertexObjects.get(v1id);
    const v2 = vertexObjects.get(v2id);
    if (v1 && !v1.adjacentVertexIds.includes(v2id)) v1.adjacentVertexIds.push(v2id);
    if (v2 && !v2.adjacentVertexIds.includes(v1id)) v2.adjacentVertexIds.push(v1id);
    if (v1 && !v1.adjacentEdgeIds.includes(edge.id)) v1.adjacentEdgeIds.push(edge.id);
    if (v2 && !v2.adjacentEdgeIds.includes(edge.id)) v2.adjacentEdgeIds.push(edge.id);
  }

  // Compute edge adjacency (two edges sharing a vertex are adjacent)
  for (const edge1 of edgeObjects.values()) {
    for (const edge2 of edgeObjects.values()) {
      if (edge1.id === edge2.id) continue;
      const shared = edge1.vertexIds.some((v) => edge2.vertexIds.includes(v));
      if (shared && !edge1.adjacentEdgeIds.includes(edge2.id)) {
        edge1.adjacentEdgeIds.push(edge2.id);
      }
    }
  }

  return {
    hexes: Array.from(hexMap.values()),
    vertices: Array.from(vertexObjects.values()),
    edges: Array.from(edgeObjects.values()),
    ports: [],
  };
}

function getHexVertices(coord: HexCoord): string[] {
  return Array.from({ length: 6 }, (_, i) => vertexId(coord.q, coord.r, i));
}

// =============================================
// Port positions (perimeter edges facing outward)
// 9 ports on the standard Catan board
// =============================================

// Port directions: which direction of the hex faces "outward" toward sea
// Each port occupies 2 vertices of a perimeter hex
export const PORT_POSITIONS: Array<{ hexQ: number; hexR: number; dir: number; type: 'any' | 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' }> = [
  { hexQ: 0, hexR: -2, dir: 2, type: 'any' },      // top
  { hexQ: 1, hexR: -2, dir: 1, type: 'wheat' },
  { hexQ: 2, hexR: -2, dir: 0, type: 'any' },
  { hexQ: 2, hexR: -1, dir: 0, type: 'ore' },
  { hexQ: 2, hexR: 0, dir: 5, type: 'any' },
  { hexQ: 1, hexR: 1, dir: 5, type: 'brick' },
  { hexQ: 0, hexR: 2, dir: 4, type: 'any' },
  { hexQ: -1, hexR: 2, dir: 4, type: 'sheep' },
  { hexQ: -2, hexR: 1, dir: 3, type: 'wood' },
];

// Build ports from positions, but shuffle the types for random placement
export function buildPorts(board: Board, shuffledTypes?: string[]): Port[] {
  const ports: Port[] = [];
  const types = shuffledTypes ?? PORT_POSITIONS.map((p) => p.type);

  PORT_POSITIONS.forEach((pos, idx) => {
    const hex = board.hexes.find((h) => h.q === pos.hexQ && h.r === pos.hexR);
    if (!hex) return;

    // The two vertices facing the outward direction are at corners `dir` and `(dir+5)%6`
    // (the two vertices straddling the outward edge)
    const c1 = pos.dir;
    const c2 = (pos.dir + 5) % 6;
    const v1 = vertexId(pos.hexQ, pos.hexR, c1);
    const v2 = vertexId(pos.hexQ, pos.hexR, c2);

    const port: Port = {
      type: (types[idx] as Port['type']) ?? pos.type,
      vertexIds: [v1, v2],
      hexId: hex.id,
      direction: pos.dir,
    };
    ports.push(port);

    // Attach port to vertices
    const vert1 = board.vertices.find((v) => v.id === v1);
    const vert2 = board.vertices.find((v) => v.id === v2);
    if (vert1) vert1.port = port;
    if (vert2) vert2.port = port;
  });

  return ports;
}

// =============================================
// Pixel position for rendering (pointy-top hex)
// =============================================

export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: size * ((3 / 2) * r),
  };
}

export function vertexPixel(
  q: number,
  r: number,
  corner: number,
  size: number
): { x: number; y: number } {
  const center = hexToPixel(q, r, size);
  const angle = (Math.PI / 180) * (60 * corner - 30);
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  };
}
