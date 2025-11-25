/**
 * Contract Test and Monitoring Utility
 * 
 * Tests contract connectivity, validates contract state, and monitors transactions
 */

import { createPublicClient, http, type Address, type Hash } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';

const RPC_URL = 'https://sepolia.base.org';

// Create public client for contract reads
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL, {
    timeout: 30000,
    retryCount: 3,
  }),
});

export interface ContractTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ContractStatus {
  address: string;
  isPaused: boolean;
  balance: bigint;
  owner: string;
  isValid: boolean;
  lastChecked: number;
}

/**
 * Test RPC connection
 */
export async function testRpcConnection(): Promise<ContractTestResult> {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    return {
      success: true,
      message: 'RPC connection successful',
      data: { blockNumber: blockNumber.toString() },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'RPC connection failed',
      error: error?.message || String(error),
    };
  }
}

/**
 * Test contract address validity
 */
export async function testContractAddress(address: string): Promise<ContractTestResult> {
  try {
    // Check if address has code (is a contract)
    const code = await publicClient.getBytecode({ address: address as Address });
    const hasCode = code && code !== '0x';
    
    return {
      success: hasCode || false,
      message: hasCode ? 'Contract address is valid' : 'Address has no code (not a contract)',
      data: { hasCode, address },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to check contract address',
      error: error?.message || String(error),
    };
  }
}

/**
 * Check if contract is paused
 */
export async function checkContractPaused(): Promise<ContractTestResult> {
  try {
    const paused = await publicClient.readContract({
      address: CONTRACT_ADDRESS as Address,
      abi: CONTRACT_ABI,
      functionName: 'paused',
    });

    return {
      success: true,
      message: paused ? 'Contract is PAUSED' : 'Contract is ACTIVE',
      data: { paused },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to check contract pause status',
      error: error?.message || String(error),
    };
  }
}

/**
 * Get contract balance
 */
export async function getContractBalance(): Promise<ContractTestResult> {
  try {
    const balance = await publicClient.getBalance({
      address: CONTRACT_ADDRESS as Address,
    });

    return {
      success: true,
      message: 'Contract balance retrieved',
      data: { balance: balance.toString(), balanceEth: (Number(balance) / 1e18).toFixed(6) },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to get contract balance',
      error: error?.message || String(error),
    };
  }
}

/**
 * Get contract owner
 */
export async function getContractOwner(): Promise<ContractTestResult> {
  try {
    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS as Address,
      abi: CONTRACT_ABI,
      functionName: 'getOwnerAddress',
    });

    return {
      success: true,
      message: 'Contract owner retrieved',
      data: { owner },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to get contract owner',
      error: error?.message || String(error),
    };
  }
}

/**
 * Get full contract status
 */
export async function getContractStatus(): Promise<ContractStatus> {
  const [pausedResult, balanceResult, ownerResult, addressResult] = await Promise.all([
    checkContractPaused(),
    getContractBalance(),
    getContractOwner(),
    testContractAddress(CONTRACT_ADDRESS),
  ]);

  return {
    address: CONTRACT_ADDRESS,
    isPaused: pausedResult.data?.paused || false,
    balance: BigInt(balanceResult.data?.balance || '0'),
    owner: ownerResult.data?.owner || 'unknown',
    isValid: addressResult.success || false,
    lastChecked: Date.now(),
  };
}

/**
 * Verify transaction was sent to contract
 */
export async function verifyTransaction(
  txHash: Hash,
  expectedFunction: string,
  expectedAddress?: Address
): Promise<ContractTestResult> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    
    // Check if transaction was successful
    if (receipt.status === 'reverted') {
      return {
        success: false,
        message: 'Transaction was reverted',
        data: { receipt },
      };
    }

    // Check if transaction was sent to correct contract
    const targetAddress = expectedAddress || (CONTRACT_ADDRESS as Address);
    if (receipt.to?.toLowerCase() !== targetAddress.toLowerCase()) {
      return {
        success: false,
        message: `Transaction sent to wrong address: ${receipt.to} (expected: ${targetAddress})`,
        data: { receipt, expected: targetAddress },
      };
    }

    // Check if transaction was successful
    return {
      success: true,
      message: 'Transaction verified successfully',
      data: {
        receipt,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        to: receipt.to,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to verify transaction',
      error: error?.message || String(error),
    };
  }
}

/**
 * Monitor transaction until confirmed
 */
export async function monitorTransaction(
  txHash: Hash,
  timeout: number = 120000
): Promise<ContractTestResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        return {
          success: true,
          message: 'Transaction confirmed',
          data: {
            receipt,
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            confirmations: 1,
          },
        };
      } else if (receipt.status === 'reverted') {
        return {
          success: false,
          message: 'Transaction reverted',
          data: { receipt },
        };
      }
    } catch (error: any) {
      // Transaction not found yet, wait and retry
      if (error?.message?.includes('not found')) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      
      return {
        success: false,
        message: 'Error monitoring transaction',
        error: error?.message || String(error),
      };
    }
  }

  return {
    success: false,
    message: 'Transaction monitoring timeout',
    error: `Transaction not confirmed within ${timeout}ms`,
  };
}

/**
 * Run comprehensive contract tests
 */
export async function runContractTests(): Promise<{
  rpc: ContractTestResult;
  address: ContractTestResult;
  paused: ContractTestResult;
  balance: ContractTestResult;
  owner: ContractTestResult;
  status: ContractStatus;
}> {
  console.log('🔍 Running comprehensive contract tests...');
  
  const [rpc, address, paused, balance, owner, status] = await Promise.all([
    testRpcConnection(),
    testContractAddress(CONTRACT_ADDRESS),
    checkContractPaused(),
    getContractBalance(),
    getContractOwner(),
    getContractStatus(),
  ]);

  console.log('📊 Test Results:');
  console.log('  RPC:', rpc.success ? '✅' : '❌', rpc.message);
  console.log('  Address:', address.success ? '✅' : '❌', address.message);
  console.log('  Paused:', paused.success ? '✅' : '❌', paused.data?.paused ? 'PAUSED' : 'ACTIVE');
  console.log('  Balance:', balance.success ? '✅' : '❌', balance.data?.balanceEth, 'ETH');
  console.log('  Owner:', owner.success ? '✅' : '❌', owner.data?.owner);

  return { rpc, address, paused, balance, owner, status };
}


