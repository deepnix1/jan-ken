// ETH Price API integration using CoinGecko
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

export interface EthPriceData {
  price: number;
  lastUpdated: number;
}

let cachedPrice: EthPriceData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function getEthPrice(): Promise<EthPriceData> {
  const now = Date.now();
  
  // Return cached price if still valid
  if (cachedPrice && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    const response = await fetch(COINGECKO_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }
    
    const data = await response.json();
    const price = data.ethereum?.usd || 0;
    
    cachedPrice = {
      price,
      lastUpdated: now,
    };
    cacheTimestamp = now;
    
    return cachedPrice;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    
    // Return cached price if available, otherwise fallback
    if (cachedPrice) {
      return cachedPrice;
    }
    
    // Fallback to a default price if no cache
    return {
      price: 3000, // Default fallback price
      lastUpdated: now,
    };
  }
}

// Calculate ETH amount for a given USD value
export function calculateEthAmount(usdAmount: number, ethPrice: number): string {
  const ethAmount = usdAmount / ethPrice;
  // Round to 6 decimal places for display
  return ethAmount.toFixed(6);
}

// Convert ETH amount to USD
export function ethToUsd(ethAmount: number, ethPrice: number): number {
  return ethAmount * ethPrice;
}



