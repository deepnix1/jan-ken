/**
 * Farcaster Profile Helper Functions
 * 
 * Fetches user profile images from Farcaster API
 */

export interface FarcasterProfile {
  pfpUrl: string | null;
  username: string | null;
  displayName: string | null;
}

/**
 * Get Farcaster profile image by FID (Farcaster ID)
 * @param fid Farcaster ID
 * @returns Profile image URL or null
 */
export async function getFarcasterProfileByFID(fid: number): Promise<FarcasterProfile> {
  try {
    console.log(`[Farcaster] Fetching profile for FID: ${fid}`);
    
    // Farcaster API endpoint
    const response = await fetch(`https://api.warpcast.com/v2/user-by-fid?fid=${fid}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache', // Disable cache to get fresh data
    });
    
    if (!response.ok) {
      console.warn(`[Farcaster] Failed to fetch profile for FID ${fid}:`, response.status, response.statusText);
      return { pfpUrl: null, username: null, displayName: null };
    }
    
    const data = await response.json();
    console.log(`[Farcaster] User profile response for FID ${fid}:`, data);
    
    if (data?.result?.user) {
      const user = data.result.user;
      const profile = {
        pfpUrl: user.pfp?.url || user.pfpUrl || null,
        username: user.username || null,
        displayName: user.displayName || null,
      };
      console.log(`[Farcaster] Extracted profile for FID ${fid}:`, profile);
      return profile;
    }
    
    console.log(`[Farcaster] No user data found for FID ${fid}`);
    return { pfpUrl: null, username: null, displayName: null };
  } catch (error) {
    console.error('[Farcaster] Error fetching profile by FID:', error);
    return { pfpUrl: null, username: null, displayName: null };
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
    
    console.log(`[Farcaster] Fetching profile for address: ${normalizedAddress}`);
    
    // First, try to get FID from address using Farcaster API
    const response = await fetch(`https://api.warpcast.com/v2/verifications?address=${normalizedAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache', // Disable cache to get fresh data
    });
    
    if (!response.ok) {
      console.warn(`[Farcaster] Failed to fetch verifications for address ${normalizedAddress}:`, response.status, response.statusText);
      return { pfpUrl: null, username: null, displayName: null };
    }
    
    const data = await response.json();
    console.log(`[Farcaster] Verifications response:`, data);
    
    // If we get a FID, use it to get the profile
    if (data?.result?.verifications && data.result.verifications.length > 0) {
      const fid = data.result.verifications[0].fid;
      console.log(`[Farcaster] Found FID ${fid} for address ${normalizedAddress}`);
      const profile = await getFarcasterProfileByFID(fid);
      console.log(`[Farcaster] Profile data:`, profile);
      return profile;
    }
    
    console.log(`[Farcaster] No verifications found for address ${normalizedAddress}`);
    return { pfpUrl: null, username: null, displayName: null };
  } catch (error) {
    console.error('[Farcaster] Error fetching profile by address:', error);
    return { pfpUrl: null, username: null, displayName: null };
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
    
    return { pfpUrl: null, username: null, displayName: null };
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return { pfpUrl: null, username: null, displayName: null };
  }
}

