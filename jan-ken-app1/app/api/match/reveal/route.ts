import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/match/reveal
 * Stores reveal data in Supabase (reveal happens on-chain via frontend)
 * 
 * Body:
 * - match_id: Match ID (UUID or on-chain match ID)
 * - player_address: Player wallet address
 * - move: Move (0=Rock, 1=Paper, 2=Scissors)
 * - secret: Secret used in commit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, player_address, move, secret } = body;

    if (!match_id || !player_address || move === undefined || !secret) {
      return NextResponse.json(
        { error: 'Missing required fields: match_id, player_address, move, secret' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(player_address)) {
      return NextResponse.json(
        { error: 'Invalid player_address' },
        { status: 400 }
      );
    }

    // Validate move
    if (move < 0 || move > 2) {
      return NextResponse.json(
        { error: 'Invalid move. Must be 0 (Rock), 1 (Paper), or 2 (Scissors)' },
        { status: 400 }
      );
    }

    // Find match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`id.eq.${match_id},match_id.eq.${match_id}`)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Validate match status
    if (match.status !== 'committed') {
      return NextResponse.json(
        { error: `Match is not in committed state. Current status: ${match.status}` },
        { status: 400 }
      );
    }

    // Validate player is part of match
    const isPlayer1 = match.player1_address.toLowerCase() === player_address.toLowerCase();
    const isPlayer2 = match.player2_address?.toLowerCase() === player_address.toLowerCase();

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json(
        { error: 'Player is not part of this match' },
        { status: 403 }
      );
    }

    // Verify commit hash matches
    const storedCommit = isPlayer1 ? match.commit1_hash : match.commit2_hash;
    if (!storedCommit) {
      return NextResponse.json(
        { error: 'Player has not committed yet' },
        { status: 400 }
      );
    }

    // Verify commit hash (keccak256(move + secret))
    const secretBytes = ethers.toUtf8Bytes(secret);
    const moveBytes = new Uint8Array([move]);
    const combined = new Uint8Array([...moveBytes, ...secretBytes.slice(0, 32)]);
    const computedHash = ethers.keccak256(combined);

    if (computedHash.toLowerCase() !== storedCommit.toLowerCase()) {
      return NextResponse.json(
        { error: 'Commit hash mismatch. Invalid move or secret.' },
        { status: 400 }
      );
    }

    // Check if already revealed
    if (isPlayer1 && match.move1 !== null) {
      return NextResponse.json(
        { error: 'Player1 already revealed' },
        { status: 400 }
      );
    }

    if (isPlayer2 && match.move2 !== null) {
      return NextResponse.json(
        { error: 'Player2 already revealed' },
        { status: 400 }
      );
    }

    // Update match with reveal
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (isPlayer1) {
      updateData.move1 = move;
      updateData.secret1 = secret; // Store temporarily (should be encrypted in production)
    } else {
      updateData.move2 = move;
      updateData.secret2 = secret;
    }

    // If both revealed, update status
    const move1 = isPlayer1 ? move : match.move1;
    const move2 = isPlayer2 ? move : match.move2;

    if (move1 !== null && move2 !== null) {
      updateData.status = 'revealed';
      
      // Determine winner
      let winner: string | null = null;
      if (move1 !== move2) {
        const player1Wins =
          (move1 === 0 && move2 === 2) || // Rock beats Scissors
          (move1 === 1 && move2 === 0) || // Paper beats Rock
          (move1 === 2 && move2 === 1);   // Scissors beats Paper
        
        winner = player1Wins ? match.player1_address : match.player2_address;
      }
      updateData.winner_address = winner;
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', match.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Reveal] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to store reveal', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: 'Reveal stored successfully',
    });
  } catch (error: any) {
    console.error('[Reveal] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to store reveal',
        details: String(error),
      },
      { status: 500 }
    );
  }
}




