import { GameRoom } from './GameRoom';
import { GameSettings } from '../types/game.types';

// =============================================
// RoomManager: singleton managing all game rooms
// =============================================

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private userRoomMap: Map<string, string> = new Map(); // userId -> roomCode

  createRoom(hostId: string, settings?: Partial<GameSettings>): GameRoom {
    const room = new GameRoom(hostId, settings);
    this.rooms.set(room.roomCode, room);
    this.userRoomMap.set(hostId, room.roomCode);
    return room;
  }

  getRoom(roomCode: string): GameRoom | null {
    return this.rooms.get(roomCode.toUpperCase()) ?? null;
  }

  getRoomByUser(userId: string): GameRoom | null {
    const code = this.userRoomMap.get(userId);
    return code ? this.rooms.get(code) ?? null : null;
  }

  joinRoom(
    roomCode: string,
    userId: string,
    socketId: string,
    username: string,
    avatarUrl?: string
  ): { room: GameRoom | null; error: string | null } {
    const room = this.getRoom(roomCode);
    if (!room) return { room: null, error: 'Room not found' };

    const err = room.addMember(userId, socketId, username, avatarUrl);
    if (err) return { room: null, error: err };

    this.userRoomMap.set(userId, roomCode);
    return { room, error: null };
  }

  leaveRoom(userId: string): GameRoom | null {
    const room = this.getRoomByUser(userId);
    if (!room) return null;

    room.removeMember(userId);
    this.userRoomMap.delete(userId);

    // Clean up empty waiting rooms
    if (room.getMemberCount() === 0 && !room.isActive()) {
      this.rooms.delete(room.roomCode);
    }

    return room;
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      this.rooms.delete(roomCode);
    }
  }

  // Periodic cleanup of stale rooms
  cleanup(): void {
    for (const [code, room] of this.rooms) {
      if (room.isStale()) {
        this.rooms.delete(code);
      }
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}

// Singleton
export const roomManager = new RoomManager();
