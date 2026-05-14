import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  SOCKET_EVENTS,
  GameEventPayload,
} from '../types/socket.types';
import { GameAction } from '../types/game.types';
import { roomManager } from '../rooms/RoomManager';
import { verifyToken } from '../middleware/authMiddleware';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// =============================================
// Main Socket.IO Handler
// =============================================

export function setupSocketHandlers(io: GameServer): void {
  // Heartbeat broadcast
  setInterval(() => {
    io.emit('ping');
  }, 25000);

  // Cleanup stale rooms
  setInterval(() => {
    roomManager.cleanup();
  }, 5 * 60 * 1000);

  io.on('connection', (socket: GameSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // =============================================
    // Auth
    // =============================================
    socket.on('auth', ({ token }, callback) => {
      const payload = verifyToken(token);
      if (!payload) {
        callback?.('Invalid token');
        socket.emit('auth:error', { message: 'Invalid or expired token' });
        return;
      }

      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.currentRoom = null;
      callback?.();
      socket.emit('auth:success', { userId: payload.userId, username: payload.username });

      // Attempt reconnect to any active game
      const existingRoom = roomManager.getRoomByUser(payload.userId);
      if (existingRoom && existingRoom.isActive()) {
        handleReconnect(socket, io, existingRoom.roomCode);
      }

      console.log(`Authenticated: ${payload.username} (${payload.userId})`);
    });

    // =============================================
    // Lobby: Create
    // =============================================
    socket.on('lobby:create', ({ settings }, callback) => {
      if (!socket.data.userId) {
        callback('Not authenticated');
        return;
      }

      // Leave existing room first
      if (socket.data.currentRoom) {
        leaveCurrentRoom(socket, io);
      }

      const room = roomManager.createRoom(socket.data.userId, settings);
      room.addMember(socket.data.userId, socket.id, socket.data.username);

      socket.join(room.roomCode);
      socket.data.currentRoom = room.roomCode;

      callback(null, room.roomCode);
      broadcastLobbyUpdate(io, room.roomCode);
      console.log(`${socket.data.username} created room ${room.roomCode}`);
    });

    // =============================================
    // Lobby: Join
    // =============================================
    socket.on('lobby:join', ({ roomCode }, callback) => {
      if (!socket.data.userId) {
        callback('Not authenticated');
        return;
      }

      if (socket.data.currentRoom) {
        leaveCurrentRoom(socket, io);
      }

      const { room, error } = roomManager.joinRoom(
        roomCode.toUpperCase(),
        socket.data.userId,
        socket.id,
        socket.data.username
      );

      if (error || !room) {
        callback(error ?? 'Failed to join room');
        return;
      }

      socket.join(room.roomCode);
      socket.data.currentRoom = room.roomCode;

      callback(null, room.getLobbyState());
      broadcastLobbyUpdate(io, room.roomCode);
      console.log(`${socket.data.username} joined room ${room.roomCode}`);
    });

    // =============================================
    // Lobby: Leave
    // =============================================
    socket.on('lobby:leave', () => {
      leaveCurrentRoom(socket, io);
    });

    // =============================================
    // Lobby: Ready
    // =============================================
    socket.on('lobby:ready', ({ isReady }) => {
      const room = getSocketRoom(socket);
      if (!room) return;
      room.setReady(socket.data.userId, isReady);
      broadcastLobbyUpdate(io, room.roomCode);
    });

    // =============================================
    // Lobby: Settings Update
    // =============================================
    socket.on('lobby:settings_update', ({ settings }) => {
      const room = getSocketRoom(socket);
      if (!room) return;
      const err = room.updateSettings(socket.data.userId, settings);
      if (!err) broadcastLobbyUpdate(io, room.roomCode);
    });

    // =============================================
    // Lobby: Kick
    // =============================================
    socket.on('lobby:kick', ({ playerId }) => {
      const room = getSocketRoom(socket);
      if (!room) return;
      const err = room.kickMember(socket.data.userId, playerId);
      if (!err) {
        broadcastLobbyUpdate(io, room.roomCode);
        // Notify kicked player
        const kickedSocketId = room.getSocketId(playerId);
        if (kickedSocketId) {
          io.to(kickedSocketId).emit('error', { message: 'You were kicked from the room' });
        }
      }
    });

    // =============================================
    // Lobby: Start Game
    // =============================================
    socket.on('lobby:start', (callback) => {
      const room = getSocketRoom(socket);
      if (!room) {
        callback('Not in a room');
        return;
      }

      const canStart = room.canStart(socket.data.userId);
      if (canStart) {
        callback(canStart);
        return;
      }

      const err = room.startGame();
      if (err) {
        callback(err);
        return;
      }

      callback(null);
      broadcastLobbyUpdate(io, room.roomCode);

      // Send initial game state to all players
      for (const sockId of room.getSocketIds()) {
        const targetSocket = io.sockets.sockets.get(sockId);
        if (targetSocket) {
          const playerId = targetSocket.data.userId;
          const state = room.getGameState(playerId);
          if (state) targetSocket.emit('game:state', state);
        }
      }

      broadcastGameEvent(io, room.roomCode, {
        type: 'GAME_STARTED',
        message: 'The game has begun! Good luck!',
        timestamp: Date.now(),
      });

      console.log(`Game started in room ${room.roomCode}`);
    });

    // =============================================
    // Game: Action
    // =============================================
    socket.on('game:action', ({ roomCode, ...action }: { roomCode: string } & GameAction, callback) => {
      if (!socket.data.userId) {
        callback?.('Not authenticated');
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        callback?.('Room not found');
        return;
      }

      // Ensure playerId matches authenticated user
      const fullAction: GameAction = { ...action, playerId: socket.data.userId };
      const result = room.processAction(fullAction);

      if (!result.success) {
        socket.emit('game:action_error', {
          message: result.error ?? 'Action failed',
          actionType: action.type,
        });
        callback?.(result.error ?? 'Action failed');
        return;
      }

      callback?.(null);

      // Broadcast events
      for (const msg of result.events) {
        broadcastGameEvent(io, room.roomCode, {
          type: action.type,
          message: msg,
          playerId: socket.data.userId,
          playerName: socket.data.username,
          timestamp: Date.now(),
        });
      }

      // Broadcast updated state to all players
      broadcastGameState(io, room);

      // Check if game ended
      if (room.isEnded()) {
        const finalState = room.getGameState();
        if (finalState) {
          io.to(room.roomCode).emit('game:ended', {
            winner: finalState.winner ?? '',
            finalState,
          });
        }
      }
    });

    // =============================================
    // Game: Reconnect
    // =============================================
    socket.on('game:reconnect', ({ roomCode }) => {
      handleReconnect(socket, io, roomCode);
    });

    // =============================================
    // Pong (heartbeat response)
    // =============================================
    socket.on('pong', () => {
      const room = getSocketRoom(socket);
      if (room) room.heartbeat(socket.data.userId);
    });

    // =============================================
    // Disconnect
    // =============================================
    socket.on('disconnect', () => {
      const room = getSocketRoom(socket);
      if (room) {
        room.removeMember(socket.data.userId);
        broadcastLobbyUpdate(io, room.roomCode);

        if (room.isActive()) {
          broadcastGameEvent(io, room.roomCode, {
            type: 'PLAYER_DISCONNECTED',
            message: `${socket.data.username} disconnected`,
            playerId: socket.data.userId,
            playerName: socket.data.username,
            timestamp: Date.now(),
          });
          broadcastGameState(io, room);
        }
      }
      console.log(`Socket disconnected: ${socket.id} (${socket.data.username ?? 'unauthenticated'})`);
    });
  });
}

// =============================================
// Helpers
// =============================================

function getSocketRoom(socket: GameSocket) {
  const code = socket.data.currentRoom;
  if (!code) return null;
  return roomManager.getRoom(code);
}

function leaveCurrentRoom(socket: GameSocket, io: GameServer): void {
  const code = socket.data.currentRoom;
  if (!code) return;

  const room = roomManager.leaveRoom(socket.data.userId);
  socket.leave(code);
  socket.data.currentRoom = null;

  if (room) {
    broadcastLobbyUpdate(io, room.roomCode);
  }
}

function handleReconnect(socket: GameSocket, io: GameServer, roomCode: string): void {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.hasMember(socket.data.userId)) return;

  room.reconnectPlayer(socket.data.userId, socket.id);
  socket.join(roomCode);
  socket.data.currentRoom = roomCode;

  const state = room.getGameState(socket.data.userId);
  if (state) socket.emit('game:state', state);

  broadcastGameEvent(io, roomCode, {
    type: 'PLAYER_RECONNECTED',
    message: `${socket.data.username} reconnected`,
    playerId: socket.data.userId,
    playerName: socket.data.username,
    timestamp: Date.now(),
  });

  console.log(`${socket.data.username} reconnected to room ${roomCode}`);
}

function broadcastLobbyUpdate(io: GameServer, roomCode: string): void {
  const room = roomManager.getRoom(roomCode);
  if (room) {
    io.to(roomCode).emit('lobby:update', room.getLobbyState());
  }
}

function broadcastGameState(io: GameServer, room: InstanceType<typeof import('../rooms/GameRoom').GameRoom>): void {
  for (const sockId of room.getSocketIds()) {
    const targetSocket = io.sockets.sockets.get(sockId);
    if (targetSocket) {
      const state = room.getGameState(targetSocket.data.userId);
      if (state) targetSocket.emit('game:state', state);
    }
  }
}

function broadcastGameEvent(io: GameServer, roomCode: string, event: GameEventPayload): void {
  io.to(roomCode).emit('game:event', event);
}
