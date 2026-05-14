import { GameEngine } from '../game-engine/GameEngine';
import { GameSettings, GameAction, ClientGameState } from '../types/game.types';
import { LobbyState, LobbyPlayer } from '../types/socket.types';
import { v4 as uuidv4 } from 'uuid';

export interface RoomMember {
  userId: string;
  socketId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  avatarUrl?: string;
  joinedAt: number;
}

// =============================================
// GameRoom: manages lobby + active game
// =============================================

export class GameRoom {
  readonly roomCode: string;
  readonly hostId: string;
  private members: Map<string, RoomMember> = new Map();
  private settings: GameSettings;
  private engine: GameEngine | null = null;
  private status: 'waiting' | 'starting' | 'active' | 'ended' = 'waiting';
  private createdAt: number;

  // Heartbeat tracking
  private lastActivity: Map<string, number> = new Map();

  constructor(hostId: string, settings: Partial<GameSettings> = {}) {
    this.roomCode = this.generateCode();
    this.hostId = hostId;
    this.createdAt = Date.now();
    this.settings = {
      maxPlayers: 4,
      victoryPointsToWin: 10,
      turnTimerSeconds: 120,
      allowBots: false,
      enableFogOfWar: false,
      ...settings,
    };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  addMember(userId: string, socketId: string, username: string, avatarUrl?: string): string | null {
    if (this.status !== 'waiting') return 'Game already started';
    if (this.members.size >= this.settings.maxPlayers) return 'Room is full';
    if (this.members.has(userId)) {
      // Reconnect
      const member = this.members.get(userId)!;
      member.socketId = socketId;
      member.isConnected = true;
      this.lastActivity.set(userId, Date.now());
      return null;
    }

    this.members.set(userId, {
      userId,
      socketId,
      username,
      isHost: userId === this.hostId,
      isReady: false,
      isConnected: true,
      avatarUrl,
      joinedAt: Date.now(),
    });
    this.lastActivity.set(userId, Date.now());
    return null;
  }

  removeMember(userId: string): void {
    if (this.status === 'waiting') {
      this.members.delete(userId);
    } else {
      // In active game, just mark disconnected
      const member = this.members.get(userId);
      if (member) member.isConnected = false;
      this.engine?.disconnectPlayer(userId);
    }
  }

  setReady(userId: string, ready: boolean): void {
    const member = this.members.get(userId);
    if (member && userId !== this.hostId) member.isReady = ready;
  }

  updateSettings(userId: string, settings: Partial<GameSettings>): string | null {
    if (userId !== this.hostId) return 'Only the host can change settings';
    if (this.status !== 'waiting') return 'Cannot change settings after game starts';
    this.settings = { ...this.settings, ...settings };
    return null;
  }

  kickMember(hostUserId: string, targetUserId: string): string | null {
    if (hostUserId !== this.hostId) return 'Only host can kick players';
    if (targetUserId === this.hostId) return 'Cannot kick the host';
    this.members.delete(targetUserId);
    return null;
  }

  canStart(userId: string): string | null {
    if (userId !== this.hostId) return 'Only the host can start the game';
    if (this.members.size < 3) return 'Need at least 3 players';
    const nonHostReady = Array.from(this.members.values()).filter(
      (m) => !m.isHost && !m.isReady
    );
    if (nonHostReady.length > 0) return 'All players must be ready';
    return null;
  }

  startGame(): string | null {
    if (this.status !== 'waiting') return 'Game already started';

    this.engine = new GameEngine(this.settings);
    this.status = 'starting';

    for (const member of this.members.values()) {
      const err = this.engine.addPlayer(member.userId, member.socketId, member.username);
      if (err) return err;
    }

    const startErr = this.engine.startGame();
    if (startErr) return startErr;

    this.status = 'active';
    return null;
  }

  processAction(action: GameAction): { success: boolean; error?: string; events: string[] } {
    if (!this.engine) return { success: false, error: 'Game not started', events: [] };
    return this.engine.processAction(action);
  }

  getGameState(forPlayerId?: string): ClientGameState | null {
    if (!this.engine) return null;
    return this.engine.getClientState(forPlayerId);
  }

  getLobbyState(): LobbyState {
    const players: LobbyPlayer[] = Array.from(this.members.values()).map((m) => ({
      id: m.userId,
      username: m.username,
      color: null,
      isReady: m.isReady || m.isHost,
      isHost: m.isHost,
      isConnected: m.isConnected,
      avatarUrl: m.avatarUrl,
    }));

    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      players,
      settings: this.settings,
      status: this.status as 'waiting' | 'starting' | 'active',
      maxPlayers: this.settings.maxPlayers,
    };
  }

  reconnectPlayer(userId: string, socketId: string): void {
    const member = this.members.get(userId);
    if (member) {
      member.socketId = socketId;
      member.isConnected = true;
    }
    this.engine?.reconnectPlayer(userId, socketId);
    this.lastActivity.set(userId, Date.now());
  }

  getSocketIds(): string[] {
    return Array.from(this.members.values())
      .filter((m) => m.isConnected)
      .map((m) => m.socketId);
  }

  getSocketId(userId: string): string | null {
    return this.members.get(userId)?.socketId ?? null;
  }

  getMemberCount(): number {
    return this.members.size;
  }

  hasMember(userId: string): boolean {
    return this.members.has(userId);
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isEnded(): boolean {
    return this.engine?.isGameOver() ?? false;
  }

  getStatus(): string {
    return this.status;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  heartbeat(userId: string): void {
    this.lastActivity.set(userId, Date.now());
  }

  isStale(): boolean {
    // Room is stale if waiting for > 30 min with no activity
    if (this.status === 'waiting') {
      return Date.now() - this.createdAt > 30 * 60 * 1000;
    }
    return false;
  }
}
