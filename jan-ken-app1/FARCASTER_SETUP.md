# 🎮 Jan-Ken Farcaster Mini App Setup

This project uses **Neynar SDK** for Farcaster integration, following [official best practices](https://docs.neynar.com/docs/getting-started-with-neynar).

## 🚀 Quick Start

### 1. Get Neynar API Key

1. Go to [neynar.com](https://neynar.com)
2. Create an account
3. Get your API key from the dashboard
4. For development, you can use the demo key: `NEYNAR_API_DOCS`

### 2. Environment Setup

Create a `.env.local` file (or use Vercel environment variables):

```bash
# Neynar API Key
NEYNAR_API_KEY=your_api_key_here

# For development, you can use:
NEYNAR_API_KEY=NEYNAR_API_DOCS
```

### 3. Farcaster Mini App Configuration

Your app is already configured as a Farcaster Mini App:

- ✅ Manifest: `public/.well-known/farcaster.json`
- ✅ Metadata: Proper `fc:miniapp` tags in `app/layout.tsx`
- ✅ Account Association: FID 283779 verified

## 🏗️ Architecture

### Server-Side API Route

**File:** `app/api/farcaster/route.ts`

Uses official **Neynar SDK** for reliable data access:

```typescript
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

const neynarClient = new NeynarAPIClient(
  process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
);

// Fetch user by FID
const response = await neynarClient.fetchBulkUsers([fid]);

// Fetch user by wallet address
const response = await neynarClient.fetchBulkUsersByEthereumAddress([address]);
```

### Client-Side Helper

**File:** `lib/farcasterProfile.ts`

Simple client functions that call the server API:

```typescript
// By FID
const profile = await getFarcasterProfileByFID(12345);

// By wallet address
const profile = await getFarcasterProfileByAddress('0x1234...');
```

### Response Format

```typescript
{
  pfpUrl: "https://...",      // Profile picture URL
  username: "username",       // Farcaster username
  displayName: "Display Name", // Display name
  fid: 12345                  // Farcaster ID
}
```

## 📊 Usage in Components

See `components/MatchFoundAnimation.tsx` and `components/GameBoard.tsx` for examples:

```typescript
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';

// Fetch profile
const [profile, setProfile] = useState<FarcasterProfile | null>(null);

useEffect(() => {
  if (playerAddress) {
    getFarcasterProfileByAddress(playerAddress).then(setProfile);
  }
}, [playerAddress]);

// Display profile
{profile?.pfpUrl ? (
  <Image src={profile.pfpUrl} alt={profile.username || 'Player'} />
) : (
  <div>Fallback Avatar</div>
)}
```

## 🔍 Debugging

### Console Logs

Client-side logs:
```
[Farcaster] 🌐 Fetching via Neynar proxy: { fid: 12345 }
[Farcaster] ✅ Neynar API success: { pfpUrl: "...", ... }
```

Server-side logs (in Vercel):
```
[API] 🔍 Farcaster request: { fid: "12345" }
[API] 🌐 Neynar SDK response: { users: [...] }
[API] ✅ Neynar SDK profile found: { pfpUrl: "...", ... }
```

### Debug Panel

The app includes a built-in debug panel (🔧 button):
- Shows Farcaster profile loading status
- Displays detailed error messages
- Copy functionality for bug reports

### Common Issues

**❌ Profile pictures not loading:**
- Check console for `[Farcaster]` and `[API]` logs
- Verify Neynar API key is set correctly
- Ensure the wallet address has a linked Farcaster account

**❌ "Server API error (500)":**
- Check Vercel logs for detailed error
- Verify Neynar SDK is installed: `npm ls @neynar/nodejs-sdk`

**⚠️ Using demo key:**
- Demo key works for development
- For production, get your own key from [neynar.com](https://neynar.com)
- Rate limits apply to demo key

## 📚 Resources

- [Neynar Docs](https://docs.neynar.com)
- [Neynar SDK](https://github.com/neynarxyz/nodejs-sdk)
- [Farcaster Mini Apps](https://miniapps.farcaster.xyz)
- [Neynar Slack](https://neynar.com/slack)

## 🎯 Best Practices (Implemented)

✅ Use official Neynar SDK on server-side  
✅ Proxy API calls through server route (bypasses CORS)  
✅ Proper error handling and fallbacks  
✅ Caching disabled for real-time data  
✅ Type-safe interfaces  
✅ Comprehensive logging  
✅ User-friendly error messages  
✅ Demo key for easy development  

## 🚢 Deployment

### Vercel Environment Variables

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add: `NEYNAR_API_KEY` = your API key
3. Redeploy

### Testing

1. **Local:** `npm run dev`
2. **Production:** Deploy to Vercel
3. **As Mini App:** Share link in Farcaster client

---

**Built with ❤️ using Neynar SDK**





