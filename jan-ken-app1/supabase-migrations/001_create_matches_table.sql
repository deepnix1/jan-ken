-- Create matches table for commit-reveal Rock-Paper-Scissors game
-- This table tracks match state in Supabase (off-chain)

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT UNIQUE NOT NULL, -- On-chain match ID
    player1_address TEXT NOT NULL,
    player2_address TEXT,
    bet_amount TEXT NOT NULL, -- Stored as string to handle BigInt
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, committed, revealed, resolved, cancelled
    commit1_hash TEXT, -- Hash of player1's move + secret
    commit2_hash TEXT, -- Hash of player2's move + secret
    move1 INTEGER, -- 0=Rock, 1=Paper, 2=Scissors
    move2 INTEGER,
    secret1 TEXT, -- Stored temporarily for reveal (should be encrypted in production)
    secret2 TEXT,
    winner_address TEXT,
    tx_hash TEXT, -- Transaction hash when match resolved on-chain
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_match_id ON matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_address);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_address);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (adjust based on your auth requirements)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read matches (adjust if you need auth)
CREATE POLICY "Matches are viewable by everyone" ON matches
    FOR SELECT USING (true);

-- Allow authenticated users to insert matches
CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own matches
CREATE POLICY "Users can update their matches" ON matches
    FOR UPDATE USING (
        player1_address = current_setting('app.current_user_address', true) OR
        player2_address = current_setting('app.current_user_address', true)
    );

-- Comments
COMMENT ON TABLE matches IS 'Stores match state for commit-reveal Rock-Paper-Scissors game';
COMMENT ON COLUMN matches.match_id IS 'On-chain match ID from smart contract';
COMMENT ON COLUMN matches.bet_amount IS 'Bet amount in wei (stored as string)';
COMMENT ON COLUMN matches.status IS 'Match status: waiting, committed, revealed, resolved, cancelled';
COMMENT ON COLUMN matches.move1 IS 'Player1 move: 0=Rock, 1=Paper, 2=Scissors';
COMMENT ON COLUMN matches.move2 IS 'Player2 move: 0=Rock, 1=Paper, 2=Scissors';




