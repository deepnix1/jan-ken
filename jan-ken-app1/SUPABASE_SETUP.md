# Supabase Setup Guide

## 🚀 Quick Setup

### 1. Environment Variables

Add to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0
```

### 2. Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `iophfhfnctqufqsmunyz`
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase-schema.sql`
5. Click **Run**

### 3. Verify Tables

After running the SQL, you should see these tables:
- `matchmaking_queue` - Queue for players waiting to match
- `games` - Active and finished games
- `commits` - Commit-reveal data for fair gameplay

## 📊 Database Schema

### matchmaking_queue
- Stores players waiting to be matched
- Status: `waiting`, `matched`, `cancelled`
- Automatically matches players with same `bet_level`

### games
- Stores game state
- Status: `pending`, `commit_phase`, `reveal_phase`, `finished`, `cancelled`
- Tracks commits, reveals, and winner

### commits
- Stores commit-reveal hashes
- Links to games via `game_id`
- Salt stored for verification

## 🔒 Security

Row Level Security (RLS) is enabled on all tables. Current policies allow:
- ✅ Anyone can read (for checking queue status)
- ✅ Anyone can insert (for joining queue)
- ✅ Anyone can update (for game state changes)

For production, you may want to restrict updates to only game participants.

## 🧪 Testing

After setup, test the matchmaking:

```typescript
import { joinQueue } from '@/lib/matchmakingService'

// Join queue
await joinQueue({
  playerAddress: '0x...',
  playerFid: 12345,
  betLevel: 1,
  betAmount: BigInt('1500000000000000')
})
```

## 📝 Notes

- All addresses are stored in lowercase
- Bet amounts are stored as strings (BigInt serialization)
- FID (Farcaster ID) is optional but recommended
- Games are automatically created when 2 players match

