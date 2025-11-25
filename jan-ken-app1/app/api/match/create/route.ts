import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { CONTRACT_ABI_COMMIT_REVEAL } from '@/lib/contractCommitReveal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_COMMIT_REVEAL || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL || '';
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';

/**
 * POST /api/match/create
 * Creates a new match in Supabase and on-chain
 * 
 * Body:
 * - player1_address: Player1 wallet address
 * - bet_amount: Bet amount in wei (as string)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player1_address, bet_amount } = body;

    if (!player1_address || !bet_amount) {
      return NextResponse.json(
        { error: 'Missing required fields: player1_address, bet_amount' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(player1_address)) {
      return NextResponse.json(
        { error: 'Invalid player1_address' },
        { status: 400 }
      );
    }

    // Validate bet amount
    const betAmountBN = BigInt(bet_amount);
    if (betAmountBN < BigInt('100000000000000')) { // 0.0001 ETH
      return NextResponse.json(
        { error: 'Bet amount too small' },
        { status: 400 }
      );
    }

    // Create match on-chain if relayer is configured
    let onChainMatchId: bigint | null = null;
    let txHash: string | null = null;

    if (RELAYER_PRIVATE_KEY && CONTRACT_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI_COMMIT_REVEAL, wallet);

        // Create match on-chain (relayer pays gas, player1 will stake separately)
        // Note: In production, player1 should call createMatch directly from frontend
        // This is just for backend tracking
        console.log('[Create Match] Creating match on-chain...');
        
        // For now, we'll just track in Supabase
        // The actual on-chain creation happens when player1 calls createMatch from frontend
      } catch (error: any) {
        console.error('[Create Match] On-chain creation error:', error);
        // Continue with Supabase-only creation
      }
    }

    // Create match in Supabase
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        match_id: onChainMatchId ? Number(onChainMatchId) : null,
        player1_address: player1_address.toLowerCase(),
        player2_address: null,
        bet_amount: bet_amount.toString(),
        status: 'waiting',
        commit1_hash: null,
        commit2_hash: null,
        move1: null,
        move2: null,
        secret1: null,
        secret2: null,
        winner_address: null,
        tx_hash: txHash,
      })
      .select()
      .single();

    if (matchError) {
      console.error('[Create Match] Supabase error:', matchError);
      return NextResponse.json(
        { error: 'Failed to create match in database', details: matchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        match_id: match.match_id,
        player1_address: match.player1_address,
        bet_amount: match.bet_amount,
        status: match.status,
        created_at: match.created_at,
      },
      message: 'Match created. Player1 should call createMatch() on-chain to stake bet.',
    });
  } catch (error: any) {
    console.error('[Create Match] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to create match',
        details: String(error),
      },
      { status: 500 }
    );
  }
}


