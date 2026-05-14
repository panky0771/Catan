import { Howl, Howler } from 'howler';

// =============================================
// Sound Manager using Howler.js
// All sounds are generated programmatically via
// Web Audio API oscillators (no external files needed)
// =============================================

type SoundName = 'dice' | 'build' | 'card' | 'trade' | 'victory' | 'robber' | 'notification';

class SoundManager {
  private enabled = true;
  private volume = 0.5;
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
    }
    return this.ctx;
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  toggle(): void { this.enabled = !this.enabled; }
  setVolume(v: number): void { this.volume = Math.max(0, Math.min(1, v)); }
  isEnabled(): boolean { return this.enabled; }

  private beep(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    attack = 0.01,
    decay = 0.1
  ): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.1);
    } catch {}
  }

  play(name: SoundName): void {
    switch (name) {
      case 'dice':
        // Rattling dice sound
        this.beep(200, 0.05, 'square');
        setTimeout(() => this.beep(300, 0.05, 'square'), 60);
        setTimeout(() => this.beep(250, 0.08, 'square'), 120);
        setTimeout(() => this.beep(400, 0.1, 'sine'), 200);
        break;
      case 'build':
        this.beep(523, 0.15, 'sine'); // C
        setTimeout(() => this.beep(659, 0.15, 'sine'), 120); // E
        setTimeout(() => this.beep(784, 0.2, 'sine'), 240); // G
        break;
      case 'card':
        this.beep(440, 0.1, 'sine');
        setTimeout(() => this.beep(880, 0.15, 'sine'), 80);
        break;
      case 'trade':
        this.beep(330, 0.12, 'sine');
        setTimeout(() => this.beep(440, 0.12, 'sine'), 100);
        setTimeout(() => this.beep(550, 0.15, 'sine'), 200);
        break;
      case 'victory':
        // Fanfare
        [0, 100, 200, 350, 500].forEach((delay, i) => {
          const notes = [523, 659, 784, 1047, 1175];
          setTimeout(() => this.beep(notes[i], 0.3, 'sine'), delay);
        });
        break;
      case 'robber':
        this.beep(220, 0.2, 'sawtooth');
        setTimeout(() => this.beep(180, 0.3, 'sawtooth'), 150);
        break;
      case 'notification':
        this.beep(660, 0.1, 'sine');
        setTimeout(() => this.beep(880, 0.1, 'sine'), 120);
        break;
    }
  }
}

export const soundManager = new SoundManager();
