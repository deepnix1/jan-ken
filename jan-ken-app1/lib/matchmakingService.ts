import { supabase, MatchmakingQueue, Game } from './supabase'
import { Address } from 'viem'

/**
 * Off-chain matchmaking service using Supabase
 * This provides fast matching without waiting for blockchain confirmations
 */

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

  // Check if player is already in queue
  const { data: existing } = await supabase
    .from('matchmaking_queue')
    .select('id')
    .eq('player_address', playerAddress.toLowerCase())
    .eq('status', 'waiting')
    .single()

  if (existing) {
    return existing.id // Already in queue
  }

  // Insert into queue
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
    console.error('Error joining queue:', error)
    throw new Error(`Failed to join queue: ${error.message}`)
  }

  // Try to find a match immediately
  await tryMatch(betLevel)

  return data.id
}

/**
 * Try to match players in the queue
 */
async function tryMatch(betLevel: number): Promise<MatchResult | null> {
  // Find two waiting players with same bet level
  const { data: players, error } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('bet_level', betLevel)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(2)

  if (error) {
    console.error('Error finding players:', error)
    return null
  }

  if (!players || players.length < 2) {
    return null // Not enough players
  }

  const player1 = players[0]
  const player2 = players[1]

  // Create game
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
    console.error('Error creating game:', gameError)
    return null
  }

  // Update queue entries to matched
  await supabase
    .from('matchmaking_queue')
    .update({
      status: 'matched',
      matched_at: new Date().toISOString(),
    })
    .in('id', [player1.id, player2.id])
  
  // Set matched_with for each player
  await supabase
    .from('matchmaking_queue')
    .update({ matched_with: player2.player_address })
    .eq('id', player1.id)
  
  await supabase
    .from('matchmaking_queue')
    .update({ matched_with: player1.player_address })
    .eq('id', player2.id)

  return {
    gameId,
    player1Address: player1.player_address as Address,
    player1Fid: player1.player_fid,
    player2Address: player2.player_address as Address,
    player2Fid: player2.player_fid,
    betLevel,
    betAmount: BigInt(player1.bet_amount),
  }
}

/**
 * Check for matches (polling function)
 */
export async function checkForMatch(playerAddress: Address): Promise<MatchResult | null> {
  // Check if player has been matched
  const { data: queueEntry } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_address', playerAddress.toLowerCase())
    .eq('status', 'matched')
    .single()

  if (!queueEntry || !queueEntry.matched_with) {
    return null
  }

  // Find the game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .or(`player1_address.eq.${playerAddress.toLowerCase()},player2_address.eq.${playerAddress.toLowerCase()}`)
    .eq('status', 'commit_phase')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!game) {
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
  const { count, error } = await supabase
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('bet_level', betLevel)
    .eq('status', 'waiting')

  if (error) {
    console.error('Error getting queue count:', error)
    return 0
  }

  return count || 0
}

