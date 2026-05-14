import Phaser from 'phaser';
import {
  Board,
  Hex,
  Vertex,
  Edge,
  PlayerColor,
  TILE_COLORS,
  PLAYER_COLORS,
  TileType,
} from '../../types/game.types';
import {
  hexToPixel,
  hexCorners,
  vertexPixelFromId,
  edgePixelFromId,
  parseHexId,
  parseEdgeId,
} from '../hex/HexCoordinates';

interface SceneCallbacks {
  onVertexClick: (vertexId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onHexClick: (hexId: string) => void;
}

// =============================================
// Phaser Scene: Catan Board
// =============================================

export class CatanScene extends Phaser.Scene {
  private board: Board | null = null;
  private callbacks: SceneCallbacks;
  private hexSize = 72;
  private origin = { x: 0, y: 0 };

  // Graphics layers
  private bgLayer!: Phaser.GameObjects.Graphics;
  private hexLayer!: Phaser.GameObjects.Graphics;
  private roadLayer!: Phaser.GameObjects.Graphics;
  private buildingLayer!: Phaser.GameObjects.Graphics;
  private uiLayer!: Phaser.GameObjects.Graphics;
  private interactLayer!: Phaser.GameObjects.Container;

  // Highlight state
  private validVertices: Set<string> = new Set();
  private validEdges: Set<string> = new Set();
  private validHexes: Set<string> = new Set();
  private highlightMode: 'vertex' | 'edge' | 'hex' | null = null;

  // Floating resource labels
  private floatingTexts: Phaser.GameObjects.Text[] = [];

  constructor(callbacks: SceneCallbacks) {
    super({ key: 'CatanScene' });
    this.callbacks = callbacks;
  }

  preload(): void {
    // No external assets - all drawn procedurally
  }

  create(): void {
    const { width, height } = this.scale;
    this.origin = { x: width / 2, y: height / 2 };

    // Background: ocean
    this.bgLayer = this.add.graphics();
    this.bgLayer.fillStyle(0x1a4a7a, 1);
    this.bgLayer.fillRect(0, 0, width, height);

    this.hexLayer = this.add.graphics();
    this.roadLayer = this.add.graphics();
    this.buildingLayer = this.add.graphics();
    this.uiLayer = this.add.graphics();
    this.interactLayer = this.add.container(0, 0);

    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    const { width, height } = this.scale;
    this.origin = { x: width / 2, y: height / 2 };
    if (this.board) this.renderBoard(this.board);
  }

  updateBoard(board: Board): void {
    this.board = board;
    this.renderBoard(board);
  }

  private renderBoard(board: Board): void {
    this.hexLayer.clear();
    this.roadLayer.clear();
    this.buildingLayer.clear();
    this.uiLayer.clear();
    this.interactLayer.removeAll(true);

    this.drawWater();
    this.drawHexes(board);
    this.drawPorts(board);
    this.drawRoads(board);
    this.drawBuildings(board);
    this.drawRobber(board);

    if (this.highlightMode) {
      this.drawHighlights(board);
    }
  }

  private drawWater(): void {
    const g = this.bgLayer;
    g.clear();
    const { width, height } = this.scale;
    // Gradient ocean background
    g.fillGradientStyle(0x0a2850, 0x0a2850, 0x1e6091, 0x1e6091, 1);
    g.fillRect(0, 0, width, height);

    // Subtle wave pattern
    g.lineStyle(1, 0x2a5a9a, 0.3);
    for (let y = 0; y < height; y += 30) {
      g.beginPath();
      for (let x = 0; x <= width; x += 20) {
        const wy = y + Math.sin((x / 50) + Date.now() / 5000) * 3;
        if (x === 0) g.moveTo(x, wy);
        else g.lineTo(x, wy);
      }
      g.strokePath();
    }
  }

  private drawHexes(board: Board): void {
    const g = this.hexLayer;

    for (const hex of board.hexes) {
      const center = hexToPixel(hex.q, hex.r, this.hexSize, this.origin);
      const corners = hexCorners(center.x, center.y, this.hexSize - 2);

      // Hex fill
      const color = this.tileColorNum(hex.tileType);
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) g.lineTo(corners[i].x, corners[i].y);
      g.closePath();
      g.fillPath();

      // Hex border
      g.lineStyle(2, 0x000000, 0.4);
      g.strokePath();

      // Number token
      if (hex.numberToken !== null && !hex.hasRobber) {
        this.drawNumberToken(center.x, center.y, hex.numberToken);
      }
    }
  }

  private drawNumberToken(x: number, y: number, token: number): void {
    const g = this.uiLayer;
    const isRed = token === 6 || token === 8;
    const radius = 18;

    // White circle
    g.fillStyle(0xf5f5dc, 1);
    g.fillCircle(x, y, radius);
    g.lineStyle(1.5, isRed ? 0xcc2200 : 0x555555, 1);
    g.strokeCircle(x, y, radius);

    // Number text
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: token >= 10 ? '13px' : '15px',
      fontFamily: 'Georgia, serif',
      color: isRed ? '#cc2200' : '#222222',
      fontStyle: 'bold',
    };
    const text = this.add.text(x, y, String(token), style).setOrigin(0.5, 0.5);

    // Dots below number
    const dots = this.getDotCount(token);
    const dotSpacing = 5;
    for (let i = 0; i < dots; i++) {
      const dx = x - ((dots - 1) * dotSpacing) / 2 + i * dotSpacing;
      g.fillStyle(isRed ? 0xcc2200 : 0x444444, 1);
      g.fillCircle(dx, y + 9, 2);
    }
  }

  private getDotCount(token: number): number {
    const dotMap: Record<number, number> = {
      2: 1, 12: 1, 3: 2, 11: 2, 4: 3, 10: 3,
      5: 4, 9: 4, 6: 5, 8: 5,
    };
    return dotMap[token] ?? 0;
  }

  private drawPorts(board: Board): void {
    const g = this.uiLayer;

    for (const port of board.ports) {
      const hex = board.hexes.find((h) => h.id === port.hexId);
      if (!hex) continue;

      const center = hexToPixel(hex.q, hex.r, this.hexSize, this.origin);

      // Port icon
      const label = port.type === 'any' ? '3:1' : `2:1`;
      const icon = port.type === 'any' ? '⚓' : this.resourceIcon(port.type as string);

      const portText = this.add.text(center.x, center.y + 28, `${icon}\n${label}`, {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#00000088',
        padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0);
      this.interactLayer.add(portText);
    }
  }

  private resourceIcon(type: string): string {
    const icons: Record<string, string> = {
      wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️',
    };
    return icons[type] ?? '?';
  }

  private drawRoads(board: Board): void {
    const g = this.roadLayer;

    for (const edge of board.edges) {
      if (!edge.road) continue;

      const pixels = parseEdgeId(edge.id);
      if (!pixels) continue;

      const [h1, h2] = pixels;
      const p1 = hexToPixel(h1.q, h1.r, this.hexSize, this.origin);
      const p2 = hexToPixel(h2.q, h2.r, this.hexSize, this.origin);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      // Road as thick line from vertex to vertex through edge midpoint
      const v1 = vertexPixelFromId(edge.vertexIds[0], this.hexSize, this.origin);
      const v2 = vertexPixelFromId(edge.vertexIds[1], this.hexSize, this.origin);
      if (!v1 || !v2) continue;

      const color = this.playerColorNum(edge.road.color);
      g.lineStyle(7, color, 1);
      g.beginPath();
      g.moveTo(v1.x, v1.y);
      g.lineTo(v2.x, v2.y);
      g.strokePath();

      // Road outline
      g.lineStyle(9, 0x000000, 0.5);
      g.beginPath();
      g.moveTo(v1.x, v1.y);
      g.lineTo(v2.x, v2.y);
      // Draw behind
    }
  }

  private drawBuildings(board: Board): void {
    const g = this.buildingLayer;

    for (const vertex of board.vertices) {
      if (!vertex.building) continue;

      const pos = vertexPixelFromId(vertex.id, this.hexSize, this.origin);
      if (!pos) continue;

      const color = this.playerColorNum(vertex.building.color);

      if (vertex.building.type === 'settlement') {
        this.drawSettlement(g, pos.x, pos.y, color);
      } else {
        this.drawCity(g, pos.x, pos.y, color);
      }
    }
  }

  private drawSettlement(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    // House shape
    g.fillStyle(color, 1);
    g.fillRect(x - 8, y - 5, 16, 12);
    // Roof triangle
    g.fillTriangle(x - 10, y - 5, x + 10, y - 5, x, y - 17);
    g.lineStyle(1.5, 0x000000, 0.8);
    g.strokeRect(x - 8, y - 5, 16, 12);
    g.strokeTriangle(x - 10, y - 5, x + 10, y - 5, x, y - 17);
  }

  private drawCity(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    // Larger building with two towers
    g.fillStyle(color, 1);
    g.fillRect(x - 12, y - 6, 24, 14);
    // Left tower
    g.fillRect(x - 12, y - 14, 10, 8);
    // Right tower
    g.fillRect(x + 2, y - 10, 10, 4);
    // Battlements
    for (let i = 0; i < 3; i++) {
      g.fillRect(x - 12 + i * 3, y - 17, 2, 3);
    }
    g.lineStyle(1.5, 0x000000, 0.8);
    g.strokeRect(x - 12, y - 6, 24, 14);
    g.strokeRect(x - 12, y - 14, 10, 8);
    g.strokeRect(x + 2, y - 10, 10, 4);
  }

  private drawRobber(board: Board): void {
    const g = this.buildingLayer;
    const robberHex = board.hexes.find((h) => h.hasRobber);
    if (!robberHex) return;

    const center = hexToPixel(robberHex.q, robberHex.r, this.hexSize, this.origin);
    // Robber: dark pawn shape
    g.fillStyle(0x1a1a1a, 0.9);
    g.fillCircle(center.x - 20, center.y, 12); // head
    g.fillRect(center.x - 28, center.y + 8, 16, 20); // body
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeCircle(center.x - 20, center.y, 12);

    const robberLabel = this.add.text(center.x - 20, center.y - 30, '🏴', {
      fontSize: '20px',
    }).setOrigin(0.5);
    this.interactLayer.add(robberLabel);
  }

  // =============================================
  // Highlight system for valid moves
  // =============================================

  setHighlightMode(
    mode: 'vertex' | 'edge' | 'hex' | null,
    validIds: string[] = []
  ): void {
    this.highlightMode = mode;
    this.validVertices.clear();
    this.validEdges.clear();
    this.validHexes.clear();

    if (mode === 'vertex') validIds.forEach((id) => this.validVertices.add(id));
    if (mode === 'edge') validIds.forEach((id) => this.validEdges.add(id));
    if (mode === 'hex') validIds.forEach((id) => this.validHexes.add(id));

    if (this.board) this.renderBoard(this.board);
  }

  private drawHighlights(board: Board): void {
    if (this.highlightMode === 'vertex') {
      this.drawVertexHighlights(board);
    } else if (this.highlightMode === 'edge') {
      this.drawEdgeHighlights(board);
    } else if (this.highlightMode === 'hex') {
      this.drawHexHighlights(board);
    }
  }

  private drawVertexHighlights(board: Board): void {
    for (const vertex of board.vertices) {
      if (!this.validVertices.has(vertex.id)) continue;

      const pos = vertexPixelFromId(vertex.id, this.hexSize, this.origin);
      if (!pos) continue;

      // Pulsing circle button
      const circle = this.add.circle(pos.x, pos.y, 14, 0xffdd44, 0.85);
      circle.setInteractive({ cursor: 'pointer' });
      circle.on('pointerover', () => circle.setFillStyle(0xffffff, 1));
      circle.on('pointerout', () => circle.setFillStyle(0xffdd44, 0.85));
      circle.on('pointerdown', () => {
        this.callbacks.onVertexClick(vertex.id);
        this.setHighlightMode(null);
      });

      this.interactLayer.add(circle);

      // Pulsing animation
      this.tweens.add({
        targets: circle,
        scaleX: 1.3,
        scaleY: 1.3,
        yoyo: true,
        repeat: -1,
        duration: 600,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private drawEdgeHighlights(board: Board): void {
    for (const edge of board.edges) {
      if (!this.validEdges.has(edge.id)) continue;

      const v1 = vertexPixelFromId(edge.vertexIds[0], this.hexSize, this.origin);
      const v2 = vertexPixelFromId(edge.vertexIds[1], this.hexSize, this.origin);
      if (!v1 || !v2) continue;

      const mx = (v1.x + v2.x) / 2;
      const my = (v1.y + v2.y) / 2;

      const hitArea = this.add.rectangle(mx, my, 40, 14, 0x44ddff, 0.7);
      hitArea.setInteractive({ cursor: 'pointer' });
      hitArea.on('pointerover', () => hitArea.setFillStyle(0xffffff, 0.9));
      hitArea.on('pointerout', () => hitArea.setFillStyle(0x44ddff, 0.7));
      hitArea.on('pointerdown', () => {
        this.callbacks.onEdgeClick(edge.id);
        this.setHighlightMode(null);
      });

      // Rotate to match edge direction
      const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
      hitArea.setRotation(angle);

      this.interactLayer.add(hitArea);

      this.tweens.add({
        targets: hitArea,
        alpha: 0.4,
        yoyo: true,
        repeat: -1,
        duration: 700,
      });
    }
  }

  private drawHexHighlights(board: Board): void {
    const g = this.uiLayer;

    for (const hex of board.hexes) {
      if (!this.validHexes.has(hex.id)) continue;

      const center = hexToPixel(hex.q, hex.r, this.hexSize, this.origin);
      const corners = hexCorners(center.x, center.y, this.hexSize - 2);

      g.fillStyle(0xff0000, 0.3);
      g.beginPath();
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) g.lineTo(corners[i].x, corners[i].y);
      g.closePath();
      g.fillPath();

      // Clickable overlay
      const zone = this.add.zone(center.x, center.y, this.hexSize * 1.6, this.hexSize * 1.6);
      zone.setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => {
        this.callbacks.onHexClick(hex.id);
        this.setHighlightMode(null);
      });
      this.interactLayer.add(zone);
    }
  }

  // =============================================
  // Resource float animation
  // =============================================

  showResourceGain(playerId: string, board: Board, gains: Record<string, number>): void {
    // Find a settlement of this player and float text above it
    for (const vertex of board.vertices) {
      if (!vertex.building || vertex.building.playerId !== playerId) continue;

      const pos = vertexPixelFromId(vertex.id, this.hexSize, this.origin);
      if (!pos) continue;

      const entries = Object.entries(gains).filter(([, v]) => v > 0);
      entries.forEach(([res, amount], idx) => {
        const icon = this.resourceIcon(res);
        const text = this.add.text(
          pos.x + (idx - entries.length / 2) * 20,
          pos.y,
          `+${amount}${icon}`,
          { fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5, 1);

        this.tweens.add({
          targets: text,
          y: pos.y - 60,
          alpha: 0,
          duration: 1500,
          ease: 'Cubic.easeOut',
          onComplete: () => text.destroy(),
        });
      });
      break;
    }
  }

  // =============================================
  // Helpers
  // =============================================

  private tileColorNum(type: TileType): number {
    const colors: Record<TileType, number> = {
      wood: 0x4a6a2a,
      brick: 0xa84020,
      sheep: 0x6aaa2a,
      wheat: 0xb8881a,
      ore: 0x5a6a7a,
      desert: 0xc8a860,
    };
    return colors[type] ?? 0x888888;
  }

  private playerColorNum(color: PlayerColor): number {
    const colors: Record<PlayerColor, number> = {
      red: 0xef4444,
      blue: 0x3b82f6,
      green: 0x22c55e,
      orange: 0xf97316,
      white: 0xf1f5f9,
    };
    return colors[color] ?? 0xcccccc;
  }

  update(): void {
    // Subtle water animation - redraw bg occasionally
  }
}
