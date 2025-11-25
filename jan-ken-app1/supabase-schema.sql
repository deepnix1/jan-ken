-- Supabase Database Schema for Jan-Ken Matchmaking System
-- Run this SQL in your Supabase SQL Editor

-- Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_address TEXT NOT NULL,
  player_fid INTEGER,
  bet_level INTEGER NOT NULL,
  bet_amount TEXT NOT NULL, -- BigInt as string
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  matched_at TIMESTAMP WITH TIME ZONE,
  matched_with TEXT, -- Other player's address
  UNIQUE(player_address, status) WHERE status = 'waiting'
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL UNIQUE,
  player1_address TEXT NOT NULL,
  player1_fid INTEGER,
  player2_address TEXT NOT NULL,
  player2_fid INTEGER,
  bet_level INTEGER NOT NULL,
  bet_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'commit_phase', 'reveal_phase', 'finished', 'cancelled')),
  player1_commit TEXT, -- Hash of player1's choice
  player2_commit TEXT, -- Hash of player2's choice
  player1_reveal INTEGER, -- 1=Rock, 2=Paper, 3=Scissors
  player2_reveal INTEGER,
  winner TEXT, -- Address of winner
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  tx_hash TEXT, -- Blockchain transaction hash
  CHECK (player1_address != player2_address)
);

-- Commits Table (for commit-reveal mechanism)
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  player_address TEXT NOT NULL,
  choice_hash TEXT NOT NULL,
  salt TEXT, -- Salt used for hashing (revealed later)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revealed_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_bet_level_status ON matchmaking_queue(bet_level, status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_player_address ON matchmaking_queue(player_address);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_address);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_address);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_commits_game_id ON commits(game_id);
CREATE INDEX IF NOT EXISTS idx_commits_player_address ON commits(player_address);

-- Row Level Security (RLS) Policies
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read matchmaking queue (for checking queue status)
CREATE POLICY "Anyone can read matchmaking queue"
  ON matchmaking_queue FOR SELECT
  USING (true);

-- Policy: Anyone can insert into matchmaking queue
CREATE POLICY "Anyone can join queue"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update their own queue entry
CREATE POLICY "Players can update their queue entry"
  ON matchmaking_queue FOR UPDATE
  USING (player_address = current_setting('request.jwt.claims', true)::json->>'address' OR true); -- Allow all for now

-- Policy: Anyone can read games
CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

-- Policy: Anyone can insert games
CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update games
CREATE POLICY "Anyone can update games"
  ON games FOR UPDATE
  USING (true);

-- Policy: Anyone can read commits
CREATE POLICY "Anyone can read commits"
  ON commits FOR SELECT
  USING (true);

-- Policy: Anyone can insert commits
CREATE POLICY "Anyone can create commits"
  ON commits FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update commits
CREATE POLICY "Anyone can update commits"
  ON commits FOR UPDATE
  USING (true);

