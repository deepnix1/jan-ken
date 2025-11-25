/**
 * React Hook for Commit-Reveal Game Transactions
 * Uses useWriteContract hook to ensure wallet popup appears
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, toBytes, toHex, pad, bytesToHex } from 'viem';
import { 
  CONTRACT_ADDRESS_COMMIT_REVEAL, 
  CONTRACT_ABI_COMMIT_REVEAL 
} from '@/lib/contractCommitReveal';

export function useCommitReveal() {
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error, 
    status,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isReceiptError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Create a new match
   */
  const createMatch = async (betAmount: bigint) => {
    if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
      throw new Error('Contract address not configured');
    }

    console.log('[useCommitReveal] 📝 Creating match...');
    console.log('[useCommitReveal] 💰 Bet amount:', betAmount.toString());

    writeContract({
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'createMatch',
      args: [betAmount],
      value: betAmount,
    });
  };

  /**
   * Join an existing match
   */
  const joinMatch = async (matchId: bigint, betAmount: bigint) => {
    if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
      throw new Error('Contract address not configured');
    }

    console.log('[useCommitReveal] 📝 Joining match...');
    console.log('[useCommitReveal] 🎮 Match ID:', matchId.toString());

    writeContract({
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'joinMatch',
      args: [matchId],
      value: betAmount,
    });
  };

  /**
   * Commit a move
   */
  const commitMove = async (matchId: bigint, commitHash: string) => {
    if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
      throw new Error('Contract address not configured');
    }

    console.log('[useCommitReveal] 📝 Committing move...');
    console.log('[useCommitReveal] 🎮 Match ID:', matchId.toString());
    console.log('[useCommitReveal] 🔐 Commit hash:', commitHash);

    writeContract({
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'commitMove',
      args: [matchId, commitHash as `0x${string}`],
    });
  };

  /**
   * Reveal a move
   */
  const revealMove = async (
    matchId: bigint,
    move: number,
    secret: string
  ) => {
    if (!CONTRACT_ADDRESS_COMMIT_REVEAL) {
      throw new Error('Contract address not configured');
    }

    // Convert secret string to bytes32
    const secretBytes = toBytes(secret);
    // Pad to 32 bytes and convert to hex string
    const secretBytes32 = bytesToHex(pad(secretBytes.slice(0, 32), { size: 32 })) as `0x${string}`;

    console.log('[useCommitReveal] 📝 Revealing move...');
    console.log('[useCommitReveal] 🎮 Match ID:', matchId.toString());
    console.log('[useCommitReveal] ✋ Move:', move);

    writeContract({
      address: CONTRACT_ADDRESS_COMMIT_REVEAL as Address,
      abi: CONTRACT_ABI_COMMIT_REVEAL,
      functionName: 'revealMove',
      args: [matchId, move, secretBytes32],
    });
  };

  return {
    // Actions
    createMatch,
    joinMatch,
    commitMove,
    revealMove,
    
    // State
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    isReceiptError,
    status,
    reset,
  };
}

