/**
 * Farcaster Profile Helper Functions
 * 
 * Fetches user profile images from Farcaster API
 * Uses multiple fallback methods for reliability
 */

export interface FarcasterProfile {
  pfpUrl: string | null;
  username: string | null;
  displayName: string | null;
  fid: number | null;
}

/**
 * Get Farcaster profile image by FID (Farcaster ID)
 * @param fid Farcaster ID
 * @returns Profile image URL or null
 */
export async function getFarcasterProfileByFID(fid: number): Promise<FarcasterProfile> {
  try {
    console.log(`[Farcaster] Fetching profile for FID: ${fid}`);
    
    // Try Neynar API first (more reliable, public endpoint)
    try {
      const neynarResponse = await fetch(`https://api.neynar.com/v1/farcaster/user?fid=${fid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache',
      });
      
      if (neynarResponse.ok) {
        const neynarData = await neynarResponse.json();
        console.log(`[Farcaster] Neynar API response for FID ${fid}:`, neynarData);
        
        if (neynarData?.result?.user) {
          const user = neynarData.result.user;
          const profile = {
            pfpUrl: user.pfp?.url || user.pfp_url || user.pfpUrl || null,
            username: user.username || null,
            displayName: user.display_name || user.displayName || null,
            fid: fid,
          };
          console.log(`[Farcaster] ✅ Neynar profile for FID ${fid}:`, profile);
          return profile;
        }
      }
    } catch (neynarError) {
      console.warn(`[Farcaster] Neynar API failed, trying Warpcast:`, neynarError);
    }
    
    // Fallback to Warpcast API
    const response = await fetch(`https://api.warpcast.com/v2/user-by-fid?fid=${fid}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      console.warn(`[Farcaster] Warpcast API failed for FID ${fid}:`, response.status, response.statusText);
      return { pfpUrl: null, username: null, displayName: null, fid: null };
    }
    
    const data = await response.json();
    console.log(`[Farcaster] Warpcast API response for FID ${fid}:`, data);
    
    if (data?.result?.user) {
      const user = data.result.user;
      const profile = {
        pfpUrl: user.pfp?.url || user.pfpUrl || null,
        username: user.username || null,
        displayName: user.displayName || null,
        fid: fid,
      };
      console.log(`[Farcaster] ✅ Warpcast profile for FID ${fid}:`, profile);
      return profile;
    }
    
    console.log(`[Farcaster] ❌ No user data found for FID ${fid}`);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  } catch (error) {
    console.error('[Farcaster] ❌ Error fetching profile by FID:', error);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  }
}

/**
 * Get Farcaster profile image by wallet address
 * @param address Wallet address
 * @returns Profile image URL or null
 */
export async function getFarcasterProfileByAddress(address: string): Promise<FarcasterProfile> {
  try {
    // Normalize address
    const normalizedAddress = address.toLowerCase().trim();
    
    console.log(`[Farcaster] 🔍 Fetching profile for address: ${normalizedAddress}`);
    
    // Try Neynar API first (more reliable for address lookup)
    try {
      const neynarResponse = await fetch(`https://api.neynar.com/v1/farcaster/user-by-verification?address=${normalizedAddress}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache',
      });
      
      if (neynarResponse.ok) {
        const neynarData = await neynarResponse.json();
        console.log(`[Farcaster] Neynar verifications response:`, neynarData);
        
        if (neynarData?.result?.user) {
          const user = neynarData.result.user;
          const fid = user.fid;
          console.log(`[Farcaster] ✅ Found FID ${fid} via Neynar for address ${normalizedAddress}`);
          const profile = await getFarcasterProfileByFID(fid);
          return profile;
        }
      }
    } catch (neynarError) {
      console.warn(`[Farcaster] Neynar lookup failed, trying Warpcast:`, neynarError);
    }
    
    // Fallback to Warpcast API
    const response = await fetch(`https://api.warpcast.com/v2/verifications?address=${normalizedAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      console.warn(`[Farcaster] ❌ Warpcast verifications failed for address ${normalizedAddress}:`, response.status, response.statusText);
      return { pfpUrl: null, username: null, displayName: null, fid: null };
    }
    
    const data = await response.json();
    console.log(`[Farcaster] Warpcast verifications response:`, data);
    
    // If we get a FID, use it to get the profile
    if (data?.result?.verifications && data.result.verifications.length > 0) {
      const fid = data.result.verifications[0].fid;
      console.log(`[Farcaster] ✅ Found FID ${fid} via Warpcast for address ${normalizedAddress}`);
      const profile = await getFarcasterProfileByFID(fid);
      return profile;
    }
    
    console.log(`[Farcaster] ❌ No verifications found for address ${normalizedAddress}`);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  } catch (error) {
    console.error('[Farcaster] ❌ Error fetching profile by address:', error);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  }
}

/**
 * Get current user's Farcaster profile from SDK context
 * @param sdkContext Farcaster SDK context object
 * @returns Profile image URL or null
 */
export async function getCurrentUserProfile(sdkContext: any): Promise<FarcasterProfile> {
  try {
    if (sdkContext?.user?.fid) {
      return await getFarcasterProfileByFID(sdkContext.user.fid);
    }
    
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  }
}

