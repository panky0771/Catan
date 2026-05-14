# Catan Online — Multiplayer Strategy Board Game

A complete, production-quality multiplayer implementation of Catan playable in the browser. Supports 3–5 players with real-time gameplay over Socket.IO.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Phaser.js, Tailwind CSS, Framer Motion, Zustand |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (Supabase compatible) |
| Auth | JWT |
| Deployment | Vercel (frontend), Render/Railway (backend), Supabase (DB) |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)

### 1. Clone & install dependencies

```bash
# Install server dependencies
cd server && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database setup

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name catan-postgres \
  -e POSTGRES_DB=catan \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=catanpassword \
  -p 5432:5432 \
  postgres:15-alpine

# Apply schema
psql postgresql://postgres:catanpassword@localhost:5432/catan -f database/schema.sql
```

### 3. Environment variables

```bash
# Server
cp .env.example server/.env
# Edit server/.env with your values

# Frontend
cp .env.example frontend/.env
# Edit frontend/.env with your values
```

**Minimum required variables:**

```env
# server/.env
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:catanpassword@localhost:5432/catan
JWT_SECRET=your_secret_key_here

# frontend/.env
VITE_SERVER_URL=http://localhost:3001
```

### 4. Start development servers

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Docker (Full Stack)

```bash
# Start everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Deployment Guide

### Frontend → Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set build command: `cd frontend && npm run build`
4. Set output directory: `frontend/dist`
5. Add environment variables:
   ```
   VITE_SERVER_URL=https://your-server.onrender.com
   ```

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set:
   - Build command: `cd server && npm install && npm run build`
   - Start command: `cd server && npm start`
4. Add environment variables from `.env.example`

### Database → Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `database/schema.sql`
3. Copy the connection string to `DATABASE_URL`

---

## Game Rules

### Setup Phase
- Players alternate placing 2 settlements and 2 roads
- Round 2 is in reverse order
- Second settlement grants starting resources from adjacent tiles

### Main Game
- Roll dice → Collect resources (or move robber on 7)
- Build roads, settlements, cities
- Buy and play development cards
- Trade with players or maritime ports

### Building Costs
| Structure | Wood | Brick | Sheep | Wheat | Ore |
|-----------|------|-------|-------|-------|-----|
| Road | 1 | 1 | — | — | — |
| Settlement | 1 | 1 | 1 | 1 | — |
| City | — | — | — | 2 | 3 |
| Dev Card | — | — | 1 | 1 | 1 |

### Victory Points
| Achievement | Points |
|------------|--------|
| Settlement | 1 VP |
| City | 2 VP |
| Longest Road (≥5) | 2 VP |
| Largest Army (≥3 knights) | 2 VP |
| Victory Point card | 1 VP |

### Development Cards (25 total)
- Knight ×14 — Move robber, steal resource
- Victory Point ×5 — Hidden +1 VP
- Road Building ×2 — Place 2 free roads
- Year of Plenty ×2 — Take any 2 resources
- Monopoly ×2 — Take all of one resource from others

---

## Socket.IO Event Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `auth` | `{ token }` | Authenticate socket |
| `lobby:create` | `{ settings? }` | Create new room |
| `lobby:join` | `{ roomCode }` | Join existing room |
| `lobby:leave` | — | Leave current room |
| `lobby:ready` | `{ isReady }` | Toggle ready status |
| `lobby:start` | — | Host starts game |
| `lobby:settings_update` | `{ settings }` | Host updates settings |
| `lobby:kick` | `{ playerId }` | Host kicks player |
| `game:action` | `{ roomCode, type, payload }` | Send game action |
| `game:reconnect` | `{ roomCode }` | Reconnect to game |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `auth:success` | `{ userId, username }` | Auth confirmed |
| `lobby:update` | `LobbyState` | Lobby changed |
| `game:state` | `ClientGameState` | Full game state update |
| `game:event` | `{ type, message, ... }` | Game log event |
| `game:action_error` | `{ message, actionType }` | Action rejected |
| `game:ended` | `{ winner, finalState }` | Game finished |

---

## Project Structure

```
Catan/
├── frontend/                   # React + Phaser frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/           # GameBoard, panels, dice, trade
│   │   │   └── lobby/          # LobbyRoom, GameSettings
│   │   ├── game/
│   │   │   ├── hex/            # Hex coordinate math
│   │   │   └── board/          # Phaser scene + game manager
│   │   ├── pages/              # LandingPage, LobbyPage, GamePage
│   │   ├── socket/             # Socket.IO client
│   │   ├── store/              # Zustand stores (game, lobby, auth, ui)
│   │   ├── hooks/              # useSocket (event subscriptions)
│   │   └── types/              # TypeScript types
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vercel.json
│
├── server/                     # Node.js + Express backend
│   └── src/
│       ├── game-engine/        # Complete Catan rule engine
│       │   ├── HexGrid.ts      # Board construction, hex math
│       │   ├── MapGenerator.ts # Random board generation
│       │   ├── ResourceEngine.ts
│       │   ├── BuildingEngine.ts
│       │   ├── RobberEngine.ts
│       │   ├── CardEngine.ts
│       │   ├── TradeEngine.ts
│       │   ├── LongestRoadEngine.ts
│       │   ├── VictoryEngine.ts
│       │   └── GameEngine.ts   # Main orchestrator
│       ├── rooms/              # GameRoom + RoomManager
│       ├── socket/             # Socket.IO event handler
│       ├── routes/             # REST API (auth)
│       ├── middleware/         # JWT auth, rate limiting
│       └── types/              # TypeScript types
│
├── database/
│   └── schema.sql              # PostgreSQL schema
│
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Authentication

```
POST /api/auth/register
Body: { username, email, password }
Returns: { token, user }

POST /api/auth/login
Body: { email, password }
Returns: { token, user }

POST /api/auth/guest
Body: { username? }
Returns: { token, user }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Returns: user object

GET /api/auth/leaderboard
Returns: array of ranked players
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with TypeScript
4. Test with 3+ browser tabs
5. Submit a pull request

---

## License

MIT License — Free for personal and commercial use.

---

Built with ❤️ using React, Phaser.js, Socket.IO, and TypeScript.
