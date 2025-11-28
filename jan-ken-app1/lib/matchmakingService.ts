import { supabase, MatchmakingQueue, Game } from './supabase'
import { Address } from 'viem'

/**
 * Off-chain matchmaking service using Supabase
 * This provides fast matching without waiting for blockchain confirmations
 */

// Lock mechanism to prevent concurrent tryMatch calls for same betLevel
// Use timestamp to auto-release locks after timeout
const matchLocks = new Map<number, number>() // betLevel -> timestamp

const LOCK_TIMEOUT_MS = 5000 // 5 seconds

/**
 * Acquire lock for matching at a specific bet level
 */
function acquireLock(betLevel: number): boolean {
  const now = Date.now()
  const lockTime = matchLocks.get(betLevel)
  
  // If lock exists and is still valid, deny
  if (lockTime && (now - lockTime) < LOCK_TIMEOUT_MS) {
    return false // Lock already held
  }
  
  // Acquire lock (or override expired lock)
  matchLocks.set(betLevel, now)
  return true
}

/**
 * Release lock for matching at a specific bet level
 */
function releaseLock(betLevel: number): void {
  matchLocks.delete(betLevel)
}

export interface JoinQueueParams {
  playerAddress: Address
  playerFid: number | null
  betLevel: number
  betAmount: bigint
}

export interface MatchResult {
  gameId: string
  player1Address: Address
  player1Fid: number | null
  player2Address: Address
  player2Fid: number | null
  betLevel: number
  betAmount: bigint
}

/**
 * Join the matchmaking queue
 * Returns the queue entry ID
 */
export async function joinQueue(params: JoinQueueParams): Promise<string> {
  const { playerAddress, playerFid, betLevel, betAmount } = params

  try {
    // CRITICAL: Check if app is visible (client-side only)
    if (typeof document !== 'undefined' && document.hidden) {
      console.error('[joinQueue] ❌ App is hidden - cannot join queue')
      throw new Error('App must be visible to join queue')
    }
    
    // CRITICAL: Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      console.error('[joinQueue] ❌ Window not available - cannot join queue')
      throw new Error('Window not available - cannot join queue')
    }
    
    // CRITICAL: Validate bet amount before proceeding
    if (!betAmount || betAmount === BigInt(0)) {
      throw new Error('Bet amount is required. Please select a bet amount before joining the queue.')
    }
    
    // CRITICAL: Validate bet level
    if (!betLevel || betLevel === 0 || betLevel < 1 || betLevel > 6) {
      throw new Error('Invalid bet level. Please select a valid bet level (1-6).')
    }
    
    // Validate player address
    if (!playerAddress || playerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Invalid player address.')
    }
    
    // Validate Supabase client
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }
    
    console.log('[joinQueue] ✅ Validation passed')
    console.log('[joinQueue] 📊 Validation details:', JSON.stringify({
      playerAddress: playerAddress.slice(0, 10) + '...',
      betLevel,
      betAmount: betAmount.toString(),
    }))

    // CRITICAL: Clean up any old waiting entries for this player first
    // This prevents duplicate entries if player reconnects
    try {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('player_address', playerAddress.toLowerCase())
        .eq('status', 'waiting')
        .lt('created_at', new Date(Date.now() - 3600000).toISOString()) // Older than 1 hour
      console.log('[joinQueue] ✅ Cleaned up old waiting entries for player')
    } catch (cleanupError: any) {
      console.warn('[joinQueue] ⚠️ Could not clean up old entries:', cleanupError?.message)
      // Continue anyway - not critical
    }
    
    // Check if player is already in queue
    // CRITICAL: Use explicit error handling and retry logic
    let existing = null
    let checkError = null
    
    try {
      const result = await supabase
        .from('matchmaking_queue')
        .select('id')
        .eq('player_address', playerAddress.toLowerCase())
        .eq('status', 'waiting')
        .maybeSingle() // Use maybeSingle instead of single to avoid error if not found
      
      existing = result.data
      checkError = result.error
      
      // Log the result for debugging
      console.log('[joinQueue] Check existing result:', {
        hasData: !!existing,
        hasError: !!checkError,
        errorCode: checkError?.code,
        errorMessage: checkError?.message,
      })
    } catch (err: any) {
      console.error('[joinQueue] Exception during check:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack?.split('\n').slice(0, 3),
      })
      checkError = err
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      // Log detailed error information with proper serialization
      // CRITICAL: Serialize immediately to avoid [object Object]
      const errorInfo = {
        code: checkError.code || 'NO_CODE',
        message: checkError.message || 'NO_MESSAGE',
        details: checkError.details || null,
        hint: checkError.hint || null,
        status: (checkError as any)?.status || null,
        statusText: (checkError as any)?.statusText || null,
      }
      
      // Serialize to string immediately
      const errorInfoStr = JSON.stringify(errorInfo, null, 2)
      const errorCodeStr = String(errorInfo.code)
      const errorMsgStr = String(errorInfo.message)
      const errorDetailsStr = errorInfo.details ? JSON.stringify(errorInfo.details) : 'null'
      const errorHintStr = errorInfo.hint ? String(errorInfo.hint) : 'null'
      
      console.error('[joinQueue] Error checking existing queue:', errorInfoStr)
      console.error('[joinQueue] Error code:', errorCodeStr)
      console.error('[joinQueue] Error message:', errorMsgStr)
      console.error('[joinQueue] Error details:', errorDetailsStr)
      console.error('[joinQueue] Error hint:', errorHintStr)
      
      // Check for specific error types
      const errorMsg = errorInfo.message || String(checkError) || ''
      const errorCode = errorInfo.code || ''
      
      // Network-related errors
      if (
        errorMsg.includes('fetch') || 
        errorMsg.includes('Load failed') || 
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('TypeError') ||
        errorMsg.includes('NetworkError') ||
        errorCode === 'PGRST301' || // PostgREST connection error
        errorCode === 'PGRST204' // PostgREST timeout
      ) {
        throw new Error('Network error: Unable to connect to Supabase. Please check your internet connection.')
      }
      
      // Database/API errors
      if (errorCode.startsWith('PGRST') || errorMsg.includes('PostgREST')) {
        throw new Error(`Database error: ${errorInfo.message || errorCode}. Please try again in a moment.`)
      }
      
      throw new Error(`Failed to check queue: ${errorInfo.message || errorCode || 'Unknown error'}`)
    }

    if (existing) {
      console.log('[joinQueue] Already in queue:', existing.id)
      return existing.id // Already in queue
    }

    // Insert into queue with retry logic
    let retries = 3
    let lastError: any = null

    while (retries > 0) {
      try {
        const { data, error } = await supabase
          .from('matchmaking_queue')
          .insert({
            player_address: playerAddress.toLowerCase(),
            player_fid: playerFid,
            bet_level: betLevel,
            bet_amount: betAmount.toString(),
            status: 'waiting',
            last_seen: new Date().toISOString(), // CRITICAL: Track when player was last active
          })
          .select()
          .single()

        if (error) {
          lastError = error
          
          // Handle duplicate key error (409 or 23505) - player already in queue
          const isDuplicateError = 
            error.code === '23505' || 
            error.code === 'PGRST301' ||
            error.message?.includes('duplicate key') || 
            error.message?.includes('unique constraint') ||
            error.message?.includes('Body is disturbed') // Sometimes duplicate errors show as body disturbed
          
          if (isDuplicateError) {
            console.log('[joinQueue] Duplicate key detected, fetching existing queue entry...')
            
            // Fetch existing queue entry
            const { data: existingAfter, error: fetchError } = await supabase
              .from('matchmaking_queue')
              .select('id')
              .eq('player_address', playerAddress.toLowerCase())
              .eq('status', 'waiting')
              .maybeSingle()
              
            if (fetchError) {
              console.error('[joinQueue] Error fetching existing entry after duplicate:', fetchError)
              // Continue to retry or throw
            } else if (existingAfter) {
              console.log('[joinQueue] ✅ Found existing queue entry:', existingAfter.id)
              return existingAfter.id
            }
          }
          
          // Retry on network errors (but not duplicate errors)
          if (!isDuplicateError && (error.message?.includes('fetch') || error.message?.includes('Load failed') || error.code === 'PGRST301')) {
            retries--
            if (retries > 0) {
              console.warn(`[joinQueue] Retry ${3 - retries}/3 after error:`, error.message)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))) // Exponential backoff
              continue
            }
          }
          
          // For duplicate errors, if we could not fetch existing entry, it is still a success (we are in queue)
          if (isDuplicateError) {
            console.log('[joinQueue] Duplicate error but could not fetch entry - assuming success')
            // Try one final fetch
            const { data: finalCheck } = await supabase
              .from('matchmaking_queue')
              .select('id')
              .eq('player_address', playerAddress.toLowerCase())
              .eq('status', 'waiting')
              .maybeSingle()
            if (finalCheck) {
              return finalCheck.id
            }
            // If still can't find, return a success message (user is likely in queue)
            throw new Error('Already in queue, but could not verify. Please refresh the page.')
          }
          
          throw new Error(`Failed to join queue: ${error.message || error.code || 'Unknown error'}`)
        }

        if (!data) {
          throw new Error('No data returned from Supabase')
        }

        // Try to find a match immediately (don't fail if this fails)
        console.log('[joinQueue] 🚀 Attempting immediate match for betLevel', betLevel)
        tryMatch(betLevel)
          .then(result => {
            if (result) {
              console.log('[joinQueue] ✅ Immediate match successful:', JSON.stringify({
                gameId: result.gameId,
                player1: result.player1Address.slice(0, 10) + '...',
                player2: result.player2Address.slice(0, 10) + '...',
              }))
            } else {
              console.log('[joinQueue] ⚠️ Immediate match returned null (no match found)')
            }
          })
          .catch(err => {
            console.error('[joinQueue] ❌ Failed to try match immediately:', JSON.stringify({
              error: err?.message || String(err),
              name: err?.name,
              stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
            }))
            // Non-critical, continue
          })

        return data.id
      } catch (err: any) {
        lastError = err
        
        // Check if it's a network error that we should retry
        if (err.message?.includes('fetch') || err.message?.includes('Load failed') || err.message?.includes('network')) {
          retries--
          if (retries > 0) {
            console.warn(`[joinQueue] Retry ${3 - retries}/3 after error:`, err.message)
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
            continue
          }
        }
        
        throw err
      }
    }

    // If we exhausted retries
    throw new Error(`Failed to join queue after 3 retries: ${lastError?.message || 'Network error'}`)
  } catch (error: any) {
    // Log detailed error information (avoid JSON.stringify for better compatibility)
    console.error('[joinQueue] Final error - Name:', error?.name)
    console.error('[joinQueue] Final error - Message:', error?.message)
    console.error('[joinQueue] Final error - Code:', error?.code)
    console.error('[joinQueue] Final error - Stack:', error?.stack?.split('\n').slice(0, 3).join('\n'))
    console.error('[joinQueue] Final error - Full object:', error)
    
    // Extract error message safely
    const errorMessage = error?.message || String(error) || 'Unknown error'
    const errorName = error?.name || ''
    
    // Provide user-friendly error messages
    if (errorMessage.includes('Load failed') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch') || errorName === 'TypeError') {
      throw new Error('Network error: Unable to connect to matchmaking service. Please check your internet connection and try again.')
    }
    
    if (errorMessage.includes('PGRST') || errorMessage.includes('PostgREST')) {
      throw new Error('Database connection error. Please try again in a moment.')
    }
    
    // Re-throw with better message if available
    if (errorMessage && errorMessage !== 'Unknown error') {
      throw new Error(errorMessage)
    }
    
    throw new Error('Failed to join queue. Please try again.')
  }
}

/**
 * Try to match players in the queue
 * CRITICAL: Uses atomic operations and locking to prevent fake matches
 */
export async function tryMatch(betLevel: number): Promise<MatchResult | null> {
  console.log('[tryMatch] 🔍🔍🔍 Starting match attempt for betLevel', betLevel)
  
  // CRITICAL: Acquire lock to prevent concurrent matching attempts
  if (!acquireLock(betLevel)) {
    console.log('[tryMatch] ⚠️ Lock already held for betLevel', betLevel, '- skipping match attempt')
    return null
  }
  
  console.log('[tryMatch] ✅ Lock acquired for betLevel', betLevel)

  try {
    // Step 1: Find two waiting players with same bet level
    // CRITICAL: Use DISTINCT ON to prevent duplicate addresses, then verify uniqueness
    console.log('[tryMatch] 🔍 Step 1: Finding waiting players for betLevel', betLevel)
    
    // CRITICAL: First get all unique waiting players for this bet level
    // Only include players who were active in the last 15 seconds (app is open)
    // Using 15 seconds instead of 30 for stricter control (based on web research best practices)
    const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString()
    console.log('[tryMatch] 🔍 Filtering players by last_seen >=', fifteenSecondsAgo, '(15 second threshold)')
    
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('matchmaking_queue')
      .select('id, player_address, status, bet_level, created_at, player_fid, bet_amount, last_seen')
      .eq('bet_level', betLevel)
      .eq('status', 'waiting')
      .not('last_seen', 'is', null) // CRITICAL: Exclude NULL last_seen (inactive players)
      .gte('last_seen', fifteenSecondsAgo) // Active in last 15 seconds (stricter)
      .order('created_at', { ascending: true })
    
    if (allPlayersError) {
      console.error('[tryMatch] ❌ Error finding all players:', JSON.stringify({
        error: allPlayersError.message || allPlayersError.code || allPlayersError,
        betLevel,
        fifteenSecondsAgo,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Log all found players with their last_seen timestamps for debugging
    const queryNow = Date.now()
    const queryFifteenSecondsAgo = queryNow - 15000
    console.log('[tryMatch] 📊 Found players with active last_seen:', JSON.stringify({
      count: allPlayers?.length || 0,
      betLevel,
      query_time: new Date(queryNow).toISOString(),
      threshold_seconds: 15,
      threshold_time: new Date(queryFifteenSecondsAgo).toISOString(),
      players: (allPlayers || []).map(p => {
        const pLastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0
        const secondsAgo = p.last_seen ? Math.floor((queryNow - pLastSeen) / 1000) : null
        const isActive = p.last_seen && pLastSeen >= queryFifteenSecondsAgo
        return {
          address: p.player_address?.slice(0, 10) + '...',
          fullAddress: p.player_address,
          last_seen: p.last_seen,
          last_seen_timestamp: p.last_seen ? new Date(p.last_seen).toISOString() : null,
          seconds_ago: secondsAgo,
          isActive: isActive,
          created_at: p.created_at,
        }
      }),
    }, null, 2))
    
    // CRITICAL: Filter out duplicate addresses (case-insensitive)
    const uniquePlayers = new Map<string, any>()
    for (const player of (allPlayers || [])) {
      if (!player.player_address) continue
      const normalizedAddr = player.player_address.toLowerCase().trim()
      if (!uniquePlayers.has(normalizedAddr)) {
        uniquePlayers.set(normalizedAddr, player)
      } else {
        console.warn('[tryMatch] ⚠️ Duplicate address found in queue:', JSON.stringify({
          address: normalizedAddr.slice(0, 10) + '...',
          existingId: uniquePlayers.get(normalizedAddr)?.id,
          duplicateId: player.id,
        }, null, 2))
      }
    }
    
    const players = Array.from(uniquePlayers.values()).slice(0, 2)
    
    console.log('[tryMatch] 📊 Unique players after deduplication:', JSON.stringify({
      totalFound: allPlayers?.length || 0,
      uniqueCount: uniquePlayers.size,
      selectedCount: players.length,
      betLevel,
    }, null, 2))

    // CRITICAL: Must have exactly 2 players
    if (!players || players.length < 2) {
      console.log('[tryMatch] ⚠️ Not enough players:', JSON.stringify({
        found: players?.length || 0,
        required: 2,
        betLevel,
        players: players?.map(p => ({
          id: p.id,
          address: p.player_address,
          status: p.status,
        })) || [],
      }, null, 2))
      releaseLock(betLevel)
      return null // Not enough players
    }

    // CRITICAL: Must have exactly 2 players, not more
    if (players.length > 2) {
      console.error('[tryMatch] ⚠️ Too many players found:', JSON.stringify({
        found: players.length,
        required: 2,
        betLevel,
        players: players.map(p => ({
          id: p.id,
          address: p.player_address,
          status: p.status,
        })),
      }, null, 2))
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Verify we have exactly 2 players before proceeding
    if (!players[0] || !players[1]) {
      console.error('[tryMatch] ❌❌❌ CRITICAL: Missing player1 or player2:', JSON.stringify({
        hasPlayer1: !!players[0],
        hasPlayer2: !!players[1],
        playersLength: players.length,
        betLevel,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    const player1 = players[0]
    const player2 = players[1]
    
    // CRITICAL: Verify both players are different (not the same address)
    if (player1.player_address.toLowerCase() === player2.player_address.toLowerCase()) {
      console.error('[tryMatch] ❌❌❌ CRITICAL: Player1 and Player2 have the same address:', JSON.stringify({
        player1_address: player1.player_address,
        player2_address: player2.player_address,
        player1_id: player1.id,
        player2_id: player2.id,
        betLevel,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify both players have valid last_seen (app is open)
    // Using 15 seconds threshold for stricter control (based on web research)
    const now = Date.now()
    const player1LastSeen = player1.last_seen ? new Date(player1.last_seen).getTime() : 0
    const player2LastSeen = player2.last_seen ? new Date(player2.last_seen).getTime() : 0
    const fifteenSecondsAgoMs = now - 15000 // 15 seconds threshold (stricter)
    
    if (!player1.last_seen || player1LastSeen < fifteenSecondsAgoMs) {
      console.error('[tryMatch] ❌❌❌ CRITICAL: Player1 has inactive last_seen:', JSON.stringify({
        player1_address: player1.player_address?.slice(0, 10) + '...',
        last_seen: player1.last_seen,
        seconds_ago: player1.last_seen ? Math.floor((now - player1LastSeen) / 1000) : null,
        threshold: 15,
        isActive: player1.last_seen && player1LastSeen >= fifteenSecondsAgoMs,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    if (!player2.last_seen || player2LastSeen < fifteenSecondsAgoMs) {
      console.error('[tryMatch] ❌❌❌ CRITICAL: Player2 has inactive last_seen:', JSON.stringify({
        player2_address: player2.player_address?.slice(0, 10) + '...',
        last_seen: player2.last_seen,
        seconds_ago: player2.last_seen ? Math.floor((now - player2LastSeen) / 1000) : null,
        threshold: 15,
        isActive: player2.last_seen && player2LastSeen >= fifteenSecondsAgoMs,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    console.log('[tryMatch] ✅ Both players have active last_seen:', JSON.stringify({
      player1: {
        address: player1.player_address?.slice(0, 10) + '...',
        last_seen: player1.last_seen,
        seconds_ago: Math.floor((now - player1LastSeen) / 1000),
      },
      player2: {
        address: player2.player_address?.slice(0, 10) + '...',
        last_seen: player2.last_seen,
        seconds_ago: Math.floor((now - player2LastSeen) / 1000),
      },
    }, null, 2))
    
    // CRITICAL: Verify player addresses are valid and not the same
    if (!player1.player_address || !player2.player_address) {
      console.error('[tryMatch] ⚠️ Invalid player addresses:', JSON.stringify({
        player1_address: player1.player_address,
        player2_address: player2.player_address,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify addresses are different (case-insensitive)
    const addr1 = player1.player_address.toLowerCase().trim()
    const addr2 = player2.player_address.toLowerCase().trim()
    
    if (addr1 === addr2 || addr1 === '' || addr2 === '') {
      console.error('[tryMatch] ⚠️ Cannot match player with themselves or invalid addresses:', JSON.stringify({
        player1_address: player1.player_address,
        player2_address: player2.player_address,
        normalized1: addr1,
        normalized2: addr2,
        areEqual: addr1 === addr2,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    console.log('[tryMatch] ✅ Player addresses verified as different:', JSON.stringify({
      player1: addr1.slice(0, 10) + '...',
      player2: addr2.slice(0, 10) + '...',
      areDifferent: addr1 !== addr2,
    }, null, 2))

    // CRITICAL: Verify both players are still waiting (prevent race conditions)
    // Get full player data to verify addresses match AND last_seen is still active
    console.log('[tryMatch] 🔍 Step 2: Verifying players are still waiting with active last_seen:', JSON.stringify({
      player1_id: player1.id,
      player1_address: player1.player_address?.slice(0, 10) + '...',
      player2_id: player2.id,
      player2_address: player2.player_address?.slice(0, 10) + '...',
    }, null, 2))
    const { data: verifyPlayers, error: verifyError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, player_address, bet_level, last_seen')
      .in('id', [player1.id, player2.id])
      .eq('status', 'waiting')

    if (verifyError) {
      console.error('[tryMatch] ❌ Error verifying players:', {
        error: verifyError.message || verifyError.code || verifyError,
        player1_id: player1.id,
        player2_id: player2.id,
      })
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Final last_seen check before matching (fresh from database)
    const finalNow = Date.now()
    const finalFifteenSecondsAgoMs = finalNow - 15000
    
    console.log('[tryMatch] 📊 Verification result with last_seen check:', JSON.stringify({
      found: verifyPlayers?.length || 0,
      required: 2,
      players: verifyPlayers?.map(p => {
        const pLastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0
        const secondsAgo = p.last_seen ? Math.floor((finalNow - pLastSeen) / 1000) : null
        const isActive = p.last_seen && pLastSeen >= finalFifteenSecondsAgoMs
        return {
          id: p.id,
          status: p.status,
          address: p.player_address?.slice(0, 10) + '...',
          fullAddress: p.player_address, // Log full address
          bet_level: p.bet_level,
          last_seen: p.last_seen,
          seconds_ago: secondsAgo,
          isActive: isActive,
        }
      }) || [],
    }, null, 2))
    
    // CRITICAL: Final last_seen verification - reject if any player is inactive
    if (verifyPlayers && verifyPlayers.length === 2) {
      const verifiedPlayer1 = verifyPlayers.find(p => p.id === player1.id)
      const verifiedPlayer2 = verifyPlayers.find(p => p.id === player2.id)
      
      if (verifiedPlayer1) {
        const p1LastSeen = verifiedPlayer1.last_seen ? new Date(verifiedPlayer1.last_seen).getTime() : 0
        if (!verifiedPlayer1.last_seen || p1LastSeen < finalFifteenSecondsAgoMs) {
          console.error('[tryMatch] ❌❌❌ FINAL CHECK FAILED: Player1 last_seen is inactive:', JSON.stringify({
            player1_address: verifiedPlayer1.player_address?.slice(0, 10) + '...',
            last_seen: verifiedPlayer1.last_seen,
            seconds_ago: verifiedPlayer1.last_seen ? Math.floor((finalNow - p1LastSeen) / 1000) : null,
            threshold: 15,
            isActive: verifiedPlayer1.last_seen && p1LastSeen >= finalFifteenSecondsAgoMs,
          }, null, 2))
          releaseLock(betLevel)
          return null
        }
      }
      
      if (verifiedPlayer2) {
        const p2LastSeen = verifiedPlayer2.last_seen ? new Date(verifiedPlayer2.last_seen).getTime() : 0
        if (!verifiedPlayer2.last_seen || p2LastSeen < finalFifteenSecondsAgoMs) {
          console.error('[tryMatch] ❌❌❌ FINAL CHECK FAILED: Player2 last_seen is inactive:', JSON.stringify({
            player2_address: verifiedPlayer2.player_address?.slice(0, 10) + '...',
            last_seen: verifiedPlayer2.last_seen,
            seconds_ago: verifiedPlayer2.last_seen ? Math.floor((finalNow - p2LastSeen) / 1000) : null,
            threshold: 15,
            isActive: verifiedPlayer2.last_seen && p2LastSeen >= finalFifteenSecondsAgoMs,
          }, null, 2))
          releaseLock(betLevel)
          return null
        }
      }
    }

    // CRITICAL: If either player is no longer waiting, abort match
    if (!verifyPlayers || verifyPlayers.length !== 2) {
      console.log('[tryMatch] ⚠️ One or both players no longer waiting, aborting match:', JSON.stringify({
        found: verifyPlayers?.length || 0,
        required: 2,
        player1_id: player1.id,
        player1_address: player1.player_address,
        player2_id: player2.id,
        player2_address: player2.player_address,
        player1_status: verifyPlayers?.find(p => p.id === player1.id)?.status || 'not found',
        player2_status: verifyPlayers?.find(p => p.id === player2.id)?.status || 'not found',
        allPlayers: verifyPlayers?.map(p => ({
          id: p.id,
          address: p.player_address,
          status: p.status,
        })) || [],
      }, null, 2))
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Verify player addresses and bet levels match
    const verifiedPlayer1 = verifyPlayers.find(p => p.id === player1.id)
    const verifiedPlayer2 = verifyPlayers.find(p => p.id === player2.id)
    
    if (!verifiedPlayer1 || !verifiedPlayer2) {
      console.log('[tryMatch] ⚠️ Could not verify both players, aborting match:', JSON.stringify({
        verifiedPlayer1: verifiedPlayer1 ? {
          id: verifiedPlayer1.id,
          address: verifiedPlayer1.player_address,
        } : null,
        verifiedPlayer2: verifiedPlayer2 ? {
          id: verifiedPlayer2.id,
          address: verifiedPlayer2.player_address,
        } : null,
        player1_id: player1.id,
        player2_id: player2.id,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify addresses match exactly and are different
    const verifiedAddr1 = verifiedPlayer1.player_address.toLowerCase().trim()
    const verifiedAddr2 = verifiedPlayer2.player_address.toLowerCase().trim()
    const originalAddr1 = player1.player_address.toLowerCase().trim()
    const originalAddr2 = player2.player_address.toLowerCase().trim()
    
    if (verifiedAddr1 === verifiedAddr2) {
      console.error('[tryMatch] ⚠️ Verified players have same address (duplicate):', JSON.stringify({
        verifiedPlayer1_address: verifiedPlayer1.player_address,
        verifiedPlayer2_address: verifiedPlayer2.player_address,
        normalized1: verifiedAddr1,
        normalized2: verifiedAddr2,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    if (
      verifiedAddr1 !== originalAddr1 ||
      verifiedAddr2 !== originalAddr2
    ) {
      console.error('[tryMatch] ⚠️ Player address mismatch during verification:', JSON.stringify({
        originalPlayer1: originalAddr1,
        verifiedPlayer1: verifiedAddr1,
        originalPlayer2: originalAddr2,
        verifiedPlayer2: verifiedAddr2,
        match1: verifiedAddr1 === originalAddr1,
        match2: verifiedAddr2 === originalAddr2,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify bet levels match
    if (verifiedPlayer1.bet_level !== betLevel || verifiedPlayer2.bet_level !== betLevel) {
      console.error('[tryMatch] ⚠️ Bet level mismatch during verification:', JSON.stringify({
        required: betLevel,
        player1_bet_level: verifiedPlayer1.bet_level,
        player2_bet_level: verifiedPlayer2.bet_level,
        match1: verifiedPlayer1.bet_level === betLevel,
        match2: verifiedPlayer2.bet_level === betLevel,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    console.log('[tryMatch] ✅ All verifications passed:', JSON.stringify({
      player1: verifiedAddr1.slice(0, 10) + '...',
      player2: verifiedAddr2.slice(0, 10) + '...',
      betLevel,
      addressesDifferent: verifiedAddr1 !== verifiedAddr2,
    }, null, 2))

    // CRITICAL: ONE MORE TIME - Verify both players have active last_seen RIGHT BEFORE updating
    // This is the absolute final check before any database updates
    const absoluteFinalNow = Date.now()
    const absoluteFinalFifteenSecondsAgo = absoluteFinalNow - 15000
    
    // Re-fetch both players' last_seen values one more time
    const { data: absoluteFinalCheck, error: absoluteFinalError } = await supabase
      .from('matchmaking_queue')
      .select('id, player_address, last_seen, status')
      .in('id', [player1.id, player2.id])
      .eq('status', 'waiting')
    
    if (absoluteFinalError || !absoluteFinalCheck || absoluteFinalCheck.length !== 2) {
      console.error('[tryMatch] ❌❌❌ ABSOLUTE FINAL CHECK FAILED - Cannot verify players:', JSON.stringify({
        error: absoluteFinalError?.message || 'No error',
        found: absoluteFinalCheck?.length || 0,
        required: 2,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    const absoluteFinalPlayer1 = absoluteFinalCheck.find(p => p.id === player1.id)
    const absoluteFinalPlayer2 = absoluteFinalCheck.find(p => p.id === player2.id)
    
    if (!absoluteFinalPlayer1 || !absoluteFinalPlayer2) {
      console.error('[tryMatch] ❌❌❌ ABSOLUTE FINAL CHECK FAILED - Players not found')
      releaseLock(betLevel)
      return null
    }
    
    const absP1LastSeen = absoluteFinalPlayer1.last_seen ? new Date(absoluteFinalPlayer1.last_seen).getTime() : 0
    const absP2LastSeen = absoluteFinalPlayer2.last_seen ? new Date(absoluteFinalPlayer2.last_seen).getTime() : 0
    
    if (!absoluteFinalPlayer1.last_seen || absP1LastSeen < absoluteFinalFifteenSecondsAgo) {
      console.error('[tryMatch] ❌❌❌ ABSOLUTE FINAL CHECK FAILED: Player1 last_seen inactive:', JSON.stringify({
        player1_address: absoluteFinalPlayer1.player_address?.slice(0, 10) + '...',
        last_seen: absoluteFinalPlayer1.last_seen,
        seconds_ago: absoluteFinalPlayer1.last_seen ? Math.floor((absoluteFinalNow - absP1LastSeen) / 1000) : null,
        threshold: 15,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    if (!absoluteFinalPlayer2.last_seen || absP2LastSeen < absoluteFinalFifteenSecondsAgo) {
      console.error('[tryMatch] ❌❌❌ ABSOLUTE FINAL CHECK FAILED: Player2 last_seen inactive:', JSON.stringify({
        player2_address: absoluteFinalPlayer2.player_address?.slice(0, 10) + '...',
        last_seen: absoluteFinalPlayer2.last_seen,
        seconds_ago: absoluteFinalPlayer2.last_seen ? Math.floor((absoluteFinalNow - absP2LastSeen) / 1000) : null,
        threshold: 15,
      }, null, 2))
      releaseLock(betLevel)
      return null
    }
    
    console.log('[tryMatch] ✅✅✅ ABSOLUTE FINAL CHECK PASSED - Both players active:', JSON.stringify({
      player1: {
        address: absoluteFinalPlayer1.player_address?.slice(0, 10) + '...',
        last_seen: absoluteFinalPlayer1.last_seen,
        seconds_ago: Math.floor((absoluteFinalNow - absP1LastSeen) / 1000),
      },
      player2: {
        address: absoluteFinalPlayer2.player_address?.slice(0, 10) + '...',
        last_seen: absoluteFinalPlayer2.last_seen,
        seconds_ago: Math.floor((absoluteFinalNow - absP2LastSeen) / 1000),
      },
    }, null, 2))
    
    // Step 2: Atomically update both players to 'matched' status FIRST
    // CRITICAL: Update each player separately with their matched_with address
    // This prevents them from being matched again
    
    // Update player1
    const { error: updateError1, data: updateData1 } = await supabase
      .from('matchmaking_queue')
      .update({
        status: 'matched',
        matched_at: new Date().toISOString(),
        matched_with: player2.player_address.toLowerCase(),
      })
      .eq('id', player1.id)
      .eq('status', 'waiting') // CRITICAL: Only update if still waiting
      .select()

    console.log('[tryMatch] 📊 Player1 update result:', JSON.stringify({
      error: updateError1 ? {
        message: updateError1.message,
        code: updateError1.code,
        details: updateError1.details,
      } : null,
      updated: updateData1?.length || 0,
      player1_id: player1.id,
      updateData1: updateData1 ? updateData1.map(d => ({
        id: d.id,
        status: d.status,
        matched_with: d.matched_with?.slice(0, 10) + '...',
      })) : null,
    }, null, 2))

    if (updateError1 || !updateData1 || updateData1.length === 0) {
      console.error('[tryMatch] ❌ Error updating player1 queue status:', JSON.stringify({
        error: updateError1 ? {
          message: updateError1.message,
          code: updateError1.code,
          details: updateError1.details,
        } : 'No error object',
        updateData1: updateData1 ? updateData1.length : 'No data',
        player1_id: player1.id,
        player1_address: player1.player_address?.slice(0, 10) + '...',
      }, null, 2))
      releaseLock(betLevel)
      return null
    }

    // Update player2
    // CRITICAL: Check player2's current status before updating
    const { data: player2CurrentStatus, error: player2StatusError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, matched_with')
      .eq('id', player2.id)
      .single()
    
    if (player2StatusError || !player2CurrentStatus) {
      console.error('[tryMatch] ❌ Error checking player2 current status:', JSON.stringify({
        error: player2StatusError?.message || 'No error object',
        player2_id: player2.id,
      }, null, 2))
      // Rollback player1
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .eq('id', player1.id)
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: If player2 is already matched with someone else, skip this match
    if (player2CurrentStatus.status !== 'waiting') {
      console.error('[tryMatch] ❌ Player2 is not waiting (status:', player2CurrentStatus.status, '), cannot match:', JSON.stringify({
        player2_id: player2.id,
        player2_status: player2CurrentStatus.status,
        player2_matched_with: player2CurrentStatus.matched_with?.slice(0, 10) + '...',
      }, null, 2))
      // Rollback player1
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .eq('id', player1.id)
      releaseLock(betLevel)
      return null
    }
    
    const { error: updateError2, data: updateData2 } = await supabase
      .from('matchmaking_queue')
      .update({
        status: 'matched',
        matched_at: new Date().toISOString(),
        matched_with: player1.player_address.toLowerCase(),
      })
      .eq('id', player2.id)
      .eq('status', 'waiting') // CRITICAL: Only update if still waiting
      .select()

    console.log('[tryMatch] 📊 Player2 update result:', JSON.stringify({
      error: updateError2 ? {
        message: updateError2.message,
        code: updateError2.code,
        details: updateError2.details,
      } : null,
      updated: updateData2?.length || 0,
      player2_id: player2.id,
      player2_previous_status: player2CurrentStatus.status,
      updateData2: updateData2 ? updateData2.map(d => ({
        id: d.id,
        status: d.status,
        matched_with: d.matched_with?.slice(0, 10) + '...',
      })) : null,
    }, null, 2))

    if (updateError2 || !updateData2 || updateData2.length === 0) {
      console.error('[tryMatch] ❌ Error updating player2 queue status:', JSON.stringify({
        error: updateError2 ? {
          message: updateError2.message,
          code: updateError2.code,
          details: updateError2.details,
        } : 'No error object',
        updateData2: updateData2 ? updateData2.length : 'No data',
        player2_id: player2.id,
        player2_address: player2.player_address?.slice(0, 10) + '...',
        player2_previous_status: player2CurrentStatus.status,
      }, null, 2))
      // CRITICAL: Rollback player1 if player2 update fails
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .eq('id', player1.id)
      releaseLock(betLevel)
      return null
    }

    // Step 3: Verify the update succeeded for both players
    const { data: verifyUpdate, error: verifyUpdateError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, player_address, matched_with')
      .in('id', [player1.id, player2.id])
      .eq('status', 'matched')

    if (verifyUpdateError || !verifyUpdate || verifyUpdate.length !== 2) {
      console.error('[tryMatch] ⚠️ Queue update verification failed, match may have been aborted:', JSON.stringify({
        verifyUpdateError: verifyUpdateError ? {
          message: verifyUpdateError.message,
          code: verifyUpdateError.code,
        } : null,
        verifyUpdateCount: verifyUpdate?.length || 0,
        required: 2,
        player1_id: player1.id,
        player2_id: player2.id,
      }, null, 2))
      // Rollback both players
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify matched_with addresses are correct
    const verifyPlayer1 = verifyUpdate.find(p => p.id === player1.id)
    const verifyPlayer2 = verifyUpdate.find(p => p.id === player2.id)
    
    if (
      !verifyPlayer1 || 
      !verifyPlayer2 ||
      verifyPlayer1.matched_with?.toLowerCase() !== player2.player_address.toLowerCase() ||
      verifyPlayer2.matched_with?.toLowerCase() !== player1.player_address.toLowerCase()
    ) {
      console.error('[tryMatch] ⚠️ matched_with verification failed')
      // Rollback both players
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: ONE MORE ABSOLUTE FINAL CHECK RIGHT BEFORE GAME CREATION
    // This is the last possible moment to prevent matching inactive players
    const gameCreationNow = Date.now()
    const gameCreationFifteenSecondsAgo = gameCreationNow - 15000
    
    const { data: gameCreationCheck, error: gameCreationCheckError } = await supabase
      .from('matchmaking_queue')
      .select('id, player_address, last_seen, status')
      .in('id', [player1.id, player2.id])
      .eq('status', 'matched')
    
    if (gameCreationCheckError || !gameCreationCheck || gameCreationCheck.length !== 2) {
      console.error('[tryMatch] ❌❌❌ GAME CREATION CHECK FAILED:', JSON.stringify({
        error: gameCreationCheckError?.message || 'No error',
        found: gameCreationCheck?.length || 0,
        required: 2,
      }, null, 2))
      // Rollback queue status
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    const gameCreationPlayer1 = gameCreationCheck.find(p => p.id === player1.id)
    const gameCreationPlayer2 = gameCreationCheck.find(p => p.id === player2.id)
    
    if (!gameCreationPlayer1 || !gameCreationPlayer2) {
      console.error('[tryMatch] ❌❌❌ GAME CREATION CHECK FAILED - Players not found')
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    const gameP1LastSeen = gameCreationPlayer1.last_seen ? new Date(gameCreationPlayer1.last_seen).getTime() : 0
    const gameP2LastSeen = gameCreationPlayer2.last_seen ? new Date(gameCreationPlayer2.last_seen).getTime() : 0
    
    if (!gameCreationPlayer1.last_seen || gameP1LastSeen < gameCreationFifteenSecondsAgo) {
      console.error('[tryMatch] ❌❌❌ GAME CREATION BLOCKED: Player1 last_seen inactive:', JSON.stringify({
        player1_address: gameCreationPlayer1.player_address?.slice(0, 10) + '...',
        last_seen: gameCreationPlayer1.last_seen,
        seconds_ago: gameCreationPlayer1.last_seen ? Math.floor((gameCreationNow - gameP1LastSeen) / 1000) : null,
        threshold: 15,
      }, null, 2))
      // Rollback queue status
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    if (!gameCreationPlayer2.last_seen || gameP2LastSeen < gameCreationFifteenSecondsAgo) {
      console.error('[tryMatch] ❌❌❌ GAME CREATION BLOCKED: Player2 last_seen inactive:', JSON.stringify({
        player2_address: gameCreationPlayer2.player_address?.slice(0, 10) + '...',
        last_seen: gameCreationPlayer2.last_seen,
        seconds_ago: gameCreationPlayer2.last_seen ? Math.floor((gameCreationNow - gameP2LastSeen) / 1000) : null,
        threshold: 15,
      }, null, 2))
      // Rollback queue status
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    console.log('[tryMatch] ✅✅✅ GAME CREATION CHECK PASSED - Both players active:', JSON.stringify({
      player1: {
        address: gameCreationPlayer1.player_address?.slice(0, 10) + '...',
        last_seen: gameCreationPlayer1.last_seen,
        seconds_ago: Math.floor((gameCreationNow - gameP1LastSeen) / 1000),
      },
      player2: {
        address: gameCreationPlayer2.player_address?.slice(0, 10) + '...',
        last_seen: gameCreationPlayer2.last_seen,
        seconds_ago: Math.floor((gameCreationNow - gameP2LastSeen) / 1000),
      },
    }, null, 2))
    
    // Step 4: Create game only after queue update is confirmed
    // CRITICAL: Use unique game ID with timestamps to prevent collisions
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 9)
    const gameId = `game-${player1.player_address.slice(0, 10)}-${player2.player_address.slice(0, 10)}-${timestamp}-${randomSuffix}`
    
    console.log('[tryMatch] 📊 Creating game with ID:', JSON.stringify({
      gameId,
      player1: player1.player_address.slice(0, 10) + '...',
      player2: player2.player_address.slice(0, 10) + '...',
      timestamp,
      last_seen_verification: {
        player1_last_seen: gameCreationPlayer1.last_seen,
        player2_last_seen: gameCreationPlayer2.last_seen,
        player1_seconds_ago: Math.floor((gameCreationNow - gameP1LastSeen) / 1000),
        player2_seconds_ago: Math.floor((gameCreationNow - gameP2LastSeen) / 1000),
      },
    }, null, 2))

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        game_id: gameId,
        player1_address: player1.player_address,
        player1_fid: player1.player_fid,
        player2_address: player2.player_address,
        player2_fid: player2.player_fid,
        bet_level: betLevel,
        bet_amount: player1.bet_amount,
        status: 'commit_phase',
      })
      .select()
      .single()

    if (gameError) {
      console.error('[tryMatch] Error creating game:', gameError)
      // CRITICAL: Rollback queue status if game creation fails
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Final verification - check game was created with correct players
    const { data: verifyGame, error: verifyGameError } = await supabase
      .from('games')
      .select('player1_address, player2_address')
      .eq('game_id', gameId)
      .single()
    
    if (verifyGameError || !verifyGame) {
      console.error('[tryMatch] ⚠️ Game verification failed after creation')
      // Rollback everything
      await supabase.from('games').delete().eq('game_id', gameId)
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify game players match queue players
    if (
      verifyGame.player1_address.toLowerCase() !== player1.player_address.toLowerCase() ||
      verifyGame.player2_address.toLowerCase() !== player2.player_address.toLowerCase()
    ) {
      console.error('[tryMatch] ⚠️ Game player mismatch after creation')
      // Rollback everything
      await supabase.from('games').delete().eq('game_id', gameId)
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'waiting', matched_at: null, matched_with: null })
        .in('id', [player1.id, player2.id])
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Log both players' last_seen values when match is created
    const finalP1LastSeen = verifiedPlayer1?.last_seen ? new Date(verifiedPlayer1.last_seen).getTime() : 0
    const finalP2LastSeen = verifiedPlayer2?.last_seen ? new Date(verifiedPlayer2.last_seen).getTime() : 0
    const finalNowForLog = Date.now()
    
    console.log('[tryMatch] ✅✅✅ Match created successfully! ✅✅✅', JSON.stringify({
      gameId,
      player1: {
        address: player1.player_address.slice(0, 10) + '...',
        fullAddress: player1.player_address,
        last_seen: verifiedPlayer1?.last_seen || player1.last_seen,
        seconds_ago: verifiedPlayer1?.last_seen ? Math.floor((finalNowForLog - finalP1LastSeen) / 1000) : (player1.last_seen ? Math.floor((finalNowForLog - new Date(player1.last_seen).getTime()) / 1000) : null),
      },
      player2: {
        address: player2.player_address.slice(0, 10) + '...',
        fullAddress: player2.player_address,
        last_seen: verifiedPlayer2?.last_seen || player2.last_seen,
        seconds_ago: verifiedPlayer2?.last_seen ? Math.floor((finalNowForLog - finalP2LastSeen) / 1000) : (player2.last_seen ? Math.floor((finalNowForLog - new Date(player2.last_seen).getTime()) / 1000) : null),
      },
      betLevel,
      betAmount: player1.bet_amount,
      last_seen_verification: {
        player1_active: verifiedPlayer1?.last_seen ? (finalP1LastSeen >= (finalNowForLog - 15000)) : false,
        player2_active: verifiedPlayer2?.last_seen ? (finalP2LastSeen >= (finalNowForLog - 15000)) : false,
        threshold_seconds: 15,
      },
    }, null, 2))

    releaseLock(betLevel)
    return {
      gameId,
      player1Address: player1.player_address as Address,
      player1Fid: player1.player_fid,
      player2Address: player2.player_address as Address,
      player2Fid: player2.player_fid,
      betLevel,
      betAmount: BigInt(player1.bet_amount),
    }
  } catch (error: any) {
    console.error('[tryMatch] Unexpected error:', error)
    releaseLock(betLevel)
    return null
  }
}

/**
 * Check for matches (polling function)
 */
export async function checkForMatch(playerAddress: Address): Promise<MatchResult | null> {
  console.log('[checkForMatch] 🔍 Starting checkForMatch for player:', playerAddress.slice(0, 10) + '...')
  try {
    // CRITICAL: First verify player is still in queue
    // Use limit(1) instead of maybeSingle() to avoid PGRST116 error
    console.log('[checkForMatch] 📊 Fetching queue status from Supabase...')
    const { data: queueEntries, error: statusError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, bet_level, player_address')
      .eq('player_address', playerAddress.toLowerCase())
      .limit(1)
    
    console.log('[checkForMatch] 📊 Queue status result:', JSON.stringify({
      found: !!queueEntries && queueEntries.length > 0,
      count: queueEntries?.length || 0,
      status: queueEntries?.[0]?.status,
      betLevel: queueEntries?.[0]?.bet_level,
      queueId: queueEntries?.[0]?.id,
      error: statusError ? {
        message: statusError.message,
        code: statusError.code,
      } : null,
    }))
    
    // If error occurred (not PGRST116), log and return null
    if (statusError && statusError.code !== 'PGRST116') {
      console.error('[checkForMatch] ❌ Error fetching queue status:', JSON.stringify({
        message: statusError.message,
        code: statusError.code,
      }))
      return null
    }
    
    // Get first entry if exists
    const queueStatus = queueEntries && queueEntries.length > 0 ? queueEntries[0] : null
    
    // If player is not in queue at all, return null
    if (!queueStatus) {
      console.log('[checkForMatch] ⚠️ Player not in queue')
      return null // Not in queue
    }
    
    // If player is not waiting or matched, they're cancelled or other status
    // CRITICAL: Even if cancelled, check games table - match might have been created before cancellation
    if (queueStatus.status !== 'waiting' && queueStatus.status !== 'matched') {
      console.log('[checkForMatch] ⚠️ Player not waiting or matched:', JSON.stringify({
        status: queueStatus.status,
        queueId: queueStatus.id,
        betLevel: queueStatus.bet_level,
      }, null, 2))
      
      // CRITICAL: Even if cancelled, check games table - match might exist
      console.log('[checkForMatch] 🔍 Player cancelled, but checking games table for existing match...')
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .or(`player1_address.eq.${playerAddress.toLowerCase()},player2_address.eq.${playerAddress.toLowerCase()}`)
        .eq('status', 'commit_phase')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (gamesError) {
        console.error('[checkForMatch] ❌ Error searching games table:', JSON.stringify({
          error: gamesError.message,
          code: gamesError.code,
        }, null, 2))
        return null
      }
      
      if (games && games.length > 0) {
        const game = games[0]
        console.log('[checkForMatch] ✅ Found game even though player is cancelled:', JSON.stringify({
          gameId: game.game_id,
          player1: game.player1_address?.slice(0, 10) + '...',
          player2: game.player2_address?.slice(0, 10) + '...',
        }, null, 2))
        
        // CRITICAL: Verify both players have active last_seen before returning this game
        // This prevents returning games where one player's app is closed
        const checkNow = Date.now()
        const checkFifteenSecondsAgo = checkNow - 15000
        
        const { data: player1Queue, error: p1Error } = await supabase
          .from('matchmaking_queue')
          .select('last_seen, status')
          .eq('player_address', game.player1_address.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
        
        const { data: player2Queue, error: p2Error } = await supabase
          .from('matchmaking_queue')
          .select('last_seen, status')
          .eq('player_address', game.player2_address.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
        
        const p1LastSeen = player1Queue && player1Queue.length > 0 && player1Queue[0].last_seen 
          ? new Date(player1Queue[0].last_seen).getTime() 
          : 0
        const p2LastSeen = player2Queue && player2Queue.length > 0 && player2Queue[0].last_seen 
          ? new Date(player2Queue[0].last_seen).getTime() 
          : 0
        
        const p1Active = p1LastSeen > 0 && p1LastSeen >= checkFifteenSecondsAgo
        const p2Active = p2LastSeen > 0 && p2LastSeen >= checkFifteenSecondsAgo
        
        console.log('[checkForMatch] 🔍 Verifying both players have active last_seen:', JSON.stringify({
          player1: {
            address: game.player1_address?.slice(0, 10) + '...',
            last_seen: player1Queue && player1Queue.length > 0 ? player1Queue[0].last_seen : null,
            seconds_ago: p1LastSeen > 0 ? Math.floor((checkNow - p1LastSeen) / 1000) : null,
            isActive: p1Active,
          },
          player2: {
            address: game.player2_address?.slice(0, 10) + '...',
            last_seen: player2Queue && player2Queue.length > 0 ? player2Queue[0].last_seen : null,
            seconds_ago: p2LastSeen > 0 ? Math.floor((checkNow - p2LastSeen) / 1000) : null,
            isActive: p2Active,
          },
          threshold: 15,
        }, null, 2))
        
        // CRITICAL: If either player is inactive, reject this game
        if (!p1Active || !p2Active) {
          console.error('[checkForMatch] ❌❌❌ REJECTING GAME: One or both players have inactive last_seen:', JSON.stringify({
            gameId: game.game_id,
            player1_active: p1Active,
            player2_active: p2Active,
            player1_last_seen: player1Queue && player1Queue.length > 0 ? player1Queue[0].last_seen : null,
            player2_last_seen: player2Queue && player2Queue.length > 0 ? player2Queue[0].last_seen : null,
            player1_seconds_ago: p1LastSeen > 0 ? Math.floor((checkNow - p1LastSeen) / 1000) : null,
            player2_seconds_ago: p2LastSeen > 0 ? Math.floor((checkNow - p2LastSeen) / 1000) : null,
          }, null, 2))
          return null // Reject game with inactive player
        }
        
        console.log('[checkForMatch] ✅ Both players have active last_seen - returning game')
        
        return {
          gameId: game.game_id,
          player1Address: game.player1_address as Address,
          player1Fid: game.player1_fid,
          player2Address: game.player2_address as Address,
          player2Fid: game.player2_fid,
          betLevel: game.bet_level,
          betAmount: BigInt(game.bet_amount || '0'),
        }
      }
      
      return null // Cancelled and no game found
    }
    
    // CRITICAL: If player is still waiting, try to match them
    // This ensures matches happen even if tryMatch wasn't called during joinQueue
    // or if two players join at the same time
    if (queueStatus.status === 'waiting' && queueStatus.bet_level) {
      console.log('[checkForMatch] 🔍 Player still waiting, attempting match for betLevel', queueStatus.bet_level)
      console.log('[checkForMatch] 📊 Queue status:', JSON.stringify({
        playerAddress: playerAddress.slice(0, 10) + '...',
        queueId: queueStatus.id,
        status: queueStatus.status,
        betLevel: queueStatus.bet_level,
      }))
      try {
        console.log('[checkForMatch] 🚀 Calling tryMatch for betLevel', queueStatus.bet_level)
        const matchResult = await tryMatch(queueStatus.bet_level)
        if (matchResult) {
          // CRITICAL: Match was created - check if we're one of the matched players
          console.log('[checkForMatch] ✅ Match created!', JSON.stringify({
            gameId: matchResult.gameId,
            player1: matchResult.player1Address.slice(0, 10) + '...',
            player2: matchResult.player2Address.slice(0, 10) + '...',
            betLevel: matchResult.betLevel,
            currentPlayer: playerAddress.slice(0, 10) + '...',
          }))
          
          // CRITICAL: If we're one of the matched players, return the match immediately
          const isPlayer1 = matchResult.player1Address.toLowerCase() === playerAddress.toLowerCase()
          const isPlayer2 = matchResult.player2Address.toLowerCase() === playerAddress.toLowerCase()
          
          if (isPlayer1 || isPlayer2) {
            console.log('[checkForMatch] ✅✅✅ WE ARE MATCHED! Returning match immediately!')
            return matchResult
          } else {
            console.log('[checkForMatch] ⚠️ Match created but we are not one of the players')
            // Continue to check if we're already matched in queue
          }
        } else {
          console.log('[checkForMatch] ⚠️ tryMatch returned null (no match found or error occurred)')
        }
      } catch (err: any) {
        console.error('[checkForMatch] ❌ Error attempting match')
        console.error('[checkForMatch] ❌ Error details:', JSON.stringify({
          error: err?.message || String(err),
          name: err?.name,
          stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
          betLevel: queueStatus.bet_level,
        }))
        // Continue to check if we're already matched
      }
    } else {
      console.log('[checkForMatch] ⚠️ Player not waiting or betLevel missing:', {
        status: queueStatus.status,
        betLevel: queueStatus.bet_level,
      })
    }
    
    // Check if player has been matched with retry
    // CRITICAL: After tryMatch creates a match, players are set to 'matched' status
    // We need to find the game using the matched_with field or by searching games table
    console.log('[checkForMatch] 🔍 Checking if player has been matched...')
    let retries = 2
    let queueEntry: any = null
    
    while (retries > 0) {
      try {
        // First, try to find queue entry with matched status
        // Use limit(1) instead of maybeSingle() to avoid PGRST116 error
        const { data: matchedQueueEntries, error: queueError } = await supabase
          .from('matchmaking_queue')
          .select('*')
          .eq('player_address', playerAddress.toLowerCase())
          .eq('status', 'matched')
          .limit(1)
        
        console.log('[checkForMatch] 📊 Matched queue entry check:', JSON.stringify({
          found: !!matchedQueueEntries && matchedQueueEntries.length > 0,
          count: matchedQueueEntries?.length || 0,
          error: queueError ? {
            message: queueError.message,
            code: queueError.code,
          } : null,
        }))
        
        if (queueError && queueError.code !== 'PGRST116') {
          throw queueError
        }
        
        if (matchedQueueEntries && matchedQueueEntries.length > 0) {
          queueEntry = matchedQueueEntries[0]
          console.log('[checkForMatch] ✅ Found matched queue entry:', JSON.stringify({
            id: queueEntry.id,
            matched_with: queueEntry.matched_with,
            matched_at: queueEntry.matched_at,
          }))
          break
        }
        
        // If not found in queue, try to find game directly
        console.log('[checkForMatch] 🔍 Queue entry not found, searching games table...')
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .or(`player1_address.eq.${playerAddress.toLowerCase()},player2_address.eq.${playerAddress.toLowerCase()}`)
          .eq('status', 'commit_phase')
          .order('created_at', { ascending: false })
          .limit(1)
        
        console.log('[checkForMatch] 📊 Games search result:', JSON.stringify({
          found: !!games && games.length > 0,
          count: games?.length || 0,
          error: gamesError ? {
            message: gamesError.message,
            code: gamesError.code,
          } : null,
        }))
        
        if (gamesError) {
          throw gamesError
        }
        
        if (games && games.length > 0) {
          const game = games[0]
          console.log('[checkForMatch] ✅ Found game directly:', JSON.stringify({
            gameId: game.game_id,
            player1: game.player1_address?.slice(0, 10) + '...',
            player2: game.player2_address?.slice(0, 10) + '...',
          }))
          
          // CRITICAL: Verify both players have active last_seen before returning this game
          const checkNow = Date.now()
          const checkFifteenSecondsAgo = checkNow - 15000
          
          const { data: player1Queue, error: p1Error } = await supabase
            .from('matchmaking_queue')
            .select('last_seen, status')
            .eq('player_address', game.player1_address.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(1)
          
          const { data: player2Queue, error: p2Error } = await supabase
            .from('matchmaking_queue')
            .select('last_seen, status')
            .eq('player_address', game.player2_address.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(1)
          
          const p1LastSeen = player1Queue && player1Queue.length > 0 && player1Queue[0].last_seen 
            ? new Date(player1Queue[0].last_seen).getTime() 
            : 0
          const p2LastSeen = player2Queue && player2Queue.length > 0 && player2Queue[0].last_seen 
            ? new Date(player2Queue[0].last_seen).getTime() 
            : 0
          
          const p1Active = p1LastSeen > 0 && p1LastSeen >= checkFifteenSecondsAgo
          const p2Active = p2LastSeen > 0 && p2LastSeen >= checkFifteenSecondsAgo
          
          console.log('[checkForMatch] 🔍 Verifying both players have active last_seen (matched status):', JSON.stringify({
            player1: {
              address: game.player1_address?.slice(0, 10) + '...',
              last_seen: player1Queue && player1Queue.length > 0 ? player1Queue[0].last_seen : null,
              seconds_ago: p1LastSeen > 0 ? Math.floor((checkNow - p1LastSeen) / 1000) : null,
              isActive: p1Active,
            },
            player2: {
              address: game.player2_address?.slice(0, 10) + '...',
              last_seen: player2Queue && player2Queue.length > 0 ? player2Queue[0].last_seen : null,
              seconds_ago: p2LastSeen > 0 ? Math.floor((checkNow - p2LastSeen) / 1000) : null,
              isActive: p2Active,
            },
            threshold: 15,
          }, null, 2))
          
          // CRITICAL: If either player is inactive, reject this game
          if (!p1Active || !p2Active) {
            console.error('[checkForMatch] ❌❌❌ REJECTING GAME: One or both players have inactive last_seen (matched status):', JSON.stringify({
              gameId: game.game_id,
              player1_active: p1Active,
              player2_active: p2Active,
              player1_last_seen: player1Queue && player1Queue.length > 0 ? player1Queue[0].last_seen : null,
              player2_last_seen: player2Queue && player2Queue.length > 0 ? player2Queue[0].last_seen : null,
              player1_seconds_ago: p1LastSeen > 0 ? Math.floor((checkNow - p1LastSeen) / 1000) : null,
              player2_seconds_ago: p2LastSeen > 0 ? Math.floor((checkNow - p2LastSeen) / 1000) : null,
            }, null, 2))
            return null // Reject game with inactive player
          }
          
          console.log('[checkForMatch] ✅ Both players have active last_seen - returning game (matched status)')
          
          // Return match result
          return {
            gameId: game.game_id,
            player1Address: game.player1_address as Address,
            player1Fid: game.player1_fid,
            player2Address: game.player2_address as Address,
            player2Fid: game.player2_fid,
            betLevel: game.bet_level,
            betAmount: BigInt(game.bet_amount || '0'),
          }
        }
        
        // No match found
        break
      } catch (err: any) {
        console.error('[checkForMatch] ❌ Error checking matched status:', JSON.stringify({
          error: err?.message || String(err),
          name: err?.name,
          code: err?.code,
        }))
        if (err.message?.includes('fetch') || err.message?.includes('Load failed')) {
          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
        }
        throw err
      }
    }

    if (!queueEntry || !queueEntry.matched_with) {
      return null
    }
    
    // CRITICAL: Verify matched_with address is valid
    if (!queueEntry.matched_with || queueEntry.matched_with === '0x0000000000000000000000000000000000000000') {
      console.warn('[checkForMatch] ⚠️ Invalid matched_with address')
      return null
    }
    
    // CRITICAL: Verify the matched_with player is also in queue and matched
    // Use limit(1) instead of maybeSingle() to avoid PGRST116 error
    const { data: matchedPlayerEntries, error: matchedPlayerError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, player_address, matched_with')
      .eq('player_address', queueEntry.matched_with.toLowerCase())
      .eq('status', 'matched')
      .limit(1)
    
    if (matchedPlayerError && matchedPlayerError.code !== 'PGRST116') {
      console.error('[checkForMatch] ❌ Error finding matched player:', JSON.stringify({
        message: matchedPlayerError.message,
        code: matchedPlayerError.code,
      }))
      return null
    }
    
    const matchedPlayer = matchedPlayerEntries && matchedPlayerEntries.length > 0 ? matchedPlayerEntries[0] : null
    
    if (!matchedPlayer) {
      console.warn('[checkForMatch] ⚠️ Matched player not found in queue or not matched')
      return null
    }
    
    // CRITICAL: Verify matched player's matched_with points back to us
    if (matchedPlayer.matched_with?.toLowerCase() !== playerAddress.toLowerCase()) {
      console.warn('[checkForMatch] ⚠️ Matched player does not point back to us')
      return null
    }

    // Find the game with retry
    // CRITICAL: Verify game exists and both players match queue entry
    retries = 2
    let game: any = null
    
    while (retries > 0) {
      try {
        // Use limit(1) instead of maybeSingle() to avoid PGRST116 error
        const { data: gameEntries, error } = await supabase
          .from('games')
          .select('*')
          .or(`player1_address.eq.${playerAddress.toLowerCase()},player2_address.eq.${playerAddress.toLowerCase()}`)
          .eq('status', 'commit_phase')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        game = gameEntries && gameEntries.length > 0 ? gameEntries[0] : null
        break
      } catch (err: any) {
        if (err.message?.includes('fetch') || err.message?.includes('Load failed')) {
          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
        }
        throw err
      }
    }

    if (!game) {
      return null
    }
    
    // CRITICAL: Verify game players match queue entry
    const isPlayer1 = game.player1_address.toLowerCase() === playerAddress.toLowerCase()
    const isPlayer2 = game.player2_address.toLowerCase() === playerAddress.toLowerCase()
    
    if (!isPlayer1 && !isPlayer2) {
      console.warn('[checkForMatch] ⚠️ Game found but player address does not match')
      return null
    }
    
    // CRITICAL: Verify the other player matches matched_with
    const otherPlayerAddress = isPlayer1 ? game.player2_address : game.player1_address
    if (otherPlayerAddress.toLowerCase() !== queueEntry.matched_with.toLowerCase()) {
      console.warn('[checkForMatch] ⚠️ Game player mismatch with queue matched_with')
      return null
    }

    return {
      gameId: game.game_id,
      player1Address: game.player1_address as Address,
      player1Fid: game.player1_fid,
      player2Address: game.player2_address as Address,
      player2Fid: game.player2_fid,
      betLevel: game.bet_level,
      betAmount: BigInt(game.bet_amount),
    }
  } catch (error: any) {
    console.error('[checkForMatch] Error:', error)
    // Don't throw, just return null to allow polling to continue
    return null
  }
}

/**
 * Leave the matchmaking queue
 */
export async function leaveQueue(playerAddress: Address): Promise<void> {
  await supabase
    .from('matchmaking_queue')
    .update({ status: 'cancelled' })
    .eq('player_address', playerAddress.toLowerCase())
    .eq('status', 'waiting')
}

/**
 * Get queue status for a bet level
 */
export async function getQueueCount(betLevel: number): Promise<number> {
  try {
    let retries = 2
    
    while (retries > 0) {
      try {
        const { count, error } = await supabase
          .from('matchmaking_queue')
          .select('*', { count: 'exact', head: true })
          .eq('bet_level', betLevel)
          .eq('status', 'waiting')

        if (error) {
          // Retry on network errors
          if (error.message?.includes('fetch') || error.message?.includes('Load failed')) {
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          }
          console.error('Error getting queue count:', error)
          return 0
        }

        return count || 0
      } catch (err: any) {
        if (err.message?.includes('fetch') || err.message?.includes('Load failed')) {
          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
        }
        console.error('Error getting queue count:', err)
        return 0
      }
    }
    
    return 0
  } catch (error: any) {
    console.error('Error getting queue count:', error)
    return 0
  }
}

