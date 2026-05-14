import Phaser from 'phaser';
import { CatanScene } from './CatanScene';
import { Board } from '../../types/game.types';

interface GameCallbacks {
  onVertexClick: (vertexId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onHexClick: (hexId: string) => void;
}

// =============================================
// PhaserGame: manages the Phaser instance
// =============================================

export class PhaserGame {
  private game: Phaser.Game | null = null;
  private scene: CatanScene | null = null;
  private callbacks: GameCallbacks;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
  }

  init(container: HTMLElement): void {
    if (this.game) this.destroy();

    this.scene = new CatanScene({
      onVertexClick: this.callbacks.onVertexClick,
      onEdgeClick: this.callbacks.onEdgeClick,
      onHexClick: this.callbacks.onHexClick,
    });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth || 800,
      height: container.clientHeight || 700,
      backgroundColor: '#0a2850',
      scene: this.scene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    };

    this.game = new Phaser.Game(config);
  }

  updateBoard(board: Board): void {
    this.scene?.updateBoard(board);
  }

  setHighlightMode(mode: 'vertex' | 'edge' | 'hex' | null, validIds?: string[]): void {
    this.scene?.setHighlightMode(mode, validIds);
  }

  showResourceGain(playerId: string, board: Board, gains: Record<string, number>): void {
    this.scene?.showResourceGain(playerId, board, gains);
  }

  resize(): void {
    if (!this.game) return;
    const parent = this.game.canvas.parentElement;
    if (parent) {
      this.game.scale.resize(parent.clientWidth, parent.clientHeight);
    }
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    this.scene = null;
  }
}
