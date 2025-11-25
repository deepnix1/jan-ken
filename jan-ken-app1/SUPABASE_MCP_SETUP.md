# Supabase MCP Setup Guide

## 🚀 Quick Setup with MCP

### 1. Environment Variables

Add to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0
```

### 2. Database Schema Setup

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `iophfhfnctqufqsmunyz`
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of `supabase-schema.sql`
6. Click **Run** (or press Ctrl+Enter)

**Option B: Using Supabase MCP**

If you have Supabase MCP configured, you can use it to execute SQL:

```bash
# The MCP server should be configured in your mcp.json
# You can interact with it through your IDE
```

### 3. Verify Tables

After running the SQL, verify the tables exist:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see:
   - ✅ `matchmaking_queue`
   - ✅ `games`
   - ✅ `commits`

### 4. Test Connection

Test the connection from your app:

```typescript
import { supabase } from '@/lib/supabase'

// Test query
const { data, error } = await supabase
  .from('matchmaking_queue')
  .select('count')

console.log('Connection test:', { data, error })
```

## 📊 Database Schema Overview

### matchmaking_queue
Stores players waiting to be matched:
- `id` - UUID primary key
- `player_address` - Player's wallet address
- `player_fid` - Farcaster ID (optional)
- `bet_level` - Bet level (1-6)
- `bet_amount` - Bet amount as string
- `status` - 'waiting', 'matched', 'cancelled'
- `created_at` - Timestamp
- `matched_at` - When matched
- `matched_with` - Other player's address

### games
Stores game state:
- `id` - UUID primary key
- `game_id` - Unique game identifier
- `player1_address`, `player2_address` - Player addresses
- `player1_fid`, `player2_fid` - Farcaster IDs
- `bet_level`, `bet_amount` - Bet details
- `status` - 'pending', 'commit_phase', 'reveal_phase', 'finished', 'cancelled'
- `player1_commit`, `player2_commit` - Choice hashes
- `player1_reveal`, `player2_reveal` - Actual choices (1=Rock, 2=Paper, 3=Scissors)
- `winner` - Winner address
- `tx_hash` - Blockchain transaction hash

### commits
Stores commit-reveal data:
- `id` - UUID primary key
- `game_id` - Foreign key to games
- `player_address` - Player address
- `choice_hash` - Hash of choice + salt
- `salt` - Salt for verification
- `created_at`, `revealed_at` - Timestamps

## 🔒 Security (RLS)

Row Level Security is enabled on all tables with policies:
- ✅ Anyone can read (for checking queue status)
- ✅ Anyone can insert (for joining queue)
- ✅ Anyone can update (for game state changes)

For production, consider restricting updates to only game participants.

## 🧪 Testing

After setup, test the matchmaking:

```typescript
import { joinQueue, checkForMatch } from '@/lib/matchmakingService'

// Join queue
const queueId = await joinQueue({
  playerAddress: '0x...',
  playerFid: 12345,
  betLevel: 1,
  betAmount: BigInt('1500000000000000')
})

// Check for match
const match = await checkForMatch('0x...')
```

## 📝 Notes

- All addresses are stored in lowercase
- Bet amounts are stored as strings (BigInt serialization)
- FID (Farcaster ID) is optional but recommended
- Games are automatically created when 2 players match
- The MCP server URL is: `https://mcp.supabase.com/mcp?project_ref=iophfhfnctqufqsmunyz`

## 🔧 Troubleshooting

### Tables not created?
- Make sure you ran the SQL in Supabase Dashboard SQL Editor
- Check for SQL errors in the Supabase Dashboard

### Connection errors?
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Check that the project URL is correct: `https://iophfhfnctqufqsmunyz.supabase.co`

### RLS blocking queries?
- Check the RLS policies in Supabase Dashboard
- Policies should allow public read/write for development

