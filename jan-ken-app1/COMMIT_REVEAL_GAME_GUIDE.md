# Commit-Reveal Rock-Paper-Scissors Game - Complete Guide

## 📋 Overview

This is a complete implementation of a commit-reveal Rock-Paper-Scissors game with:
- **Smart Contract**: Handles escrow, commit/reveal, and automatic payouts
- **Backend API**: Supabase + Next.js API routes for match management
- **Client Utilities**: Frontend functions for commit/reveal operations
- **5% Fee**: Automatically deducted and sent to contract owner

## 🏗 Architecture

```
┌─────────────┐
│   Client    │ (Farcaster Mini App)
│  (Frontend) │
└──────┬──────┘
       │
       ├───► Smart Contract (On-chain)
       │    - createMatch()
       │    - joinMatch()
       │    - commitMove()
       │    - revealMove()
       │
       └───► Backend API (Supabase)
            - POST /api/match/create
            - POST /api/match/join
            - GET /api/match/:id
            - POST /api/match/commit
            - POST /api/match/reveal
            - POST /api/match/sync
```

## 📁 File Structure

```
jan-ken/
├── contracts/
│   └── src/
│       └── JankenCommitReveal.sol    # Smart contract
│
└── jan-ken-app1/
    ├── lib/
    │   ├── contractCommitReveal.ts   # Contract ABI & constants
    │   └── matchCommitReveal.ts      # Client utilities
    │
    ├── app/api/match/
    │   ├── create/route.ts           # Create match
    │   ├── join/route.ts              # Join match
    │   ├── [id]/route.ts              # Get match details
    │   ├── commit/route.ts            # Store commit
    │   ├── reveal/route.ts            # Store reveal
    │   └── sync/route.ts              # Sync on-chain state
    │
    └── supabase-migrations/
        └── 001_create_matches_table.sql  # Database schema
```

## 🚀 Deployment Steps

### 1. Deploy Smart Contract

```bash
cd contracts

# Compile
forge build

# Deploy (Base Sepolia)
forge create src/JankenCommitReveal.sol:JankenCommitReveal \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args

# Save contract address
export CONTRACT_ADDRESS=0x...
```

### 2. Setup Supabase

```bash
# Apply migration
cd jan-ken-app1
# Use Supabase MCP tool or run SQL directly in Supabase Dashboard
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase-migrations/001_create_matches_table.sql`
3. Run the SQL

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Deploy Frontend

```bash
cd jan-ken-app1
npm run build
npm run start
```

## 🎮 Game Flow

### Step 1: Create Match

**Frontend:**
```typescript
import { createMatch } from '@/lib/matchCommitReveal';

const betAmount = parseEther('0.001'); // 0.001 ETH
const txHash = await createMatch(betAmount);
await waitForTx(txHash);
```

**Backend (optional):**
```typescript
POST /api/match/create
{
  "player1_address": "0x...",
  "bet_amount": "1000000000000000"
}
```

### Step 2: Join Match

**Frontend:**
```typescript
import { joinMatch } from '@/lib/matchCommitReveal';

const matchId = BigInt(1);
const txHash = await joinMatch(matchId, betAmount);
await waitForTx(txHash);
```

**Backend:**
```typescript
POST /api/match/join
{
  "match_id": 1,
  "player2_address": "0x..."
}
```

### Step 3: Commit Move

**Frontend:**
```typescript
import { generateCommit, generateSecret, sendCommitTx } from '@/lib/matchCommitReveal';

const move = 0; // 0=Rock, 1=Paper, 2=Scissors
const secret = generateSecret();
const commitHash = generateCommit(move, secret);

// Store secret locally (localStorage or state)
localStorage.setItem(`match_${matchId}_secret`, secret);

// Send commit to contract
const txHash = await sendCommitTx(matchId, commitHash);
await waitForTx(txHash);

// Store commit in Supabase (optional, for tracking)
await fetch('/api/match/commit', {
  method: 'POST',
  body: JSON.stringify({
    match_id: matchId,
    player_address: address,
    commit_hash: commitHash,
  }),
});
```

### Step 4: Reveal Move

**Frontend:**
```typescript
import { sendRevealTx } from '@/lib/matchCommitReveal';

// Retrieve secret from localStorage
const secret = localStorage.getItem(`match_${matchId}_secret`);
const move = 0; // Your original move

// Reveal on-chain
const txHash = await sendRevealTx(matchId, move, secret);
await waitForTx(txHash);

// Store reveal in Supabase (optional)
await fetch('/api/match/reveal', {
  method: 'POST',
  body: JSON.stringify({
    match_id: matchId,
    player_address: address,
    move: move,
    secret: secret,
  }),
});
```

### Step 5: Check Result

**Frontend:**
```typescript
import { readMatchStatus } from '@/lib/matchCommitReveal';

const match = await readMatchStatus(matchId);
if (match.status === 3) { // RESOLVED
  console.log('Winner:', match.winner);
}
```

**Backend:**
```typescript
GET /api/match/:id
```

## 🔐 Security Features

### Smart Contract
- ✅ ReentrancyGuard protection
- ✅ Input validation
- ✅ Commit hash verification
- ✅ Only players can commit/reveal
- ✅ Automatic payout on resolution

### Backend
- ✅ Address validation
- ✅ Commit hash verification
- ✅ Move validation (0-2)
- ✅ Player authorization checks

## 📊 Match States

1. **WAITING (0)**: Match created, waiting for player2
2. **COMMITTED (1)**: Both players committed moves
3. **REVEALED (2)**: Both players revealed moves
4. **RESOLVED (3)**: Winner determined, funds distributed
5. **CANCELLED (4)**: Match cancelled (not implemented)

## 💰 Fee Mechanism

- **Fee**: 5% of total pool (2 × betAmount)
- **Calculation**: `fee = (betAmount * 2 * 500) / 10000`
- **Distribution**: Fee sent to contract owner
- **Prize**: `prize = (betAmount * 2) - fee`

## 🎯 Move Values

- **0** = Rock 🪨
- **1** = Paper 📄
- **2** = Scissors ✂️

## 🔄 Winner Logic

```typescript
// Rock (0) beats Scissors (2)
// Paper (1) beats Rock (0)
// Scissors (2) beats Paper (1)

if (move1 === move2) return DRAW;
if ((move1 === 0 && move2 === 2) ||
    (move1 === 1 && move2 === 0) ||
    (move1 === 2 && move2 === 1)) {
  return PLAYER1_WINS;
}
return PLAYER2_WINS;
```

## 📡 Events

Listen to contract events:

```typescript
import { watchContractEvent } from '@wagmi/core';

watchContractEvent(config, {
  address: CONTRACT_ADDRESS_COMMIT_REVEAL,
  abi: CONTRACT_ABI_COMMIT_REVEAL,
  eventName: 'MatchResolved',
  onLogs(logs) {
    logs.forEach((log) => {
      console.log('Match resolved:', log.args);
    });
  },
});
```

## 🔧 Admin Functions

### Withdraw Fees

```solidity
// Owner only
withdrawFees()
```

### Pause/Unpause

```solidity
// Owner only
pause()
unpause()
```

## 🧪 Testing

### Test Commit Hash Generation

```typescript
import { generateCommit, verifyCommit } from '@/lib/matchCommitReveal';

const move = 0;
const secret = 'my-secret';
const hash = generateCommit(move, secret);
const isValid = verifyCommit(move, secret, hash); // true
```

### Test Contract Interaction

```typescript
import { readMatchStatus } from '@/lib/matchCommitReveal';

const match = await readMatchStatus(BigInt(1));
console.log('Match:', match);
```

## 📝 Notes

1. **Secrets**: Store secrets securely (localStorage is fine for demo, use encrypted storage in production)
2. **Gas Costs**: Each transaction costs gas (commit + reveal = 2 transactions per player)
3. **Timing**: Players can reveal at any time after both commits
4. **Sync**: Use `/api/match/sync` to sync on-chain state to Supabase (call via cron or webhook)

## 🐛 Troubleshooting

### "Commit hash mismatch"
- Ensure you're using the same move and secret
- Check that secret is stored correctly

### "Match not found"
- Verify match_id is correct
- Check Supabase for match existence

### "Player not part of match"
- Verify player address matches match.player1 or match.player2

### "Match not in committed state"
- Ensure both players have committed
- Check match status in Supabase

## 📚 API Reference

See individual route files for detailed API documentation:
- `app/api/match/create/route.ts`
- `app/api/match/join/route.ts`
- `app/api/match/[id]/route.ts`
- `app/api/match/commit/route.ts`
- `app/api/match/reveal/route.ts`
- `app/api/match/sync/route.ts`

