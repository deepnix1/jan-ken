/**
 * Contract V2 - New Architecture
 * 
 * Off-chain matchmaking (Supabase) + Commit-Reveal + On-chain results
 */

export const CONTRACT_ADDRESS_V2 = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V2 || '';

// Contract ABI for V2 (simplified - only results)
export const CONTRACT_ABI_V2 = [
  {
    inputs: [],
    name: 'depositFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdrawFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'gameId', type: 'string' },
      { internalType: 'address', name: 'player1', type: 'address' },
      { internalType: 'address', name: 'player2', type: 'address' },
      { internalType: 'uint8', name: 'player1Choice', type: 'uint8' },
      { internalType: 'uint8', name: 'player2Choice', type: 'uint8' },
      { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
    ],
    name: 'finalizeGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
    ],
    name: 'getPlayerBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'gameId', type: 'string' },
    ],
    name: 'getGameResult',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'player1', type: 'address' },
          { internalType: 'address', name: 'player2', type: 'address' },
          { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
          { internalType: 'uint8', name: 'player1Choice', type: 'uint8' },
          { internalType: 'uint8', name: 'player2Choice', type: 'uint8' },
          { internalType: 'address', name: 'winner', type: 'address' },
          { internalType: 'uint256', name: 'prizeAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'bool', name: 'finalized', type: 'bool' },
        ],
        internalType: 'struct RockPaperScissorsV2.GameResult',
        name: 'result',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
    ],
    name: 'getPlayerStats',
    outputs: [
      { internalType: 'uint256', name: 'wins', type: 'uint256' },
      { internalType: 'uint256', name: 'losses', type: 'uint256' },
      { internalType: 'uint256', name: 'draws', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Bet levels (same as V1)
export const BET_LEVELS = {
  1: BigInt('1500000000000000'), // 0.0015 ETH ~$5
  2: BigInt('3000000000000000'), // 0.003 ETH ~$10
  3: BigInt('15000000000000000'), // 0.015 ETH ~$50
  4: BigInt('30000000000000000'), // 0.03 ETH ~$100
  5: BigInt('150000000000000000'), // 0.15 ETH ~$500
  6: BigInt('300000000000000000'), // 0.3 ETH ~$1000
} as const;

/**
 * Get bet level from amount
 */
export function getBetLevelFromAmount(betAmount: bigint): number | null {
  for (const [level, amount] of Object.entries(BET_LEVELS)) {
    if (betAmount === amount) {
      return parseInt(level);
    }
  }
  return null;
}

/**
 * Get bet amount from level
 */
export function getBetAmountFromLevel(betLevel: number): bigint | null {
  const amount = BET_LEVELS[betLevel as keyof typeof BET_LEVELS];
  return amount || null;
}


