# Quick Start - Commit-Reveal Game

## 🚀 5-Minute Setup

### 1. Deploy Contract

```bash
cd contracts
forge build
forge create src/JankenCommitReveal.sol:JankenCommitReveal \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

Save the contract address.

### 2. Setup Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Copy `supabase-migrations/001_create_matches_table.sql`
3. Run the SQL

### 3. Configure Environment

Add to `.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818
NEXT_PUBLIC_SUPABASE_URL=https://iophfhfnctqufqsmunyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 4. Use in Frontend

```typescript
import {
  createMatch,
  joinMatch,
  generateCommit,
  generateSecret,
  sendCommitTx,
  sendRevealTx,
  readMatchStatus,
  waitForTx,
} from '@/lib/matchCommitReveal';
import { parseEther } from 'viem';

// Create match
const betAmount = parseEther('0.001');
const tx1 = await createMatch(betAmount);
await waitForTx(tx1);

// Join match (player2)
const matchId = BigInt(1);
const tx2 = await joinMatch(matchId, betAmount);
await waitForTx(tx2);

// Commit move
const move = 0; // Rock
const secret = generateSecret();
const commitHash = generateCommit(move, secret);
localStorage.setItem(`secret_${matchId}`, secret);
const tx3 = await sendCommitTx(matchId, commitHash);
await waitForTx(tx3);

// Reveal move (after opponent commits)
const secret = localStorage.getItem(`secret_${matchId}`);
const tx4 = await sendRevealTx(matchId, move, secret);
await waitForTx(tx4);

// Check result
const match = await readMatchStatus(matchId);
if (match.status === 3) { // RESOLVED
  console.log('Winner:', match.winner);
}
```

## 📝 Move Values

- `0` = Rock 🪨
- `1` = Paper 📄
- `2` = Scissors ✂️

## 🔗 API Endpoints

```typescript
// Create match
POST /api/match/create
{ "player1_address": "0x...", "bet_amount": "1000000000000000" }

// Join match
POST /api/match/join
{ "match_id": 1, "player2_address": "0x..." }

// Get match
GET /api/match/:id

// Store commit
POST /api/match/commit
{ "match_id": 1, "player_address": "0x...", "commit_hash": "0x..." }

// Store reveal
POST /api/match/reveal
{ "match_id": 1, "player_address": "0x...", "move": 0, "secret": "..." }

// Sync on-chain state
POST /api/match/sync
{ "match_id": 1 } // optional
```

## ✅ Done!

Your commit-reveal game is ready to use!

For detailed documentation, see `COMMIT_REVEAL_GAME_GUIDE.md`.

