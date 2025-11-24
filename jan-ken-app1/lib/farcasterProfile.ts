/**
 * Farcaster Profile Helper Functions
 * 
 * Uses Neynar API via our server-side proxy route
 * Following best practices from: https://docs.neynar.com/docs/getting-started-with-neynar
 * 
 * Architecture:
 * - Client calls these functions
 * - Functions call /api/farcaster route (server-side)
 * - Server uses official Neynar SDK
 * - This bypasses CORS and provides reliable access
 */

import { logApiKeyWarning } from './neynar-config';

export interface FarcasterProfile {
  pfpUrl: string | null;
  username: string | null;
  displayName: string | null;
  fid: number | null;
}

/**
 * Fetch profile using our Neynar-powered server-side API route
 * This bypasses CORS and uses official Neynar SDK on the server
 */
async function fetchViaProxy(params: { fid?: number; address?: string }): Promise<FarcasterProfile> {
  try {
    const queryParams = new URLSearchParams();
    if (params.fid) queryParams.set('fid', params.fid.toString());
    if (params.address) queryParams.set('address', params.address);

    console.log(`[Farcaster] 🌐 Fetching via Neynar proxy:`, params);
    
    // Log warning if using demo key (only once)
    if (typeof window !== 'undefined' && !window.__neynarKeyWarningShown) {
      logApiKeyWarning();
      window.__neynarKeyWarningShown = true;
    }

    const response = await fetch(`/api/farcaster?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Farcaster] ❌ Neynar API error:', response.status, errorData);
      return { pfpUrl: null, username: null, displayName: null, fid: null };
    }

    const data = await response.json();
    console.log('[Farcaster] ✅ Neynar API success:', data);
    return data;
  } catch (error) {
    console.error('[Farcaster] ❌ Network error:', error);
    return { pfpUrl: null, username: null, displayName: null, fid: null };
  }
}

// Type augmentation for window
declare global {
  interface Window {
    __neynarKeyWarningShown?: boolean;
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

