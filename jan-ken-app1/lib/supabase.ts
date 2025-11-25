import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseKey) {
  console.error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  // Don't throw in client-side, just log error
  if (typeof window === 'undefined') {
    throw new Error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  }
}

// Create Supabase client with better error handling and retry configuration
export const supabase = createClient(supabaseUrl, supabaseKey || '', {
  auth: {
    persistSession: false, // Don't persist auth sessions in this app
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'jan-ken-app',
    },
    fetch: (url, options = {}) => {
      // Enhanced fetch with timeout and retry
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId)
      }).catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: Supabase connection took too long')
        }
        if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to Supabase. Please check your internet connection.')
        }
        throw error
      })
    },
  },
})

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


