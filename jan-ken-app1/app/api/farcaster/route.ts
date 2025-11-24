import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Note: Edge runtime doesn't support some Node.js APIs that Neynar SDK needs
// Using Node.js runtime instead
export const runtime = 'nodejs';

// Initialize Neynar client with Configuration object
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS',
});
const neynarClient = new NeynarAPIClient(config);

/**
 * Farcaster Profile API Proxy
 * Uses official Neynar SDK for reliable Farcaster data access
 * This route bypasses CORS restrictions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get('fid');
    const address = searchParams.get('address');

    console.log('[API] 🔍 Farcaster request:', { fid, address });

    if (!fid && !address) {
      return NextResponse.json(
        { error: 'Missing fid or address parameter' },
        { status: 400 }
      );
    }

    // If we have FID, fetch directly using Neynar SDK
    if (fid) {
      const profile = await fetchProfileByFID(parseInt(fid));
      return NextResponse.json(profile);
    }

    // If we have address, lookup FID first using Neynar SDK
    if (address) {
      const profile = await fetchProfileByAddress(address);
      return NextResponse.json(profile);
    }

    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] ❌ Farcaster error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: String(error) },
      { status: 500 }
    );
  }
}

async function fetchProfileByFID(fid: number) {
  console.log(`[API] 🔍 Fetching profile for FID: ${fid}`);

  try {
    // Use Neynar SDK's fetchBulkUsers method
    // This is the official and most reliable way per Neynar docs
    const response = await neynarClient.fetchBulkUsers([fid]);
    
    console.log(`[API] 🌐 Neynar SDK response for FID ${fid}:`, response);

    if (response?.users && response.users.length > 0) {
      const user = response.users[0];
      const profile = {
        pfpUrl: user.pfp_url || null,
        username: user.username || null,
        displayName: user.display_name || null,
        fid: user.fid || fid,
      };
      console.log(`[API] ✅ Neynar SDK profile found:`, profile);
      return profile;
    }
  } catch (error) {
    console.error('[API] ❌ Neynar SDK failed for FID:', error);
  }

  console.log(`[API] ❌ No profile found for FID ${fid}`);
  return { pfpUrl: null, username: null, displayName: null, fid: null };
}

async function fetchProfileByAddress(address: string) {
  const normalizedAddress = address.toLowerCase().trim();
  console.log(`[API] 🔍 Fetching profile for address: ${normalizedAddress}`);

  try {
    // Use Neynar SDK's fetchBulkUsersByEthereumAddress method
    // This is the official way to lookup users by wallet address per Neynar docs
    const response = await neynarClient.fetchBulkUsersByEthereumAddress([normalizedAddress]);
    
    console.log(`[API] 🌐 Neynar SDK address lookup response:`, response);

    if (response && normalizedAddress in response) {
      const users = response[normalizedAddress];
      if (users && users.length > 0) {
        const user = users[0]; // Take the first user associated with this address
        const profile = {
          pfpUrl: user.pfp_url || null,
          username: user.username || null,
          displayName: user.display_name || null,
          fid: user.fid || null,
        };
        console.log(`[API] ✅ Neynar SDK profile found for address:`, profile);
        return profile;
      }
    }
  } catch (error) {
    console.error('[API] ❌ Neynar SDK address lookup failed:', error);
  }

  console.log(`[API] ❌ No verifications found for address ${normalizedAddress}`);
  return { pfpUrl: null, username: null, displayName: null, fid: null };
}

