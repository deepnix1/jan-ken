/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Ethereum address format: 0x followed by 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validate bet amount (must be positive and within reasonable limits)
 */
export function isValidBetAmount(amount: bigint | string | number): boolean {
  try {
    const numAmount = typeof amount === 'bigint' 
      ? amount 
      : BigInt(amount.toString());
    
    // Must be positive and less than 1000 ETH (safety limit)
    const maxBet = BigInt('1000000000000000000000'); // 1000 ETH in wei
    return numAmount > BigInt(0) && numAmount <= maxBet;
  } catch {
    return false;
  }
}

/**
 * Validate choice input (1, 2, or 3)
 */
export function isValidChoice(choice: number | string): boolean {
  const numChoice = typeof choice === 'string' ? parseInt(choice, 10) : choice;
  return Number.isInteger(numChoice) && numChoice >= 1 && numChoice <= 3;
}

/**
 * Rate limiting helper (client-side, server should also implement)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Validate and sanitize contract address from environment
 */
export function getSecureContractAddress(): string | null {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  
  if (!address) {
    return null;
  }
  
  if (!isValidAddress(address)) {
    console.error('Invalid contract address in environment variables');
    return null;
  }
  
  return address;
}

