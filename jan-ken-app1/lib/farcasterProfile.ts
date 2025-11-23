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
    // Farcaster API endpoint
    const response = await fetch(`https://api.warpcast.com/v2/user-by-fid?fid=${fid}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch Farcaster profile for FID ${fid}:`, response.status);
      return { pfpUrl: null, username: null, displayName: null };
    }
    
    const data = await response.json();
    
    if (data?.result?.user) {
      const user = data.result.user;
      return {
        pfpUrl: user.pfp?.url || user.pfpUrl || null,
        username: user.username || null,
        displayName: user.displayName || null,
      };
    }
    
    return { pfpUrl: null, username: null, displayName: null };
  } catch (error) {
    console.error('Error fetching Farcaster profile by FID:', error);
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
    // First, try to get FID from address using Farcaster API
    const response = await fetch(`https://api.warpcast.com/v2/verifications?address=${address.toLowerCase()}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch Farcaster profile for address ${address}:`, response.status);
      return { pfpUrl: null, username: null, displayName: null };
    }
    
    const data = await response.json();
    
    // If we get a FID, use it to get the profile
    if (data?.result?.verifications && data.result.verifications.length > 0) {
      const fid = data.result.verifications[0].fid;
      return await getFarcasterProfileByFID(fid);
    }
    
    return { pfpUrl: null, username: null, displayName: null };
  } catch (error) {
    console.error('Error fetching Farcaster profile by address:', error);
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

