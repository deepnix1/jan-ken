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
 * POST /api/match/join
 * Assigns second player to an existing match
 * 
 * Body:
 * - match_id: Match ID (Supabase UUID or on-chain match ID)
 * - player2_address: Player2 wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, player2_address } = body;

    if (!match_id || !player2_address) {
      return NextResponse.json(
        { error: 'Missing required fields: match_id, player2_address' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(player2_address)) {
      return NextResponse.json(
        { error: 'Invalid player2_address' },
        { status: 400 }
      );
    }

    // Find match by UUID or on-chain match_id
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

    // Validate match state
    if (match.status !== 'waiting') {
      return NextResponse.json(
        { error: `Match is not in waiting state. Current status: ${match.status}` },
        { status: 400 }
      );
    }

    if (match.player2_address) {
      return NextResponse.json(
        { error: 'Match already has a second player' },
        { status: 400 }
      );
    }

    if (match.player1_address.toLowerCase() === player2_address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot play against yourself' },
        { status: 400 }
      );
    }

    // Update match with player2
    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({
        player2_address: player2_address.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Join Match] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to join match', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: 'Player2 joined. Both players can now commit moves.',
    });
  } catch (error: any) {
    console.error('[Join Match] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to join match',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

