/**
 * Match Commit-Reveal Utilities
 * Client-side utilities for commit-reveal Rock-Paper-Scissors game
 */

import { Address, keccak256, toBytes, type WalletClient } from 'viem';
import { writeContract, waitForTransactionReceipt, readContract, getConnectorClient } from '@wagmi/core';
import { config } from '@/app/rootProvider';
import { 
  CONTRACT_ADDRESS_COMMIT_REVEAL, 
  CONTRACT_ABI_COMMIT_REVEAL,
  MOVE,
  MATCH_STATUS 
} from './contractCommitReveal';

// ============================================
// TYPES
// ============================================

export interface MatchData {
  player1: Address;
  player2: Address;
  betAmount: bigint;
  commit1: string;
  commit2: string;
  move1: number;
  move2: number;
  secret1: string;
  secret2: string;
  status: number;
  winner: Address;
  createdAt: bigint;
  resolvedAt: bigint;
}

export interface CommitData {
  move: number; // 0=Rock, 1=Paper, 2=Scissors
  secret: string;
  commitHash: string;
}

// ============================================
// COMMIT HASH GENERATION
// ============================================

/**
 * Generate a random secret for commit
 * @returns Random 32-byte hex string
 */
export function generateSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute commit hash from move and secret
 * @param move Move (0=Rock, 1=Paper, 2=Scissors)
 * @param secret Secret string (will be converted to bytes32)
 * @returns Commit hash (bytes32)
 */
export function generateCommit(move: number, secret: string): string {
  if (move < 0 || move > 2) {
    throw new Error('Invalid move. Must be 0 (Rock), 1 (Paper), or 2 (Scissors)');
  }

  // Convert secret string to bytes32
  const secretBytes = toBytes(secret);
  const secretBytes32 = new Uint8Array(32);
  secretBytes.slice(0, 32).forEach((byte, i) => {
    secretBytes32[i] = byte;
  });

  // Compute hash: keccak256(move + secret)
  const moveBytes = new Uint8Array([move]);
  const combined = new Uint8Array([...moveBytes, ...secretBytes32]);
  
  return keccak256(combined);
}

/**
 * Verify commit hash matches move and secret
 * @param move Move (0-2)
 * @param secret Secret string
 * @param commitHash Commit hash to verify
 * @returns True if hash matches
 */
export function verifyCommit(move: number, secret: string, commitHash: string): boolean {
  const computedHash = generateCommit(move, secret);
  return computedHash.toLowerCase() === commitHash.toLowerCase();
}

// ============================================
// CONTRACT INTERACTIONS
// ============================================

/**
 * Create a new match (player1 stakes bet)
 * @param betAmount Bet amount in wei
 * @returns Transaction hash
 * 
 * NOTE: This function uses writeContract utility which should trigger wallet popup.
 * For better wallet popup reliability, use useWriteContract hook in React components.
 */
export async function createMatch(betAmount: bigint): Promise<string> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  // Ensure connector client is ready
  const connectorClient = await getConnectorClient(config);
  if (!connectorClient) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  console.log('[createMatch] 📝 Preparing transaction...');
  console.log('[createMatch] 💰 Bet amount:', betAmount.toString());
  console.log('[createMatch] 🔌 Connector client:', !!connectorClient);

  const hash = await writeContract(config, {
    address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
    abi: CONTRACT_ABI_COMMIT_REVEAL,
    functionName: 'createMatch',
    args: [betAmount],
    value: betAmount,
    connector: connectorClient,
  });

  console.log('[createMatch] ✅ Transaction hash:', hash);
  return hash;
}

/**
 * Join an existing match (player2 stakes bet)
 * @param matchId Match ID to join
 * @param betAmount Bet amount (must match match betAmount)
 * @returns Transaction hash
 * 
 * NOTE: This function uses writeContract utility which should trigger wallet popup.
 * For better wallet popup reliability, use useWriteContract hook in React components.
 */
export async function joinMatch(matchId: bigint, betAmount: bigint): Promise<string> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  // Ensure connector client is ready
  const connectorClient = await getConnectorClient(config);
  if (!connectorClient) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  console.log('[joinMatch] 📝 Preparing transaction...');
  console.log('[joinMatch] 🎮 Match ID:', matchId.toString());
  console.log('[joinMatch] 💰 Bet amount:', betAmount.toString());

  const hash = await writeContract(config, {
    address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
    abi: CONTRACT_ABI_COMMIT_REVEAL,
    functionName: 'joinMatch',
    args: [matchId],
    value: betAmount,
    connector: connectorClient,
  });

  console.log('[joinMatch] ✅ Transaction hash:', hash);
  return hash;
}

/**
 * Commit a move (send hash to contract)
 * @param matchId Match ID
 * @param commitHash Hash of (move + secret)
 * @returns Transaction hash
 * 
 * NOTE: This function uses writeContract utility which should trigger wallet popup.
 * For better wallet popup reliability, use useWriteContract hook in React components.
 */
export async function sendCommitTx(matchId: bigint, commitHash: string): Promise<string> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  // Ensure connector client is ready
  const connectorClient = await getConnectorClient(config);
  if (!connectorClient) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  console.log('[sendCommitTx] 📝 Preparing commit transaction...');
  console.log('[sendCommitTx] 🎮 Match ID:', matchId.toString());
  console.log('[sendCommitTx] 🔐 Commit hash:', commitHash);

  const hash = await writeContract(config, {
    address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
    abi: CONTRACT_ABI_COMMIT_REVEAL,
    functionName: 'commitMove',
    args: [matchId, commitHash as `0x${string}`],
    connector: connectorClient,
  });

  console.log('[sendCommitTx] ✅ Transaction hash:', hash);
  return hash;
}

/**
 * Reveal a move (send move + secret to contract)
 * @param matchId Match ID
 * @param move Move (0=Rock, 1=Paper, 2=Scissors)
 * @param secret Secret used in commit
 * @returns Transaction hash
 * 
 * NOTE: This function uses writeContract utility which should trigger wallet popup.
 * For better wallet popup reliability, use useWriteContract hook in React components.
 */
export async function sendRevealTx(
  matchId: bigint,
  move: number,
  secret: string
): Promise<string> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  // Ensure connector client is ready
  const connectorClient = await getConnectorClient(config);
  if (!connectorClient) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  // Convert secret string to bytes32
  const secretBytes = toBytes(secret);
  const secretBytes32 = new Uint8Array(32);
  secretBytes.slice(0, 32).forEach((byte, i) => {
    secretBytes32[i] = byte;
  });

  console.log('[sendRevealTx] 📝 Preparing reveal transaction...');
  console.log('[sendRevealTx] 🎮 Match ID:', matchId.toString());
  console.log('[sendRevealTx] ✋ Move:', move);

  const hash = await writeContract(config, {
    address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
    abi: CONTRACT_ABI_COMMIT_REVEAL,
    functionName: 'revealMove',
    args: [matchId, move, secretBytes32 as `0x${string}`],
    connector: connectorClient,
  });

  console.log('[sendRevealTx] ✅ Transaction hash:', hash);
  return hash;
}

// ============================================
// READ CONTRACT STATE
// ============================================

/**
 * Read match data from contract
 * @param matchId Match ID
 * @returns Match data
 */
export async function readMatchStatus(matchId: bigint): Promise<MatchData | null> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  try {
    const match = await readContract(config, {
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'getMatch',
      args: [matchId],
    });

    return match as unknown as MatchData;
  } catch (error) {
    console.error('Error reading match:', error);
    return null;
  }
}

/**
 * Get all match IDs for a player
 * @param playerAddress Player address
 * @returns Array of match IDs
 */
export async function getPlayerMatches(playerAddress: Address): Promise<bigint[]> {
  if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
    throw new Error('Contract address not configured');
  }

  try {
    const matches = await readContract(config, {
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'getPlayerMatches',
      args: [playerAddress],
    });

    return matches as bigint[];
  } catch (error) {
    console.error('Error reading player matches:', error);
    return [];
  }
}

// ============================================
// TRANSACTION HELPERS
// ============================================

/**
 * Wait for transaction confirmation
 * @param hash Transaction hash
 * @param timeout Timeout in milliseconds (default: 120000)
 * @returns Transaction receipt
 */
export async function waitForTx(
  hash: string,
  timeout: number = 120000
): Promise<`0x${string}`> {
  const receipt = await waitForTransactionReceipt(config, {
    hash: hash as `0x${string}`,
    timeout,
  });

  return receipt.transactionHash;
}

// ============================================
// MOVE COMPARISON
// ============================================

/**
 * Determine winner based on moves
 * @param move1 Player1 move (0-2)
 * @param move2 Player2 move (0-2)
 * @returns Winner: 1 (player1), 2 (player2), or 0 (draw)
 */
export function determineWinner(move1: number, move2: number): 0 | 1 | 2 {
  if (move1 === move2) {
    return 0; // Draw
  }

  // Rock (0) beats Scissors (2)
  // Paper (1) beats Rock (0)
  // Scissors (2) beats Paper (1)
  
  const player1Wins =
    (move1 === MOVE.ROCK && move2 === MOVE.SCISSORS) ||
    (move1 === MOVE.PAPER && move2 === MOVE.ROCK) ||
    (move1 === MOVE.SCISSORS && move2 === MOVE.PAPER);

  return player1Wins ? 1 : 2;
}

/**
 * Get move name as string
 * @param move Move number (0-2)
 * @returns Move name
 */
export function getMoveName(move: number): string {
  switch (move) {
    case MOVE.ROCK:
      return 'Rock';
    case MOVE.PAPER:
      return 'Paper';
    case MOVE.SCISSORS:
      return 'Scissors';
    default:
      return 'Unknown';
  }
}

/**
 * Get match status name as string
 * @param status Status number
 * @returns Status name
 */
export function getMatchStatusName(status: number): string {
  switch (status) {
    case MATCH_STATUS.WAITING:
      return 'Waiting';
    case MATCH_STATUS.COMMITTED:
      return 'Committed';
    case MATCH_STATUS.REVEALED:
      return 'Revealed';
    case MATCH_STATUS.RESOLVED:
      return 'Resolved';
    case MATCH_STATUS.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

