import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Farcaster Profile API Proxy
 * This route bypasses CORS restrictions and provides a reliable way to fetch Farcaster profiles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get('fid');
    const address = searchParams.get('address');

    console.log('[API] Farcaster request:', { fid, address });

    if (!fid && !address) {
      return NextResponse.json(
        { error: 'Missing fid or address parameter' },
        { status: 400 }
      );
    }

    // If we have FID, fetch directly
    if (fid) {
      const profile = await fetchProfileByFID(parseInt(fid));
      return NextResponse.json(profile);
    }

    // If we have address, lookup FID first
    if (address) {
      const profile = await fetchProfileByAddress(address);
      return NextResponse.json(profile);
    }

    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Farcaster error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: String(error) },
      { status: 500 }
    );
  }
}

async function fetchProfileByFID(fid: number) {
  console.log(`[API] Fetching profile for FID: ${fid}`);

  // Try Warpcast API (most reliable)
  try {
    const response = await fetch(`https://api.warpcast.com/v2/user-by-fid?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Warpcast response for FID ${fid}:`, data);

      if (data?.result?.user) {
        const user = data.result.user;
        const profile = {
          pfpUrl: user.pfp?.url || user.pfpUrl || null,
          username: user.username || null,
          displayName: user.displayName || user.display_name || null,
          fid: fid,
        };
        console.log(`[API] ✅ Profile found:`, profile);
        return profile;
      }
    }
  } catch (error) {
    console.error('[API] Warpcast failed:', error);
  }

  // Try Neynar Hub API (fallback)
  try {
    const response = await fetch(`https://hub-api.neynar.com/v1/userDataByFid?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Neynar Hub response for FID ${fid}:`, data);

      if (data?.messages) {
        // Parse Neynar Hub messages to extract profile data
        let pfpUrl = null;
        let username = null;
        let displayName = null;

        data.messages.forEach((msg: any) => {
          if (msg.data?.userDataBody?.type === 'USER_DATA_TYPE_PFP') {
            pfpUrl = msg.data.userDataBody.value;
          }
          if (msg.data?.userDataBody?.type === 'USER_DATA_TYPE_USERNAME') {
            username = msg.data.userDataBody.value;
          }
          if (msg.data?.userDataBody?.type === 'USER_DATA_TYPE_DISPLAY') {
            displayName = msg.data.userDataBody.value;
          }
        });

        if (pfpUrl || username || displayName) {
          const profile = { pfpUrl, username, displayName, fid };
          console.log(`[API] ✅ Neynar Hub profile found:`, profile);
          return profile;
        }
      }
    }
  } catch (error) {
    console.error('[API] Neynar Hub failed:', error);
  }

  console.log(`[API] ❌ No profile found for FID ${fid}`);
  return { pfpUrl: null, username: null, displayName: null, fid: null };
}

async function fetchProfileByAddress(address: string) {
  const normalizedAddress = address.toLowerCase().trim();
  console.log(`[API] Fetching profile for address: ${normalizedAddress}`);

  // Try Warpcast verifications API
  try {
    const response = await fetch(`https://api.warpcast.com/v2/verifications?address=${normalizedAddress}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Warpcast verifications response:`, data);

      if (data?.result?.verifications && data.result.verifications.length > 0) {
        const fid = data.result.verifications[0].fid;
        console.log(`[API] ✅ Found FID ${fid} for address ${normalizedAddress}`);
        return await fetchProfileByFID(fid);
      }
    }
  } catch (error) {
    console.error('[API] Warpcast verifications failed:', error);
  }

  // Try Neynar Hub API for verifications
  try {
    const response = await fetch(`https://hub-api.neynar.com/v1/verificationsByFid?fid=1`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Neynar Hub verifications response:`, data);

      // Search through verifications for matching address
      if (data?.messages) {
        for (const msg of data.messages) {
          const verificationAddress = msg.data?.verificationAddAddressBody?.address;
          if (verificationAddress?.toLowerCase() === normalizedAddress) {
            const fid = msg.data?.fid;
            if (fid) {
              console.log(`[API] ✅ Found FID ${fid} for address ${normalizedAddress}`);
              return await fetchProfileByFID(fid);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[API] Neynar Hub verifications failed:', error);
  }

  console.log(`[API] ❌ No verifications found for address ${normalizedAddress}`);
  return { pfpUrl: null, username: null, displayName: null, fid: null };
}

