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
 * POST /api/match/commit
 * Stores commit hash in Supabase (commit happens on-chain via frontend)
 * 
 * Body:
 * - match_id: Match ID (UUID or on-chain match ID)
 * - player_address: Player wallet address
 * - commit_hash: Hash of (move + secret)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, player_address, commit_hash } = body;

    if (!match_id || !player_address || !commit_hash) {
      return NextResponse.json(
        { error: 'Missing required fields: match_id, player_address, commit_hash' },
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

    // Validate commit hash
    if (!ethers.isHexString(commit_hash) || commit_hash.length !== 66) {
      return NextResponse.json(
        { error: 'Invalid commit_hash (must be 32-byte hex string)' },
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

    // Validate player is part of match
    const isPlayer1 = match.player1_address.toLowerCase() === player_address.toLowerCase();
    const isPlayer2 = match.player2_address?.toLowerCase() === player_address.toLowerCase();

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json(
        { error: 'Player is not part of this match' },
        { status: 403 }
      );
    }

    // Check if already committed
    if (isPlayer1 && match.commit1_hash) {
      return NextResponse.json(
        { error: 'Player1 already committed' },
        { status: 400 }
      );
    }

    if (isPlayer2 && match.commit2_hash) {
      return NextResponse.json(
        { error: 'Player2 already committed' },
        { status: 400 }
      );
    }

    // Update match with commit
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (isPlayer1) {
      updateData.commit1_hash = commit_hash;
    } else {
      updateData.commit2_hash = commit_hash;
    }

    // If both committed, update status
    const commit1 = isPlayer1 ? commit_hash : match.commit1_hash;
    const commit2 = isPlayer2 ? commit_hash : match.commit2_hash;

    if (commit1 && commit2) {
      updateData.status = 'committed';
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', match.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Commit] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to store commit', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: 'Commit stored successfully',
    });
  } catch (error: any) {
    console.error('[Commit] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to store commit',
        details: String(error),
      },
      { status: 500 }
    );
  }
}


