# 🚀 Migration to Off-Chain Matchmaking - Complete Guide

## ✅ What's Been Done

### 1. Supabase Integration
- ✅ Supabase client installed and configured
- ✅ Database types and interfaces created
- ✅ Matchmaking service (off-chain) implemented
- ✅ Commit-reveal mechanism implemented

### 2. New Components
- ✅ `MatchmakingOffChain.tsx` - New off-chain matchmaking component
- ✅ Updated `app/page.tsx` to use new component

### 3. Services Created
- ✅ `lib/supabase.ts` - Supabase client and types
- ✅ `lib/matchmakingService.ts` - Off-chain matchmaking logic
- ✅ `lib/commitReveal.ts` - Commit-reveal mechanism

## 📋 What You Need to Do

### Step 1: Add Environment Variable

Add to `jan-ken-app1/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0
```

### Step 2: Create Database Schema

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/iophfhfnctqufqsmunyz/editor
2. Click **SQL Editor** → **New Query**
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click **Run** (or Ctrl+Enter)

**Option B: Using Supabase MCP**

If you have Supabase MCP configured in your IDE, you can execute the SQL through it.

### Step 3: Verify Tables

After running SQL, check **Table Editor** in Supabase Dashboard:
- ✅ `matchmaking_queue`
- ✅ `games`
- ✅ `commits`

### Step 4: Restart Dev Server

```bash
cd jan-ken-app1
npm run dev
```

## 🎯 New Architecture Flow

### 1. Matchmaking (Off-Chain)
```
User selects bet → joinQueue() → Supabase → Fast matching
```

### 2. Game Play (Commit-Reveal)
```
Match found → commitChoice() → Reveal → Determine winner
```

### 3. Results (On-Chain)
```
Winner determined → Write to blockchain → Distribute rewards
```

## 📊 Database Schema

### Tables Created:
1. **matchmaking_queue** - Players waiting to match
2. **games** - Game state and results
3. **commits** - Commit-reveal data

### Key Features:
- ✅ Fast off-chain matching (no blockchain wait)
- ✅ Commit-reveal for fair gameplay
- ✅ Row Level Security (RLS) enabled
- ✅ Indexes for performance

## 🔧 Testing

After setup, test the flow:

1. **Join Queue:**
   ```typescript
   import { joinQueue } from '@/lib/matchmakingService'
   
   await joinQueue({
     playerAddress: '0x...',
     playerFid: 12345,
     betLevel: 1,
     betAmount: BigInt('1500000000000000')
   })
   ```

2. **Check for Match:**
   ```typescript
   import { checkForMatch } from '@/lib/matchmakingService'
   
   const match = await checkForMatch('0x...')
   ```

3. **Commit Choice:**
   ```typescript
   import { commitChoice, generateSalt } from '@/lib/commitReveal'
   
   const salt = generateSalt()
   await commitChoice({
     gameId: 'game-...',
     playerAddress: '0x...',
     choice: 1, // Rock
     salt: salt
   })
   ```

## ⚠️ Important Notes

1. **Database must be set up first** - SQL schema must be run before using the app
2. **Environment variable required** - `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set
3. **Old Matchmaking component** - Still exists as `Matchmaking.tsx` (on-chain version)
4. **New component** - `MatchmakingOffChain.tsx` is now used in `app/page.tsx`

## 🐛 Troubleshooting

### "Missing Supabase key" error?
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after adding

### "Table doesn't exist" error?
- Run the SQL schema in Supabase Dashboard
- Verify tables exist in Table Editor

### "RLS policy violation" error?
- Check RLS policies in Supabase Dashboard
- Policies should allow public read/write for development

## 📝 Next Steps

1. ✅ Database schema setup
2. ✅ Environment variable added
3. ⏳ Test matchmaking flow
4. ⏳ Update GameBoard component for commit-reveal
5. ⏳ Update contract for final results only

