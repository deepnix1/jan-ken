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

/**
 * POST /api/match/sync
 * Syncs match state from blockchain to Supabase
 * Can be called via webhook or cron job
 * 
 * Body (optional):
 * - match_id: Specific match ID to sync (if not provided, syncs all pending matches)
 * - limit: Maximum number of matches to sync (default: 10)
 */
export async function POST(request: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { match_id, limit = 10 } = body;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI_COMMIT_REVEAL, provider);

    // Get matches to sync
    let matchesToSync: any[] = [];

    if (match_id) {
      // Sync specific match
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`id.eq.${match_id},match_id.eq.${match_id}`)
        .single();

      if (match) {
        matchesToSync = [match];
      }
    } else {
      // Sync pending matches (waiting, committed, revealed)
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['waiting', 'committed', 'revealed'])
        .not('match_id', 'is', null)
        .limit(limit);

      matchesToSync = matches || [];
    }

    const synced: any[] = [];
    const errors: any[] = [];

    for (const match of matchesToSync) {
      try {
        if (!match.match_id) {
          continue; // Skip matches without on-chain ID
        }

        // Read match from contract
        const onChainMatch = await contract.getMatch(match.match_id);

        // Update Supabase with on-chain data
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        // Update status
        const statusMap: Record<number, string> = {
          0: 'waiting',
          1: 'committed',
          2: 'revealed',
          3: 'resolved',
          4: 'cancelled',
        };
        updateData.status = statusMap[Number(onChainMatch.status)] || match.status;

        // Update commits
        if (onChainMatch.commit1 !== ethers.ZeroHash) {
          updateData.commit1_hash = onChainMatch.commit1;
        }
        if (onChainMatch.commit2 !== ethers.ZeroHash) {
          updateData.commit2_hash = onChainMatch.commit2;
        }

        // Update moves (convert from enum: 1=Rock, 2=Paper, 3=Scissors to 0,1,2)
        if (onChainMatch.move1 > 0) {
          updateData.move1 = Number(onChainMatch.move1) - 1;
        }
        if (onChainMatch.move2 > 0) {
          updateData.move2 = Number(onChainMatch.move2) - 1;
        }

        // Update winner
        if (onChainMatch.winner !== ethers.ZeroAddress) {
          updateData.winner_address = onChainMatch.winner.toLowerCase();
        }

        // Update resolved_at
        if (onChainMatch.resolvedAt > 0) {
          updateData.resolved_at = new Date(Number(onChainMatch.resolvedAt) * 1000).toISOString();
        }

        // Update in Supabase
        await supabase
          .from('matches')
          .update(updateData)
          .eq('id', match.id);

        synced.push({
          match_id: match.match_id,
          status: updateData.status,
        });
      } catch (error: any) {
        errors.push({
          match_id: match.match_id,
          error: error?.message || String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      synced_matches: synced,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${synced.length} match(es)`,
    });
  } catch (error: any) {
    console.error('[Sync] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to sync matches',
        details: String(error),
      },
      { status: 500 }
    );
  }
}




