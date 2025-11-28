/**
 * Wallet Transaction Monitor
 * 
 * Monitors transactions from a specific wallet address
 */

import { createPublicClient, http, type Address, type Hash } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { CONTRACT_ADDRESS } from './contract';

const RPC_URL = 'https://sepolia.base.org';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL, {
    timeout: 30000,
    retryCount: 3,
  }),
});

export interface WalletTransaction {
  hash: Hash;
  from: Address;
  to: Address | null;
  value: bigint;
  blockNumber: bigint;
  blockHash: Hash;
  transactionIndex: number;
  status: 'success' | 'reverted';
  gasUsed: bigint;
  gasPrice: bigint;
  timestamp: number;
  isContractCall: boolean;
  functionName?: string;
  contractAddress?: Address;
}

export interface WalletMonitorResult {
  success: boolean;
  message: string;
  transactions?: WalletTransaction[];
  error?: string;
}

/**
 * Get recent transactions from a wallet address
 */
export async function getWalletTransactions(
  address: Address,
  limit: number = 20
): Promise<WalletMonitorResult> {
  try {
    // Get current block number
    const currentBlock = await publicClient.getBlockNumber();
    
    // Get transactions from recent blocks (last 100 blocks)
    const startBlock = currentBlock - BigInt(100);
    const transactions: WalletTransaction[] = [];
    
    // Scan blocks for transactions
    for (let i = 0; i < 100 && transactions.length < limit; i++) {
      const blockNumber = currentBlock - BigInt(i);
      
      try {
        const block = await publicClient.getBlock({ blockNumber, includeTransactions: true });
        
        if (block.transactions) {
          for (const tx of block.transactions) {
            if (typeof tx === 'object' && tx.from?.toLowerCase() === address.toLowerCase()) {
              // Get transaction receipt
              let receipt;
              try {
                receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
              } catch {
                // Transaction might not be mined yet
                continue;
              }
              
              // Check if it's a contract call
              const isContractCall = tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
              
              transactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value || 0n,
                blockNumber: receipt.blockNumber,
                blockHash: receipt.blockHash,
                transactionIndex: receipt.transactionIndex,
                status: receipt.status === 'success' ? 'success' : 'reverted',
                gasUsed: receipt.gasUsed,
                gasPrice: tx.gasPrice || 0n,
                timestamp: Number(block.timestamp) * 1000,
                isContractCall,
                contractAddress: isContractCall ? (tx.to as Address) : undefined,
              });
              
              if (transactions.length >= limit) break;
            }
          }
        }
      } catch (error) {
        // Block might not exist yet, continue
        continue;
      }
    }
    
    return {
      success: true,
      message: `Found ${transactions.length} transactions`,
      transactions: transactions.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to get wallet transactions',
      error: error?.message || String(error),
    };
  }
}

/**
 * Monitor a specific transaction
 */
export async function monitorWalletTransaction(
  txHash: Hash
): Promise<WalletMonitorResult> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    const tx = await publicClient.getTransaction({ hash: txHash });
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    
    const isContractCall = tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
    
    const walletTx: WalletTransaction = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value || 0n,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      transactionIndex: receipt.transactionIndex,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      gasUsed: receipt.gasUsed,
      gasPrice: tx.gasPrice || 0n,
      timestamp: Number(block.timestamp) * 1000,
      isContractCall,
      contractAddress: isContractCall ? (tx.to as Address) : undefined,
    };
    
    return {
      success: true,
      message: 'Transaction found',
      transactions: [walletTx],
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to monitor transaction',
      error: error?.message || String(error),
    };
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(address: Address): Promise<{
  success: boolean;
  balance: bigint;
  balanceEth: string;
  error?: string;
}> {
  try {
    const balance = await publicClient.getBalance({ address });
    return {
      success: true,
      balance,
      balanceEth: (Number(balance) / 1e18).toFixed(6),
    };
  } catch (error: any) {
    return {
      success: false,
      balance: 0n,
      balanceEth: '0',
      error: error?.message || String(error),
    };
  }
}

/**
 * Monitor wallet for new transactions (polling)
 */
export class WalletMonitor {
  private address: Address;
  private lastBlockNumber: bigint = 0n;
  private intervalId: NodeJS.Timeout | null = null;
  private onNewTransaction?: (tx: WalletTransaction) => void;
  private isRunning: boolean = false;

  constructor(address: Address) {
    this.address = address;
  }

  async start(
    onNewTransaction: (tx: WalletTransaction) => void,
    pollInterval: number = 5000
  ): Promise<void> {
    if (this.isRunning) {
      console.warn('WalletMonitor is already running');
      return;
    }

    this.onNewTransaction = onNewTransaction;
    this.isRunning = true;

    // Get initial block number
    try {
      const currentBlock = await publicClient.getBlockNumber();
      this.lastBlockNumber = currentBlock;
    } catch (error) {
      console.error('Error getting initial block number:', error);
    }

    // Start polling
    this.intervalId = setInterval(async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        
        if (currentBlock > this.lastBlockNumber) {
          // Check new blocks for transactions
          for (let blockNum = this.lastBlockNumber + 1n; blockNum <= currentBlock; blockNum++) {
            try {
              const block = await publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true });
              
              if (block.transactions) {
                for (const tx of block.transactions) {
                  if (typeof tx === 'object' && tx.from?.toLowerCase() === this.address.toLowerCase()) {
                    // Get receipt
                    let receipt;
                    try {
                      receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
                    } catch {
                      continue;
                    }
                    
                    const isContractCall = tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
                    const blockData = await publicClient.getBlock({ blockNumber: blockNum });
                    
                    const walletTx: WalletTransaction = {
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to,
                      value: tx.value || 0n,
                      blockNumber: receipt.blockNumber,
                      blockHash: receipt.blockHash,
                      transactionIndex: receipt.transactionIndex,
                      status: receipt.status === 'success' ? 'success' : 'reverted',
                      gasUsed: receipt.gasUsed,
                      gasPrice: tx.gasPrice || 0n,
                      timestamp: Number(blockData.timestamp) * 1000,
                      isContractCall,
                      contractAddress: isContractCall ? (tx.to as Address) : undefined,
                    };
                    
                    this.onNewTransaction?.(walletTx);
                  }
                }
              }
            } catch (error) {
              // Block might not exist, continue
              continue;
            }
          }
          
          this.lastBlockNumber = currentBlock;
        }
      } catch (error) {
        console.error('Error in wallet monitor polling:', error);
      }
    }, pollInterval);

    console.log(`WalletMonitor started for address: ${this.address}`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('WalletMonitor stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}





