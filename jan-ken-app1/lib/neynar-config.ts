/**
 * Neynar Configuration
 * 
 * Centralized configuration for Neynar API integration
 * Following best practices from: https://docs.neynar.com/docs/getting-started-with-neynar
 */

export const NEYNAR_CONFIG = {
  // API Key - using demo key for development, production should use env variable
  apiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS',
  
  // API endpoints
  apiBaseUrl: 'https://api.neynar.com/v2',
  
  // App metadata
  appName: 'Jan-Ken',
  appDescription: 'Rock Paper Scissors on Base with Farcaster integration',
  
  // Farcaster FID for the app owner (if needed)
  appFid: 283779, // Your FID from farcaster.json
} as const;

/**
 * Helper to check if we're using the demo API key
 */
export function isUsingDemoKey(): boolean {
  return NEYNAR_CONFIG.apiKey === 'NEYNAR_API_DOCS';
}

/**
 * Helper to log warnings about API key usage
 */
export function logApiKeyWarning() {
  if (isUsingDemoKey()) {
    console.warn(
      '[Neynar] ⚠️ Using demo API key. For production, set NEXT_PUBLIC_NEYNAR_API_KEY environment variable.\n' +
      'Get your API key at: https://neynar.com'
    );
  }
}





