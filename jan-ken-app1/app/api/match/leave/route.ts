import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/match/leave
 * Leaves the matchmaking queue
 * Used for cleanup when app closes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerAddress } = body

    if (!playerAddress) {
      return NextResponse.json(
        { error: 'Missing playerAddress' },
        { status: 400 }
      )
    }

    // Leave queue
    const { error } = await supabase
      .from('matchmaking_queue')
      .update({ status: 'cancelled' })
      .eq('player_address', playerAddress.toLowerCase())
      .eq('status', 'waiting')

    if (error) {
      console.error('[Leave Queue API] Error:', error)
      // Don't fail if player is already matched or not in queue
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: true, message: 'Not in queue' })
      }
      return NextResponse.json(
        { error: 'Failed to leave queue', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Leave Queue API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}



