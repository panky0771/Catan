-- Catan Multiplayer Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================
-- Users
-- =============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  avatar_url VARCHAR(500),
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =============================
-- Player Statistics
-- =============================
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  total_vp_earned INTEGER DEFAULT 0,
  total_settlements_built INTEGER DEFAULT 0,
  total_cities_built INTEGER DEFAULT 0,
  total_roads_built INTEGER DEFAULT 0,
  total_dev_cards_played INTEGER DEFAULT 0,
  longest_road_count INTEGER DEFAULT 0,
  largest_army_count INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================
-- Game Rooms
-- =============================
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(8) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'active', 'ended')),
  max_players INTEGER DEFAULT 4 CHECK (max_players BETWEEN 3 AND 5),
  current_players INTEGER DEFAULT 1,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);

-- =============================
-- Room Members
-- =============================
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  player_color VARCHAR(20),
  seat_index INTEGER,
  is_ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_members_room ON room_members(room_id);

-- =============================
-- Active Matches (live game state)
-- =============================
CREATE TABLE IF NOT EXISTS active_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  game_state JSONB NOT NULL DEFAULT '{}',
  turn_number INTEGER DEFAULT 0,
  current_player_id UUID REFERENCES users(id),
  phase VARCHAR(30) DEFAULT 'setup',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id)
);

-- =============================
-- Match History
-- =============================
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES game_rooms(id),
  winner_id UUID REFERENCES users(id),
  duration_seconds INTEGER,
  turn_count INTEGER,
  final_state JSONB,
  settings JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_history_winner ON match_history(winner_id);
CREATE INDEX idx_match_history_ended ON match_history(ended_at DESC);

-- =============================
-- Match Players (match participants + final stats)
-- =============================
CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES match_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  player_color VARCHAR(20),
  final_vp INTEGER DEFAULT 0,
  final_resources INTEGER DEFAULT 0,
  settlements_built INTEGER DEFAULT 0,
  cities_built INTEGER DEFAULT 0,
  roads_built INTEGER DEFAULT 0,
  dev_cards_played INTEGER DEFAULT 0,
  knights_played INTEGER DEFAULT 0,
  had_longest_road BOOLEAN DEFAULT FALSE,
  had_largest_army BOOLEAN DEFAULT FALSE,
  placement INTEGER, -- 1st, 2nd, 3rd etc
  elo_change INTEGER DEFAULT 0,
  UNIQUE(match_id, user_id)
);

-- =============================
-- Rankings / Leaderboard
-- =============================
CREATE VIEW leaderboard AS
  SELECT
    u.id,
    u.username,
    u.avatar_url,
    ps.elo_rating,
    ps.games_played,
    ps.games_won,
    CASE WHEN ps.games_played > 0
      THEN ROUND(ps.games_won::NUMERIC / ps.games_played * 100, 1)
      ELSE 0
    END AS win_rate,
    ps.largest_army_count,
    ps.longest_road_count,
    RANK() OVER (ORDER BY ps.elo_rating DESC) AS rank
  FROM users u
  JOIN player_stats ps ON u.id = ps.user_id
  WHERE u.is_active = TRUE AND ps.games_played > 0
  ORDER BY ps.elo_rating DESC;

-- =============================
-- Update Triggers
-- =============================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_rooms_updated_at BEFORE UPDATE ON game_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER active_matches_updated_at BEFORE UPDATE ON active_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER player_stats_updated_at BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================
-- Auto-create player_stats on user insert
-- =============================
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_player_stats AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();
