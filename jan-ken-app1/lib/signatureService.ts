/**
 * Signature Service
 * 
 * Handles creating and verifying signatures for Janken moves
 */

import { Address, keccak256, toHex, type WalletClient, stringToBytes, bytesToHex } from 'viem';
import { signMessage as wagmiSignMessage, type Config } from '@wagmi/core';

// Get config from global (set by rootProvider)
function getConfig(): Config {
  if (typeof window === 'undefined') {
    throw new Error('Config is only available on client-side');
  }
  const config = (globalThis as any).__wagmiConfig;
  if (!config) {
    throw new Error('Wagmi config not initialized. Make sure RootProvider is mounted.');
  }
  return config;
}

/**
 * Create signature for a move
 * @param gameId Game ID
 * @param playerAddress Player address
 * @param move Move (1=Rock, 2=Paper, 3=Scissors)
 * @param timestamp Timestamp
 * @param salt Random salt (string, will be converted to bytes32)
 * @param walletClient Optional wallet client (if not provided, uses wagmi config)
 * @returns Signature
 */
export async function createMoveSignature(
  gameId: string,
  playerAddress: Address,
  move: number,
  timestamp: number,
  salt: string,
  walletClient?: WalletClient
): Promise<string> {
  // Convert salt to bytes32 for contract compatibility
  const saltBytes32 = saltToBytes32(salt);
  
  // Create message: "JANKEN_MOVE|gameId|address|move|timestamp|saltBytes32"
  // Note: Contract uses abi.encodePacked, so we need to match that format
  // The contract creates: keccak256(abi.encodePacked("JANKEN_MOVE", gameId, player, move, timestamp, salt))
  // We'll create a message that includes the salt bytes32 as hex string
  const msg = `JANKEN_MOVE|${gameId}|${playerAddress}|${move}|${timestamp}|${saltBytes32}`;
  
  console.log('[Signature] 📝 Creating signature for:', {
    gameId,
    playerAddress,
    move,
    timestamp,
    salt,
    saltBytes32,
    msg,
  });

  try {
    let signature: string;
    
    if (walletClient) {
      // Use provided wallet client (viem)
      signature = await walletClient.signMessage({
        message: msg,
        account: playerAddress,
      });
    } else {
      // Use wagmi signMessage utility
      const config = getConfig();
      signature = await wagmiSignMessage(config, {
        message: msg,
      });
    }

    console.log('[Signature] ✅ Signature created:', signature);
    return signature;
  } catch (error: any) {
    console.error('[Signature] ❌ Error creating signature:', error);
    throw new Error(`Failed to create signature: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Verify signature (client-side verification)
 * Note: Contract also verifies on-chain
 */
export function verifyMoveSignature(
  playerAddress: Address,
  gameId: string,
  move: number,
  timestamp: number,
  salt: string,
  signature: string
): boolean {
  try {
    // Recreate the message hash
    const msg = `JANKEN_MOVE|${gameId}|${playerAddress}|${move}|${timestamp}|${salt}`;
    const msgHash = keccak256(toHex(msg));
    
    // Note: Full ECDSA verification requires contract call
    // This is a basic check - contract will do full verification
    return signature.length === 132 && signature.startsWith('0x');
  } catch (error) {
    console.error('[Signature] ❌ Error verifying signature:', error);
    return false;
  }
}

/**
 * Generate random salt for commit
 * Returns a random string that will be hashed to bytes32 in the contract
 */
export function generateSalt(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

/**
 * Convert salt string to bytes32 (for contract calls)
 * This matches what the contract expects
 */
export function saltToBytes32(salt: string): string {
  // If already a hex string with 66 chars (0x + 64 hex), return as is
  if (salt.startsWith('0x') && salt.length === 66) {
    return salt;
  }
  // Hash the string to get bytes32
  return keccak256(stringToBytes(salt));
}

/**
 * Create signature data structure for Supabase
 */
export interface SignatureData {
  move: number;
  timestamp: number;
  salt: string;
  signature: string;
}

/**
 * Create complete signature data for a move
 * @param walletClient Optional wallet client (if not provided, uses wagmi config)
 */
export async function createSignatureData(
  gameId: string,
  playerAddress: Address,
  move: number,
  walletClient?: WalletClient
): Promise<SignatureData> {
  const timestamp = Date.now();
  const salt = generateSalt();
  const signature = await createMoveSignature(
    gameId,
    playerAddress,
    move,
    timestamp,
    salt,
    walletClient
  );

  return {
    move,
    timestamp,
    salt,
    signature,
  };
}

