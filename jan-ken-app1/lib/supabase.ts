import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iophfhfnctqufqsmunyz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseKey) {
  throw new Error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

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


