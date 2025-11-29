/**
 * Browser Detection Utility
 * Detects device type, browser, and environment for wallet connector selection
 */

export interface BrowserInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isFarcaster: boolean;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  userAgent: string;
}

/**
 * Detect if running in Farcaster Mini App environment
 */
export function isFarcasterEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Farcaster SDK
  try {
    // Check imported SDK
    const { sdk } = require('@farcaster/miniapp-sdk');
    if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
      return true;
    }
  } catch {
    // SDK not available
  }
  
  // Check window SDK (PC Debug Tool)
  if ((window as any).farcaster?.sdk?.actions?.ready) {
    return true;
  }
  
  // Check iframe parent (Farcaster embeds apps in iframes)
  try {
    if (window.self !== window.top) {
      // We're in an iframe - could be Farcaster
      const parentOrigin = window.location.ancestorOrigins?.[0] || 
                          (window.parent !== window.self ? document.referrer : '');
      if (parentOrigin.includes('farcaster') || parentOrigin.includes('warpcast')) {
        return true;
      }
    }
  } catch {
    // Cross-origin iframe - can't access parent
    // This is likely Farcaster (they embed in iframes)
    return true;
  }
  
  return false;
}

/**
 * Get comprehensive browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isIOS: false,
      isAndroid: false,
      isFarcaster: false,
      browserName: 'Unknown',
      browserVersion: 'Unknown',
      osName: 'Unknown',
      osVersion: 'Unknown',
      userAgent: 'Server',
    };
  }

  const userAgent = navigator.userAgent || '';
  const ua = userAgent.toLowerCase();

  // Detect OS
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isWindows = /windows/.test(ua);
  const isMac = /macintosh|mac os x/.test(ua);
  const isLinux = /linux/.test(ua);

  // Detect device type
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua) && !isMobile;
  const isDesktop = !isMobile && !isTablet;

  // Detect browser
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
    browserName = 'Chrome';
    const match = ua.match(/chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browserName = 'Safari';
    const match = ua.match(/version\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('firefox')) {
    browserName = 'Firefox';
    const match = ua.match(/firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('edg')) {
    browserName = 'Edge';
    const match = ua.match(/edg\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('opr') || ua.includes('opera')) {
    browserName = 'Opera';
    const match = ua.match(/(?:opr|opera)\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('samsung')) {
    browserName = 'Samsung Internet';
    const match = ua.match(/samsungbrowser\/([\d.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  // Detect OS name and version
  let osName = 'Unknown';
  let osVersion = 'Unknown';

  if (isIOS) {
    osName = 'iOS';
    const match = ua.match(/os ([\d_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
  } else if (isAndroid) {
    osName = 'Android';
    const match = ua.match(/android ([\d.]+)/);
    osVersion = match ? match[1] : 'Unknown';
  } else if (isWindows) {
    osName = 'Windows';
    if (ua.includes('windows nt 10')) osVersion = '10';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (isMac) {
    osName = 'macOS';
    const match = ua.match(/mac os x ([\d_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
  } else if (isLinux) {
    osName = 'Linux';
  }

  // Check Farcaster environment
  const isFarcaster = isFarcasterEnvironment();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isFarcaster,
    browserName,
    browserVersion,
    osName,
    osVersion,
    userAgent,
  };
}

/**
 * Get recommended wallet connector based on environment
 */
export function getRecommendedConnector(browserInfo: BrowserInfo): 'farcaster' | 'metamask' | 'auto' {
  // In Farcaster Mini App, always use Farcaster connector
  if (browserInfo.isFarcaster) {
    return 'farcaster';
  }

  // On mobile (outside Farcaster), prefer Farcaster if available
  if (browserInfo.isMobile) {
    return 'farcaster';
  }

  // On desktop, prefer MetaMask
  if (browserInfo.isDesktop) {
    return 'metamask';
  }

  // Default to auto (let user choose)
  return 'auto';
}

/**
 * Check if MetaMask is available
 */
export function isMetaMaskAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const ethereum = (window as any).ethereum;
  return !!(ethereum && ethereum.isMetaMask);
}

/**
 * Check if wallet extension is available
 */
export function hasWalletExtension(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
}

