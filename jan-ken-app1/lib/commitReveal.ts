import { supabase } from './supabase'
import { Address, type WalletClient } from 'viem'
import { createSignatureData, SignatureData } from './signatureService'

/**
 * Commit-Reveal mechanism for fair gameplay
 * Uses signature-based commits (more secure than hash)
 */

export interface CommitChoiceParams {
  gameId: string
  playerAddress: Address
  choice: number // 1=Rock, 2=Paper, 3=Scissors
  walletClient?: WalletClient // Optional wallet client for signing
}

export interface RevealChoiceParams {
  gameId: string
  playerAddress: Address
  choice: number
  signatureData: SignatureData
}

/**
 * Commit a choice (send signature to database)
 * This stores the signature without revealing the move
 */
export async function commitChoice(params: CommitChoiceParams): Promise<SignatureData> {
  const { gameId, playerAddress, choice, walletClient } = params

  // Check if game exists and player is part of it
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('game_id', gameId)
    .single()

  if (gameError || !game) {
    throw new Error('Game not found')
  }

  const isPlayer1 = game.player1_address.toLowerCase() === playerAddress.toLowerCase()
  const isPlayer2 = game.player2_address.toLowerCase() === playerAddress.toLowerCase()

  if (!isPlayer1 && !isPlayer2) {
    throw new Error('Player not part of this game')
  }

  if (game.status !== 'commit_phase' && game.status !== 'waiting') {
    throw new Error(`Game is not in commit phase. Current status: ${game.status}`)
  }

  // Create signature data
  const signatureData = await createSignatureData(gameId, playerAddress, choice, walletClient)

  // Update game with commit (store signature in player1_commit or player2_commit)
  const updateData: any = {}
  if (isPlayer1) {
    updateData.player1_commit = signatureData.signature
    updateData.player1_move = choice // Store move for reveal
    updateData.player1_timestamp = signatureData.timestamp
    updateData.player1_salt = signatureData.salt
  } else {
    updateData.player2_commit = signatureData.signature
    updateData.player2_move = choice // Store move for reveal
    updateData.player2_timestamp = signatureData.timestamp
    updateData.player2_salt = signatureData.salt
  }

  // If both players have committed, move to reveal phase
  const player1Commit = isPlayer1 ? signatureData.signature : game.player1_commit
  const player2Commit = isPlayer2 ? signatureData.signature : game.player2_commit

  if (player1Commit && player2Commit) {
    updateData.status = 'reveal_phase'
  } else {
    // Still waiting for other player
    updateData.status = 'commit_phase'
  }

  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('game_id', gameId)

  if (error) {
    console.error('Error committing choice:', error)
    throw new Error(`Failed to commit choice: ${error.message}`)
  }

  // Store commit in commits table for tracking
  await supabase
    .from('commits')
    .insert({
      game_id: gameId,
      player_address: playerAddress.toLowerCase(),
      choice_hash: signatureData.signature, // Store signature as hash
      salt: signatureData.salt,
      revealed_at: null,
    })

  console.log('[Commit] ✅ Choice committed:', {
    gameId,
    playerAddress,
    choice,
    hasSignature: !!signatureData.signature,
  })

  return signatureData
}

/**
 * Reveal a choice (already stored in database, just verify)
 * This is called when both players have committed and we're ready to settle
 */
export async function revealChoice(params: RevealChoiceParams): Promise<void> {
  const { gameId, playerAddress, choice, signatureData } = params

  // Get game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('game_id', gameId)
    .single()

  if (gameError || !game) {
    throw new Error('Game not found')
  }

  if (game.status !== 'reveal_phase') {
    throw new Error(`Game is not in reveal phase. Current status: ${game.status}`)
  }

  const isPlayer1 = game.player1_address.toLowerCase() === playerAddress.toLowerCase()

  // Verify the stored signature matches
  const storedSignature = isPlayer1 ? game.player1_commit : game.player2_commit
  if (storedSignature !== signatureData.signature) {
    throw new Error('Invalid reveal: signature does not match commit')
  }

  // Update game with reveal
  const updateData: any = {}

  if (isPlayer1) {
    updateData.player1_reveal = choice
  } else {
    updateData.player2_reveal = choice
  }

  // If both players have revealed, ready to settle
  const player1Reveal = isPlayer1 ? choice : game.player1_reveal
  const player2Reveal = isPlayer1 ? game.player2_reveal : choice

  if (player1Reveal && player2Reveal) {
    updateData.status = 'ready_to_settle'
  }

  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('game_id', gameId)

  if (error) {
    console.error('Error revealing choice:', error)
    throw new Error(`Failed to reveal choice: ${error.message}`)
  }

  // Update commit with reveal time
  await supabase
    .from('commits')
    .update({ revealed_at: new Date().toISOString() })
    .eq('game_id', gameId)
    .eq('player_address', playerAddress.toLowerCase())

  console.log('[Reveal] ✅ Choice revealed:', {
    gameId,
    playerAddress,
    choice,
  })
}

/**
 * Determine winner based on choices
 * Returns winner address or null for tie
 */
export function determineWinner(
  player1Choice: number,
  player2Choice: number,
  player1Address: string,
  player2Address: string
): string | null {
  // 1=Rock, 2=Paper, 3=Scissors
  if (player1Choice === player2Choice) {
    return null // Tie
  }

  // Rock beats Scissors, Paper beats Rock, Scissors beats Paper
  if (
    (player1Choice === 1 && player2Choice === 3) || // Rock beats Scissors
    (player1Choice === 2 && player2Choice === 1) || // Paper beats Rock
    (player1Choice === 3 && player2Choice === 2)    // Scissors beats Paper
  ) {
    return player1Address
  }

  return player2Address
}

/**
 * Check if both players have committed
 */
export async function checkBothCommitted(gameId: string): Promise<boolean> {
  const { data: game, error } = await supabase
    .from('games')
    .select('player1_commit, player2_commit')
    .eq('game_id', gameId)
    .single()

  if (error || !game) {
    return false
  }

  return !!(game.player1_commit && game.player2_commit)
}

/**
 * Check if both players have revealed
 */
export async function checkBothRevealed(gameId: string): Promise<boolean> {
  const { data: game, error } = await supabase
    .from('games')
    .select('player1_reveal, player2_reveal')
    .eq('game_id', gameId)
    .single()

  if (error || !game) {
    return false
  }

  return !!(game.player1_reveal && game.player2_reveal)
}
