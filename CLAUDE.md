# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Server (Node.js + Express + Socket.IO)
```bash
cd server
npm install
npm run dev      # ts-node with nodemon hot-reload → http://localhost:3001
npm run build    # tsc → dist/
npm start        # runs dist/server.js (production)
npm run lint     # eslint src --ext .ts
```

### Frontend (React + Vite + Phaser)
```bash
cd frontend
npm install
npm run dev      # vite dev server → http://localhost:5173
npm run build    # tsc && vite build → dist/
npm run preview  # preview production build
npm run lint     # eslint src --ext .ts,.tsx
```

### Full stack with Docker
```bash
docker-compose up -d          # starts postgres + server + frontend
docker-compose logs -f        # tail logs
docker-compose down
```

### Database
```bash
# Apply schema (requires running PostgreSQL)
psql postgresql://postgres:catanpassword@localhost:5432/catan -f database/schema.sql
```

## Environment Setup

Copy and fill in env files before running:
```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
```

Minimum required in `server/.env`:
```
DATABASE_URL=postgresql://postgres:catanpassword@localhost:5432/catan
JWT_SECRET=<any long random string>
CLIENT_URL=http://localhost:5173
```

Minimum required in `frontend/.env`:
```
VITE_SERVER_URL=http://localhost:3001
```

## Architecture Overview

This is a **server-authoritative** multiplayer game. The server owns all game logic; the frontend only renders state and sends action requests.

### Data Flow

```
Browser → socketClient.sendAction() → socket event "game:action"
       → SocketHandler → GameRoom.processAction()
       → GameEngine.handleAction() → mutates GameState
       → broadcast game:state (filtered per-player) to all sockets
       → useSocketEvents() hook → Zustand gameStore → React re-render + Phaser redraw
```

### Server-Side Layers

**`server/src/game-engine/`** — Pure game logic, no I/O:
- `HexGrid.ts` — builds the 19-hex board using axial coordinates `(q, r)`. Vertex IDs are deterministic strings formed by sorting the 3 hex IDs that meet at a vertex (e.g., `v_h_0_0|h_1_0|h_1_-1`). Edge IDs are 2-hex pairs. This ID scheme is used everywhere in board lookups.
- `MapGenerator.ts` — shuffles tile types and number tokens onto the board; assigns port types.
- `GameEngine.ts` — the single orchestrator class. Its `processAction()` method dispatches to `handleSetupAction()` or specific action handlers. Maintains all mutable `GameState`. Produces `ClientGameState` via `getClientState(playerId)` which strips other players' cards and dev cards.
- Each sub-engine (`ResourceEngine`, `BuildingEngine`, `RobberEngine`, `CardEngine`, `TradeEngine`, `LongestRoadEngine`, `VictoryEngine`) is a set of pure functions that take and mutate game state references.

**`server/src/rooms/`**:
- `GameRoom.ts` — owns one `GameEngine` instance plus the member list. Transitions through `waiting → starting → active → ended`. Handles reconnect/disconnect by toggling `isConnected` rather than removing players during active games.
- `RoomManager.ts` — singleton `roomManager` that maps `roomCode → GameRoom` and `userId → roomCode`. Rooms are cleaned up when empty or stale (>30 min waiting).

**`server/src/socket/SocketHandler.ts`** — all Socket.IO event registration in one place. After every `game:action`, it broadcasts the per-player-filtered state to every socket in the room.

**`server/src/routes/authRoutes.ts`** — REST endpoints for register/login/guest/me/leaderboard. JWT tokens are issued here and verified in `authMiddleware.ts`. Sockets also require auth via the `auth` event before they can create/join rooms.

### Frontend-Side Layers

**Phaser (game rendering) lives completely outside React:**
- `frontend/src/game/board/CatanScene.ts` — Phaser 3 `Scene` subclass. Receives the `Board` object via `updateBoard()` and redraws all graphics layers (hex tiles, roads, buildings, robber). Exposes `setHighlightMode(mode, validIds)` to animate valid placement targets with interactive click zones.
- `frontend/src/game/board/PhaserGame.ts` — manages the `Phaser.Game` instance lifecycle. Initialized once in `GameBoard.tsx` via `useEffect` and destroyed on unmount.
- `frontend/src/game/hex/HexCoordinates.ts` — client-side mirror of server hex math: axial→pixel conversions, vertex/edge pixel positions parsed from the same ID format the server uses.

**React UI:**
- `frontend/src/hooks/useSocket.ts` (`useSocketEvents`) — one hook that subscribes to all socket events and pushes updates into Zustand stores. Must be called once per page (called in `LobbyPage` and `GamePage`).
- `frontend/src/store/gameStore.ts` — holds `ClientGameState`, `buildMode` (what the player is currently placing), and wraps every game action as an async method that calls `socketClient.sendAction()`.
- `frontend/src/store/authStore.ts` — persists `token` to localStorage; calls `socketClient.connect()` and `socketClient.authenticate()` on login.
- `frontend/src/socket/socketClient.ts` — singleton `SocketClient` class. All socket communication goes through this; it re-authenticates on reconnect automatically.

**Build mode pattern** (how click-to-place works):
1. Player clicks a build button → `gameStore.setBuildMode({ type: 'road' })`.
2. `GameBoard.tsx` detects the new `buildMode` and calls `phaserGame.setHighlightMode('edge', validEdgeIds)`.
3. `CatanScene` renders clickable highlight zones on valid edges; click fires `callbacks.onEdgeClick(edgeId)`.
4. `GameBoard.tsx` callback calls `gameStore.buildRoad(edgeId)` → server action → state broadcast.

### ID Conventions

| Entity | ID format | Example |
|--------|-----------|---------|
| Hex | `h_<q>_<r>` | `h_0_0`, `h_-1_2` |
| Vertex | `v_<hex1>\|<hex2>\|<hex3>` (sorted) | `v_h_-1_0\|h_0_-1\|h_0_0` |
| Edge | `e_<hex1>\|<hex2>` (sorted) | `e_h_0_0\|h_1_0` |

### State Privacy

`GameEngine.getClientState(playerId)` is called individually for each socket before broadcast. It replaces other players' `resources` and `devCards` with `null` and uses `publicVictoryPoints` (excludes hidden VP cards) for other players. The requesting player's full data is in `myPlayer`.

### Game Phase FSM

```
waiting → setup (setupRound 1: forward, round 2: backward) → playing → ended
```

`TurnPhase` within `playing`:
```
pre_roll → [7: discard → move_robber] → post_roll → (end turn) → pre_roll
                                      ↘ [robber targets exist: move_robber → steal → post_roll]
```

The Knight dev card can be played during `pre_roll` or `post_roll`; it temporarily forces `move_robber`.

### Type Duplication

`server/src/types/game.types.ts` and `frontend/src/types/game.types.ts` are intentionally kept in sync manually (no shared package). When changing a type, update both files.
