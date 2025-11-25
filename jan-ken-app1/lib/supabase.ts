import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

// Log environment variable status (for debugging)
if (typeof window !== 'undefined') {
  console.log('[Supabase] Environment check:', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    keyLength: supabaseKey?.length || 0,
    keyPrefix: supabaseKey?.slice(0, 20) || 'none',
  })
}

if (!supabaseKey) {
  console.error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  // Don't throw in client-side, just log error
  if (typeof window === 'undefined') {
    throw new Error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  }
}

// Create a custom fetch wrapper with better error handling
const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
      },
    })
    
    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[Supabase Fetch] Response not OK:', {
        status: response.status,
        statusText: response.statusText,
        url: String(url),
        errorText: errorText.slice(0, 200),
      })
    }
    
    return response
  } catch (error: any) {
    // Log detailed fetch error
    console.error('[Supabase Fetch] Fetch error:', {
      name: error?.name,
      message: error?.message,
      type: error?.constructor?.name,
      url: String(url),
      stack: error?.stack?.split('\n').slice(0, 3),
    })
    
    // Re-throw with more context
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      throw new Error(`Network error: Failed to connect to Supabase. ${error.message}`)
    }
    throw error
  }
}

// Create Supabase client with custom fetch for better error handling
export const supabase = createClient(supabaseUrl, supabaseKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'jan-ken-app',
    },
    fetch: customFetch,
  },
})

// Test Supabase connection on client-side
if (typeof window !== 'undefined') {
  // Verify connection is working (with delay to ensure client is ready)
  setTimeout(() => {
    supabase.from('matchmaking_queue').select('count', { count: 'exact', head: true })
      .then(({ error }) => {
        if (error) {
          console.warn('[Supabase] Connection test failed:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })
        } else {
          console.log('[Supabase] ✅ Connection verified')
        }
      })
      .catch((err) => {
        console.error('[Supabase] ❌ Connection test error:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack?.split('\n').slice(0, 3),
        })
      })
  }, 1000)
}

// Database Types
export interface MatchmakingQueue {
  id: string
  player_address: string
  player_fid: number | null
  bet_level: number
  bet_amount: string // BigInt as string
  status: 'waiting' | 'matched' | 'cancelled'
  created_at: string
  matched_at: string | null
  matched_with: string | null // Other player's address
}

export interface Game {
  id: string
  game_id: string // Unique game identifier
  player1_address: string
  player1_fid: number | null
  player2_address: string
  player2_fid: number | null
  bet_level: number
  bet_amount: string
  status: 'pending' | 'commit_phase' | 'reveal_phase' | 'finished' | 'cancelled'
  player1_commit: string | null // Hash of player1's choice
  player2_commit: string | null // Hash of player1's choice
  player1_reveal: number | null // 1=Rock, 2=Paper, 3=Scissors
  player2_reveal: number | null
  winner: string | null // Address of winner
  created_at: string
  finished_at: string | null
  tx_hash: string | null // Blockchain transaction hash
}

export interface Commit {
  id: string
  game_id: string
  player_address: string
  choice_hash: string // Hash of (choice + salt)
  salt: string | null // Salt used for hashing (revealed later)
  created_at: string
  revealed_at: string | null
}


