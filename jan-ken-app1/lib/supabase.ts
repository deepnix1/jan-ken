import { createClient } from '@supabase/supabase-js'

// Hardcoded fallback values for testing (remove in production if needed)
const DEFAULT_SUPABASE_URL = 'https://iophfhfnctqufqsmunyz.supabase.co'
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0'

// Get environment variables with fallback
function getSupabaseConfig() {
  const url = typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL 
      || process.env.NEXT_PUBLIC_SUPABASE_URL 
      || DEFAULT_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL

  const key = typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.SUPABASE_KEY
      || DEFAULT_SUPABASE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY

  return { url, key }
}

const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig()

// Log environment variable status (for debugging)
if (typeof window !== 'undefined') {
  console.log('[Supabase] Environment check:', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    keyLength: supabaseKey?.length || 0,
    keyPrefix: supabaseKey?.slice(0, 20) || 'none',
    usingFallback: supabaseKey === DEFAULT_SUPABASE_KEY,
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
    }
  })
}

if (!supabaseKey) {
  console.error('❌ CRITICAL: Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  // Don't throw in client-side, just log error
  if (typeof window === 'undefined') {
    throw new Error('Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.')
  }
}

// Create a custom fetch wrapper with better error handling
const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const urlStr = String(url)
  
  try {
    console.log('[Supabase Fetch] Attempting fetch:', urlStr.slice(0, 100))
    
    // Ensure apikey is in headers for Supabase REST API
    const headers = new Headers(options?.headers)
    if (!headers.has('apikey')) {
      headers.set('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0')
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    
    const response = await fetch(url, {
      ...options,
      headers: headers,
      mode: 'cors',
      credentials: 'omit',
    })
    
    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        url: urlStr.slice(0, 200),
        errorText: errorText.slice(0, 200),
      }
      console.error('[Supabase Fetch] Response not OK:', JSON.stringify(errorInfo, null, 2))
    } else {
      console.log('[Supabase Fetch] ✅ Response OK:', response.status)
    }
    
    return response
  } catch (error: any) {
    // Log detailed fetch error with proper serialization
    const errorInfo = {
      name: error?.name || 'Unknown',
      message: error?.message || 'No message',
      type: error?.constructor?.name || 'Unknown',
      url: urlStr.slice(0, 200),
      stack: error?.stack ? error.stack.split('\n').slice(0, 3) : null,
    }
    console.error('[Supabase Fetch] Fetch error:', JSON.stringify(errorInfo, null, 2))
    
    // Re-throw with more context
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      throw new Error(`Network error: Failed to connect to Supabase. ${error.message}`)
    }
    throw error
  }
}

// Create Supabase client with custom fetch for better error handling
// CRITICAL: Use the exact URL and key from MCP verification
export const supabase = createClient(
  'https://iophfhfnctqufqsmunyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'jan-ken-app',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0',
      },
      fetch: customFetch,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

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


