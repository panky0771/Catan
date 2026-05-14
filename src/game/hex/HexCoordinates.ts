// =============================================
// Hex coordinate utilities for rendering
// Pointy-top hex grid, axial coordinates
// =============================================

export interface PixelPoint {
  x: number;
  y: number;
}

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

// Convert axial hex coordinates to pixel (pointy-top)
export function hexToPixel(q: number, r: number, size: number, origin = { x: 0, y: 0 }): PixelPoint {
  return {
    x: origin.x + size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: origin.y + size * (3 / 2) * r,
  };
}

// Get the 6 corner points of a hex at given pixel center
export function hexCorners(cx: number, cy: number, size: number): PixelPoint[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  });
}

// Get a specific corner of hex (q,r)
export function hexCorner(q: number, r: number, corner: number, size: number, origin = { x: 0, y: 0 }): PixelPoint {
  const center = hexToPixel(q, r, size, origin);
  const angle = (Math.PI / 180) * (60 * corner - 30);
  return {
    x: center.x + size * Math.cos(angle),
    y: center.y + size * Math.sin(angle),
  };
}

// Midpoint of edge between two adjacent hexes (pixel coordinates of edge center)
export function edgeMidpoint(
  q1: number, r1: number,
  q2: number, r2: number,
  size: number,
  origin = { x: 0, y: 0 }
): PixelPoint {
  const c1 = hexToPixel(q1, r1, size, origin);
  const c2 = hexToPixel(q2, r2, size, origin);
  return { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
}

// Get vertex pixel from a vertex id like "v_h_0_0|h_1_0|h_1_-1"
// Actually we'll compute from the three hex positions
export function parseVertexId(vId: string): [string, string, string] | null {
  // Format: "v_h_q1_r1|h_q2_r2|h_q3_r3"
  const inner = vId.replace(/^v_/, '');
  const parts = inner.split('|');
  if (parts.length !== 3) return null;
  return parts as [string, string, string];
}

export function parseHexId(hId: string): { q: number; r: number } | null {
  const m = hId.match(/^h_(-?\d+)_(-?\d+)$/);
  if (!m) return null;
  return { q: parseInt(m[1]), r: parseInt(m[2]) };
}

export function parseEdgeId(eId: string): [{ q: number; r: number }, { q: number; r: number }] | null {
  const inner = eId.replace(/^e_/, '');
  const parts = inner.split('|');
  if (parts.length !== 2) return null;
  const h1 = parseHexId(parts[0]);
  const h2 = parseHexId(parts[1]);
  if (!h1 || !h2) return null;
  return [h1, h2];
}

// Compute vertex pixel position from three surrounding hex IDs
export function vertexPixelFromId(
  vId: string,
  size: number,
  origin = { x: 0, y: 0 }
): PixelPoint | null {
  const parts = parseVertexId(vId);
  if (!parts) return null;

  const coords = parts.map(parseHexId).filter(Boolean) as { q: number; r: number }[];
  // A boundary vertex might have virtual hex IDs; use only valid ones
  if (coords.length === 0) return null;

  const pixels = coords.map((c) => hexToPixel(c.q, c.r, size, origin));
  return {
    x: pixels.reduce((s, p) => s + p.x, 0) / pixels.length,
    y: pixels.reduce((s, p) => s + p.y, 0) / pixels.length,
  };
}

// Compute edge midpoint pixel from edge ID
export function edgePixelFromId(
  eId: string,
  size: number,
  origin = { x: 0, y: 0 }
): PixelPoint | null {
  const hexes = parseEdgeId(eId);
  if (!hexes) return null;
  return edgeMidpoint(hexes[0].q, hexes[0].r, hexes[1].q, hexes[1].r, size, origin);
}

// Direction vector from hex1 center to edge midpoint between hex1 and hex2
export function edgeDirection(q1: number, r1: number, q2: number, r2: number): PixelPoint {
  const dx = q2 - q1;
  const dy = r2 - r1;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x: dx / len, y: dy / len };
}
