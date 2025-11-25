import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { CONTRACT_ABI_V3 } from '@/lib/contractV3';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_V3 || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V3 || '';
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';

if (!CONTRACT_ADDRESS) {
  throw new Error('Missing CONTRACT_ADDRESS_V3');
}

if (!RELAYER_PRIVATE_KEY) {
  throw new Error('Missing RELAYER_PRIVATE_KEY');
}

/**
 * Determine winner based on moves
 * @param a Move A (1=Rock, 2=Paper, 3=Scissors)
 * @param b Move B
 * @returns Winner: 'A', 'B', or null (draw)
 */
function determineWinner(a: number, b: number): 'A' | 'B' | null {
  if (a === b) return null; // Draw
  
  // Rock(1) > Scissors(3), Paper(2) > Rock(1), Scissors(3) > Paper(2)
  if ((a === 1 && b === 3) || (a === 2 && b === 1) || (a === 3 && b === 2)) {
    return 'A';
  }
  
  return 'B';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameId,
      playerA,
      moveA,
      tsA,
      saltA,
      sigA,
      playerB,
      moveB,
      tsB,
      saltB,
      sigB,
      betAmount,
    } = body;

    // Validate input
    if (!gameId || !playerA || !playerB || !moveA || !moveB || !betAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!sigA || !sigB || !saltA || !saltB || !tsA || !tsB) {
      return NextResponse.json(
        { error: 'Missing signature data' },
        { status: 400 }
      );
    }

    // Validate moves
    if (moveA < 1 || moveA > 3 || moveB < 1 || moveB > 3) {
      return NextResponse.json(
        { error: 'Invalid move (must be 1-3)' },
        { status: 400 }
      );
    }

    // Check if game exists in Supabase
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found in Supabase' },
        { status: 404 }
      );
    }

    // Check if game is already finalized
    if (game.status === 'finished' && game.tx_hash) {
      return NextResponse.json(
        { error: 'Game already finalized', txHash: game.tx_hash },
        { status: 400 }
      );
    }

    // Determine winner (off-chain)
    const winner = determineWinner(moveA, moveB);
    const winnerAddress = winner === 'A' ? playerA : winner === 'B' ? playerB : null;

    // Setup contract
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI_V3, wallet);

    // Convert betAmount to BigNumber if it's a string
    const betAmountBN = typeof betAmount === 'string' 
      ? ethers.parseEther(betAmount) 
      : BigInt(betAmount);

    // Convert signatures to bytes (signatures are already hex strings from frontend)
    const sigABytes = ethers.isHexString(sigA) ? ethers.getBytes(sigA) : ethers.toUtf8Bytes(sigA);
    const sigBBytes = ethers.isHexString(sigB) ? ethers.getBytes(sigB) : ethers.toUtf8Bytes(sigB);

    // Convert salts to bytes32
    // Salt is a string from frontend, we need to convert it to bytes32
    // Contract expects bytes32, so we'll hash the salt string to get a consistent bytes32 value
    // Note: The contract uses salt in the message hash, so we need to use the same salt value
    // that was used when creating the signature on the frontend
    let saltABytes32: string;
    let saltBBytes32: string;
    
    if (ethers.isHexString(saltA) && saltA.length === 66) {
      // Already a 32-byte hex string (0x + 64 hex chars)
      saltABytes32 = saltA;
    } else {
      // Convert string salt to bytes32 by hashing it
      // This ensures we always get a 32-byte value
      saltABytes32 = ethers.keccak256(ethers.toUtf8Bytes(saltA));
    }
    
    if (ethers.isHexString(saltB) && saltB.length === 66) {
      saltBBytes32 = saltB;
    } else {
      saltBBytes32 = ethers.keccak256(ethers.toUtf8Bytes(saltB));
    }

    console.log('[Settle] 🎯 Settling game:', {
      gameId,
      playerA,
      playerB,
      moveA,
      moveB,
      betAmount: betAmountBN.toString(),
      winner: winnerAddress,
    });

    // Call contract's settleGame function
    const tx = await contract.settleGame(
      gameId,
      playerA,
      playerB,
      betAmountBN,
      moveA,
      BigInt(tsA),
      saltABytes32,
      sigABytes,
      moveB,
      BigInt(tsB),
      saltBBytes32,
      sigBBytes
    );

    console.log('[Settle] ✅ Transaction sent:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('[Settle] ✅ Transaction confirmed:', receipt.transactionHash);

    // Update Supabase game with tx_hash and winner
    await supabase
      .from('games')
      .update({
        tx_hash: receipt.transactionHash,
        winner: winnerAddress,
        status: 'finished',
        finished_at: new Date().toISOString(),
        player1_reveal: moveA,
        player2_reveal: moveB,
      })
      .eq('game_id', gameId);

    return NextResponse.json({
      ok: true,
      txHash: receipt.transactionHash,
      winner: winnerAddress,
      winnerLabel: winner, // 'A', 'B', or null
    });
  } catch (error: any) {
    console.error('[Settle] ❌ Error:', error);
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to settle game',
        details: error?.reason || error?.shortMessage || String(error),
      },
      { status: 500 }
    );
  }
}

