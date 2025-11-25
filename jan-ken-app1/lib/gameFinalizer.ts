/**
 * Game Finalizer Service
 * 
 * Handles finalizing games on-chain after off-chain play
 */

import { CONTRACT_ADDRESS_V2, CONTRACT_ABI_V2 } from './contractV2';
import { Address } from 'viem';
import { supabase } from './supabase';

/**
 * Finalize game on blockchain
 * Called after commit-reveal phase completes in Supabase
 */
export async function finalizeGameOnChain(
  gameId: string,
  player1Address: Address,
  player2Address: Address,
  player1Choice: number, // 1=Rock, 2=Paper, 3=Scissors
  player2Choice: number,
  betAmount: bigint,
  writeContract: any // Wagmi writeContract function
): Promise<string | null> {
  try {
    console.log('[GameFinalizer] 🎯 Finalizing game on-chain:', {
      gameId,
      player1Address,
      player2Address,
      player1Choice,
      player2Choice,
      betAmount: betAmount.toString(),
    });

    // Call contract's finalizeGame function
    const hash = await writeContract({
      address: CONTRACT_ADDRESS_V2 as `0x${string}`,
      abi: CONTRACT_ABI_V2,
      functionName: 'finalizeGame',
      args: [
        gameId,
        player1Address,
        player2Address,
        player1Choice,
        player2Choice,
        betAmount,
      ],
    });

    console.log('[GameFinalizer] ✅ Transaction sent:', hash);

    // Update Supabase game with tx_hash
    await supabase
      .from('games')
      .update({ tx_hash: hash })
      .eq('game_id', gameId);

    return hash;
  } catch (error: any) {
    console.error('[GameFinalizer] ❌ Error finalizing game:', error);
    throw new Error(`Failed to finalize game: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Deposit funds to contract (before matchmaking)
 */
export async function depositFundsToContract(
  betAmount: bigint,
  writeContract: any
): Promise<string | null> {
  try {
    console.log('[GameFinalizer] 💰 Depositing funds:', betAmount.toString());

    const hash = await writeContract({
      address: CONTRACT_ADDRESS_V2 as `0x${string}`,
      abi: CONTRACT_ABI_V2,
      functionName: 'depositFunds',
      value: betAmount,
    });

    console.log('[GameFinalizer] ✅ Deposit transaction sent:', hash);
    return hash;
  } catch (error: any) {
    console.error('[GameFinalizer] ❌ Error depositing funds:', error);
    throw new Error(`Failed to deposit funds: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Withdraw funds from contract (if matchmaking cancelled)
 */
export async function withdrawFundsFromContract(
  amount: bigint | null, // null = withdraw all
  writeContract: any
): Promise<string | null> {
  try {
    console.log('[GameFinalizer] 💸 Withdrawing funds:', amount?.toString() || 'all');

    const hash = await writeContract({
      address: CONTRACT_ADDRESS_V2 as `0x${string}`,
      abi: CONTRACT_ABI_V2,
      functionName: 'withdrawFunds',
      args: [amount || BigInt(0)],
    });

    console.log('[GameFinalizer] ✅ Withdraw transaction sent:', hash);
    return hash;
  } catch (error: any) {
    console.error('[GameFinalizer] ❌ Error withdrawing funds:', error);
    throw new Error(`Failed to withdraw funds: ${error?.message || 'Unknown error'}`);
  }
}

