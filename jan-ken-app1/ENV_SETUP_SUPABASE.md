# Environment Variables Setup - Supabase

## Required Environment Variables

Add these to your `.env.local` file in `jan-ken-app1/`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0

# Existing variables (keep these)
NEXT_PUBLIC_CDP_API_KEY_ID=your_cdp_key_id
NEXT_PUBLIC_CDP_API_KEY_SECRET=your_cdp_key_secret
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

## Setup Steps

1. **Create/Update `.env.local` file:**
   ```bash
   cd jan-ken-app1
   # Create or edit .env.local
   ```

2. **Add the Supabase key:**
   - Copy the `NEXT_PUBLIC_SUPABASE_ANON_KEY` value above
   - Paste it into your `.env.local` file

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Verification

After setting up, test the connection:

```typescript
import { supabase } from '@/lib/supabase'

// Test query
const { data, error } = await supabase
  .from('matchmaking_queue')
  .select('count')

if (error) {
  console.error('Supabase connection error:', error)
} else {
  console.log('✅ Supabase connected successfully!')
}
```

## Important Notes

- The key starts with `NEXT_PUBLIC_` so it's available in the browser
- This is the anon key (public key) - safe to expose in frontend
- Never commit `.env.local` to git (it's in `.gitignore`)




