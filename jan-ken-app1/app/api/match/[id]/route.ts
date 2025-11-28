import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/match/:id
 * Get match details by ID (UUID or on-chain match ID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Match ID required' },
        { status: 400 }
      );
    }

    // Try to find match by UUID or on-chain match_id
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`id.eq.${id},match_id.eq.${id}`)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Return match data (exclude secrets in production)
    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        match_id: match.match_id,
        player1_address: match.player1_address,
        player2_address: match.player2_address,
        bet_amount: match.bet_amount,
        status: match.status,
        commit1_hash: match.commit1_hash,
        commit2_hash: match.commit2_hash,
        move1: match.move1,
        move2: match.move2,
        winner_address: match.winner_address,
        tx_hash: match.tx_hash,
        created_at: match.created_at,
        updated_at: match.updated_at,
        resolved_at: match.resolved_at,
        // Note: secrets are excluded for security
      },
    });
  } catch (error: any) {
    console.error('[Get Match] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to get match',
        details: String(error),
      },
      { status: 500 }
    );
  }
}




