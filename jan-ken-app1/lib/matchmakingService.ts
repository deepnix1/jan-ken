import { supabase, MatchmakingQueue, Game } from './supabase'
import { Address } from 'viem'

/**
 * Off-chain matchmaking service using Supabase
 * This provides fast matching without waiting for blockchain confirmations
 */

// Lock mechanism to prevent concurrent tryMatch calls for same betLevel
const matchLocks = new Map<number, boolean>()

/**
 * Acquire lock for matching at a specific bet level
 */
function acquireLock(betLevel: number): boolean {
  if (matchLocks.get(betLevel)) {
    return false // Lock already held
  }
  matchLocks.set(betLevel, true)
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
    
    console.log('[joinQueue] ✅ Validation passed:', {
      playerAddress: playerAddress.slice(0, 10) + '...',
      betLevel,
      betAmount: betAmount.toString(),
    })

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
        tryMatch(betLevel).catch(err => {
          console.warn('[joinQueue] Failed to try match immediately:', err)
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
async function tryMatch(betLevel: number): Promise<MatchResult | null> {
  // CRITICAL: Acquire lock to prevent concurrent matching attempts
  if (!acquireLock(betLevel)) {
    console.log('[tryMatch] ⚠️ Lock already held for betLevel', betLevel, '- skipping match attempt')
    return null
  }

  try {
    // Step 1: Find two waiting players with same bet level
    // CRITICAL: Use FOR UPDATE lock equivalent by checking status again after selection
    const { data: players, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('bet_level', betLevel)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(2)

    if (error) {
      console.error('[tryMatch] Error finding players:', error)
      releaseLock(betLevel)
      return null
    }

    if (!players || players.length < 2) {
      releaseLock(betLevel)
      return null // Not enough players
    }

    const player1 = players[0]
    const player2 = players[1]
    
    // CRITICAL: Verify player addresses are valid and not the same
    if (!player1.player_address || !player2.player_address) {
      console.error('[tryMatch] ⚠️ Invalid player addresses')
      releaseLock(betLevel)
      return null
    }
    
    if (player1.player_address.toLowerCase() === player2.player_address.toLowerCase()) {
      console.error('[tryMatch] ⚠️ Cannot match player with themselves')
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Verify both players are still waiting (prevent race conditions)
    // Get full player data to verify addresses match
    const { data: verifyPlayers, error: verifyError } = await supabase
      .from('matchmaking_queue')
      .select('id, status, player_address, bet_level')
      .in('id', [player1.id, player2.id])
      .eq('status', 'waiting')

    if (verifyError) {
      console.error('[tryMatch] Error verifying players:', verifyError)
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: If either player is no longer waiting, abort match
    if (!verifyPlayers || verifyPlayers.length !== 2) {
      console.log('[tryMatch] ⚠️ One or both players no longer waiting, aborting match')
      releaseLock(betLevel)
      return null
    }

    // CRITICAL: Verify player addresses and bet levels match
    const verifiedPlayer1 = verifyPlayers.find(p => p.id === player1.id)
    const verifiedPlayer2 = verifyPlayers.find(p => p.id === player2.id)
    
    if (!verifiedPlayer1 || !verifiedPlayer2) {
      console.log('[tryMatch] ⚠️ Could not verify both players, aborting match')
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify addresses match exactly
    if (
      verifiedPlayer1.player_address.toLowerCase() !== player1.player_address.toLowerCase() ||
      verifiedPlayer2.player_address.toLowerCase() !== player2.player_address.toLowerCase()
    ) {
      console.error('[tryMatch] ⚠️ Player address mismatch during verification')
      releaseLock(betLevel)
      return null
    }
    
    // CRITICAL: Verify bet levels match
    if (verifiedPlayer1.bet_level !== betLevel || verifiedPlayer2.bet_level !== betLevel) {
      console.error('[tryMatch] ⚠️ Bet level mismatch during verification')
      releaseLock(betLevel)
      return null
    }

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

    if (updateError1 || !updateData1 || updateData1.length === 0) {
      console.error('[tryMatch] Error updating player1 queue status:', updateError1)
      releaseLock(betLevel)
      return null
    }

    // Update player2
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

    if (updateError2 || !updateData2 || updateData2.length === 0) {
      console.error('[tryMatch] Error updating player2 queue status:', updateError2)
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
      console.error('[tryMatch] ⚠️ Queue update verification failed, match may have been aborted')
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

    // Step 4: Create game only after queue update is confirmed
    const gameId = `game-${player1.player_address}-${player2.player_address}-${Date.now()}`

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

    console.log('[tryMatch] ✅ Match created successfully:', {
      gameId,
      player1: player1.player_address.slice(0, 10) + '...',
      player2: player2.player_address.slice(0, 10) + '...',
    })

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
  try {
    // Check if player has been matched with retry
    let retries = 2
    let queueEntry: any = null
    
    while (retries > 0) {
      try {
        const { data, error } = await supabase
          .from('matchmaking_queue')
          .select('*')
          .eq('player_address', playerAddress.toLowerCase())
          .eq('status', 'matched')
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        queueEntry = data
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

    if (!queueEntry || !queueEntry.matched_with) {
      return null
    }

    // Find the game with retry
    // CRITICAL: Verify game exists and both players match queue entry
    retries = 2
    let game: any = null
    
    while (retries > 0) {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .or(`player1_address.eq.${playerAddress.toLowerCase()},player2_address.eq.${playerAddress.toLowerCase()}`)
          .eq('status', 'commit_phase')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        game = data
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

