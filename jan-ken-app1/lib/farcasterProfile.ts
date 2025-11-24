/**
 * Farcaster Profile Helper Functions
 * 
 * Fetches user profile images via our API route (bypasses CORS)
 * Server-side proxy provides reliable access to Farcaster data
 */

export interface FarcasterProfile {
  pfpUrl: string | null;
  username: string | null;
  displayName: string | null;
  fid: number | null;
}

/**
 * Fetch profile using our server-side API route
 * This bypasses CORS and provides more reliable access
 */
async function fetchViaProxy(params: { fid?: number; address?: string }): Promise<FarcasterProfile> {
  try {
    const queryParams = new URLSearchParams();
    if (params.fid) queryParams.set('fid', params.fid.toString());
    if (params.address) queryParams.set('address', params.address);

    console.log(`[Farcaster] 🌐 Fetching via proxy API:`, params);

    const response = await fetch(`/api/farcaster?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Farcaster] ❌ Proxy API error:', response.status, errorData);
      return { pfpUrl: null, username: null, displayName: null, fid: null };
    }

    const data = await response.json();
    console.log('[Farcaster] ✅ Proxy API response:', data);
    return data;
  } catch (error) {
    console.error('[Farcaster] ❌ Proxy API fetch error:', error);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  }
}

/**
 * Get Farcaster profile image by FID (Farcaster ID)
 * @param fid Farcaster ID
 * @returns Profile image URL or null
 */
export async function getFarcasterProfileByFID(fid: number): Promise<FarcasterProfile> {
  console.log(`[Farcaster] 🔍 Fetching profile for FID: ${fid}`);
  
  // Use our proxy API (bypasses CORS, more reliable)
  return await fetchViaProxy({ fid });
}

/**
 * Get Farcaster profile image by wallet address
 * @param address Wallet address
 * @returns Profile image URL or null
 */
export async function getFarcasterProfileByAddress(address: string): Promise<FarcasterProfile> {
  const normalizedAddress = address.toLowerCase().trim();
  console.log(`[Farcaster] 🔍 Fetching profile for address: ${normalizedAddress}`);
  
  // Use our proxy API (bypasses CORS, more reliable)
  return await fetchViaProxy({ address: normalizedAddress });
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

