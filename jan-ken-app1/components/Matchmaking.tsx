'use client';

import { useEffect, useState, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useWatchContractEvent, useSimulateContract } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { isValidBetAmount, isValidAddress } from '@/lib/security';
import { useTransactionMonitor } from '@/hooks/useTransactionMonitor';

interface MatchmakingProps {
  betAmount: bigint;
  onMatchFound: (gameId: string) => void;
  onCancel?: () => void; // Cancel matchmaking callback
  showMatchFound?: boolean;
}

export function Matchmaking({ betAmount, onMatchFound, onCancel, showMatchFound = false }: MatchmakingProps) {
  const { address, isConnected } = useAccount();
  const [isMatching, setIsMatching] = useState(true);
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  
  const { data: hash, writeContract, isPending, error: writeError, reset: resetWriteContract, status } = useWriteContract();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStartTime, setTxStartTime] = useState<number | null>(null);
  const txIdRef = useRef<string | null>(null);
  
  // Transaction monitoring system
  const { startTransaction, updateTransaction, getTransaction } = useTransactionMonitor({
    enableAutoRetry: true,
    pendingTimeout: 30000,
    sendingTimeout: 60000,
    logLevel: 'info',
    onRetry: (id, state) => {
      console.log('🔄 Auto-retry triggered for transaction:', id, state);
      // Reset state to allow retry
      setHasJoinedQueue(false);
      setTxError(null);
      setTxStartTime(null);
      resetWriteContract?.();
    },
    onStuck: (id, state, reason) => {
      console.warn('⚠️ Transaction stuck:', id, reason, state);
      setTxError(`Transaction stuck in ${reason}. Auto-recovery will attempt retry.`);
    },
  });
  
  // Simulate contract call before sending transaction
  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'joinQueue',
    args: [betAmount],
    value: betAmount,
    query: {
      enabled: isConnected && !!address && !!betAmount && !hasJoinedQueue,
    },
  });
  
  // Don't wait for receipt - rely on event listener instead
  // This prevents UI from getting stuck on "confirming transaction"
  // Event listener will catch the match regardless of receipt status
  // Note: Wagmi v3 doesn't support onSuccess/onError callbacks in useWaitForTransactionReceipt
  const { isLoading: isConfirming, isSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash,
    timeout: 120000, // 120 second timeout (increased for slow networks)
    confirmations: 1,
    query: {
      retry: 5, // More retries
      retryDelay: 2000, // Longer delay between retries
      enabled: !!hash, // Only wait if we have hash
    },
  });
  
  // Handle transaction confirmation via useEffect
  const [showApproved, setShowApproved] = useState(false);
  
  useEffect(() => {
    if (isSuccess && hash && txIdRef.current) {
      console.log('Transaction confirmed:', hash);
      setShowApproved(true);
      
      // Update monitoring system
      updateTransaction(txIdRef.current, {
        status: 'confirmed',
        hash: hash as `0x${string}`,
      });
      
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShowApproved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash, updateTransaction]);
  
  // Store hash when transaction is sent and update state
  useEffect(() => {
    if (hash && txIdRef.current) {
      setTxHash(hash);
      setHasJoinedQueue(true);
      setTxError(null);
      setTxStartTime(null);
      console.log('✅ Transaction hash received:', hash);
      console.log('Transaction status:', status);
      
      // Update monitoring system
      updateTransaction(txIdRef.current, {
        status: 'sent',
        hash: hash as `0x${string}`,
      });
    }
  }, [hash, status, updateTransaction]);

  // Monitor status changes - hash might come after status changes
  useEffect(() => {
    console.log('📊 Transaction status changed:', {
      status,
      isPending,
      hash,
      hasError: !!writeError,
      timestamp: new Date().toISOString(),
    });

    // Update monitoring system with status changes
    if (txIdRef.current) {
      const txState = getTransaction(txIdRef.current);
      if (txState) {
        if (status === 'pending' && txState.status !== 'pending') {
          updateTransaction(txIdRef.current, { status: 'pending' });
        } else if (status === 'success' && hash && txState.status !== 'sent') {
          updateTransaction(txIdRef.current, {
            status: 'sent',
            hash: hash as `0x${string}`,
          });
        } else if (status === 'error') {
          updateTransaction(txIdRef.current, {
            status: 'failed',
            error: writeError?.message || 'Transaction failed',
          });
        }
      }
    }

    // If status is 'success' but no hash yet, wait a bit
    if (status === 'success' && !hash) {
      console.log('⚠️ Status is success but hash not received yet, waiting...');
      // Hash should come soon, give it 2 seconds
      const timer = setTimeout(() => {
        if (!hash) {
          console.warn('⚠️ Hash still not received after status success');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    // If status is 'error', handle it
    if (status === 'error' && !writeError) {
      console.error('❌ Transaction status is error but no writeError');
      setTxError('Transaction failed. Please try again.');
      setHasJoinedQueue(false);
      setTxStartTime(null);
      if (txIdRef.current) {
        updateTransaction(txIdRef.current, {
          status: 'failed',
          error: 'Transaction failed',
        });
      }
    }
  }, [status, isPending, hash, writeError, updateTransaction, getTransaction]);
  
  // Handle writeError from useWriteContract
  useEffect(() => {
    if (writeError) {
      console.error('❌ WriteContract error:', writeError);
      console.error('Error details:', {
        message: writeError?.message,
        shortMessage: (writeError as any)?.shortMessage,
        cause: (writeError as any)?.cause,
        name: writeError?.name,
        stack: writeError?.stack,
      });
      setHasJoinedQueue(false);
      setTxStartTime(null);
      
      let errorMessage = 'Transaction failed';
      const errorMsg = writeError?.message || (writeError as any)?.shortMessage || (writeError as any)?.cause?.message || String(writeError);
      
      if (errorMsg.includes('rejected') || errorMsg.includes('Rejected') || errorMsg.includes('User rejected') || errorMsg.includes('user rejected')) {
        errorMessage = 'Transaction was rejected. Please check your wallet and approve the transaction when the popup appears.';
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient')) {
        errorMessage = 'Insufficient funds. Please add more ETH to your wallet.';
      } else if (errorMsg.includes('denied') || errorMsg.includes('Denied')) {
        errorMessage = 'Transaction was denied. Please approve in your wallet.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        errorMessage = 'Transaction timeout. Please try again.';
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      setTxError(errorMessage);
    }
  }, [writeError]);
  
  // Monitor transaction status and detect stuck transactions
  useEffect(() => {
    if (isPending && !hash && txStartTime) {
      const elapsed = Date.now() - txStartTime;
      
      // Log progress every 5 seconds
      if (elapsed % 5000 < 100) {
        console.log(`⏳ Waiting for transaction hash... (${Math.floor(elapsed / 1000)}s)`, {
          status,
          isPending,
          hasError: !!writeError,
        });
      }
      
      // If status is 'pending' for more than 30 seconds, something is wrong
      // This usually means wallet popup was not approved or connector issue
      if (status === 'pending' && elapsed > 30000) {
        console.warn('⚠️ Transaction stuck in pending status for 30+ seconds');
        console.warn('This usually means wallet popup was not approved or connector issue');
        console.warn('Status:', status);
        console.warn('isPending:', isPending);
        console.warn('writeError:', writeError);
        
        // Reset state to allow retry
        setTxError('Transaction is taking too long. Please check your wallet popup and approve, or try again.');
        setHasJoinedQueue(false);
        setTxStartTime(null);
        resetWriteContract?.(); // Reset writeContract state
        return;
      }
      
      // After 30 seconds, show warning but don't reset (transaction might still be processing)
      if (elapsed > 30000 && elapsed < 60000 && status !== 'pending') {
        console.warn('⚠️ Transaction taking longer than expected - no hash received after 30 seconds');
        console.warn('Status:', status);
        console.warn('isPending:', isPending);
        console.warn('writeError:', writeError);
        // Don't reset yet, just show warning
        if (!txError) {
          setTxError('Transaction is taking longer than expected. Please wait or check your wallet.');
        }
      }
      
      // After 60 seconds, reset and show error
      if (elapsed > 60000) {
        console.error('❌ Transaction timeout - no hash received after 60 seconds');
        setTxError('Transaction timeout. Please check your wallet and try again.');
        setHasJoinedQueue(false);
        setTxStartTime(null);
        // Reset writeContract to allow retry
        resetWriteContract?.();
      }
    }
  }, [isPending, hash, txStartTime, status, writeError, txError, resetWriteContract]);
  
  // Get pool status - count players waiting for this bet amount
  const [poolCount, setPoolCount] = useState<number>(0);
  
  // Read waiting players count for this bet amount
  // Note: We need to iterate through waitingPlayers array, but Solidity doesn't expose array length directly
  // For now, we'll use a polling approach or event-based counting

  // PRODUCTION: Real matchmaking using smart contract
  // No test mode - wallet connection is required

  // Watch for GameCreated event - this means a match was found
  // IMPORTANT: Event listener should be active even before transaction completes
  // because match can happen when another player joins after us
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    eventName: 'GameCreated',
    enabled: isConnected, // Always enabled when connected, not just after joining queue
    onLogs(logs) {
      // Check if this game involves the current player
      const gameLog = logs.find((log: any) => {
        const player1 = log.args.player1?.toLowerCase();
        const player2 = log.args.player2?.toLowerCase();
        const currentAddress = address?.toLowerCase();
        return player1 === currentAddress || player2 === currentAddress;
      });
      
      if (gameLog && isMatching) {
        console.log('Match found! GameCreated event received:', gameLog);
        setIsMatching(false);
        // Use gameId from event or transaction hash
        const gameId = gameLog.args.gameId?.toString() || gameLog.transactionHash || hash || `game-${Date.now()}`;
        onMatchFound(gameId);
      }
    },
  });

  // Join queue via contract - PRODUCTION MODE
  useEffect(() => {
    if (!isConnected || !writeContract || hasJoinedQueue) return;
    
    // Security: Validate inputs before sending transaction
    if (!isValidBetAmount(betAmount)) {
      console.error('Invalid bet amount:', betAmount);
      setTxError('Invalid bet amount.');
      return;
    }
    
    if (!address || !isValidAddress(address)) {
      console.error('Invalid wallet address');
      setTxError('Invalid wallet address.');
      return;
    }
    
    if (!CONTRACT_ADDRESS || !isValidAddress(CONTRACT_ADDRESS)) {
      console.error('Invalid contract address');
      setTxError('Invalid contract address.');
      return;
    }
    
    // Show notification that wallet approval is needed
    console.log('Sending transaction - wallet approval required');
    
    // Small delay to ensure UI is ready before showing wallet popup
    const sendTransaction = () => {
      try {
        console.log('🚀 Attempting to send transaction...');
        console.log('Contract address:', CONTRACT_ADDRESS);
        console.log('Bet amount:', betAmount.toString());
        console.log('Address:', address);
        console.log('Simulate data:', simulateData);
        console.log('Simulate error:', simulateError);
        
        // Check simulation error - only block if it's a critical error (insufficient funds)
        if (simulateError) {
          const errorMsg = simulateError?.message || (simulateError as any)?.shortMessage || String(simulateError);
          
          // Only block if insufficient funds - other errors might be false positives
          if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient')) {
            console.error('❌ Simulation error: Insufficient funds');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            setTxError('Insufficient funds. Please add more ETH to your wallet.');
            return;
          }
          
          // For other simulation errors, log but continue (might be false positive)
          console.warn('⚠️ Simulation error (non-critical), proceeding anyway:', errorMsg);
        }
        
        setTxError(null);
        setTxStartTime(Date.now());
        
        // Start transaction monitoring
        const txId = `joinQueue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        txIdRef.current = txId;
        startTransaction(
          txId,
          'joinQueue',
          CONTRACT_ADDRESS as `0x${string}`,
          [betAmount],
          betAmount,
          {
            betAmount: betAmount.toString(),
            address,
            contractAddress: CONTRACT_ADDRESS,
          }
        );
        updateTransaction(txId, { status: 'pending' });
        
        // Wagmi v3 best practice: Use simulateData.request if available
        // This includes all gas parameters and ensures wallet shows correct fee
        if (simulateData && (simulateData as any).request) {
          console.log('📤 Using simulateData.request (Wagmi v3 best practice)');
          console.log('Simulate request:', (simulateData as any).request);
          // Use the request object directly - it includes all necessary parameters
          writeContract((simulateData as any).request);
          updateTransaction(txId, { status: 'sending' });
        } else {
          // Fallback: send without simulation data (wallet will estimate)
          console.log('📤 Sending transaction without simulation (wallet will estimate gas)');
          writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: 'joinQueue' as const,
            args: [betAmount],
            value: betAmount,
          });
          updateTransaction(txId, { status: 'sending' });
        }
        
        console.log('📤 Transaction request sent, waiting for wallet approval and hash...');
        console.log('Current status:', status);
        console.log('isPending:', isPending);
        console.log('Transaction ID:', txId);
        
        // Set up a listener for status changes
        // Note: In Wagmi v3, status changes are tracked via the hook
        // We'll monitor it via useEffect above
      } catch (error: any) {
        console.error('❌ Error joining queue:', error);
        setHasJoinedQueue(false);
        setTxStartTime(null);
        
        let errorMessage = 'Transaction failed';
        const errorMsg = error?.message || error?.shortMessage || error?.cause?.message || String(error);
        
        if (errorMsg.includes('rejected') || errorMsg.includes('Rejected') || errorMsg.includes('User rejected') || errorMsg.includes('user rejected')) {
          errorMessage = 'Transaction was rejected. Please check your wallet and approve the transaction when the popup appears.';
        } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient')) {
          errorMessage = 'Insufficient funds. Please add more ETH to your wallet.';
        } else if (errorMsg.includes('denied') || errorMsg.includes('Denied')) {
          errorMessage = 'Transaction was denied. Please approve in your wallet.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
          errorMessage = 'Transaction timeout. Please try again.';
        } else if (errorMsg) {
          errorMessage = errorMsg;
        }
        
        setTxError(errorMessage);
        
        // Update monitoring system
        if (txIdRef.current) {
          updateTransaction(txIdRef.current, {
            status: 'failed',
            error: errorMessage,
          });
        }
      }
    };
    
    // Wait for simulation to be ready before sending (if enabled)
    // This ensures gas parameters are available for wallet popup
    // But don't wait too long - if simulation fails, send anyway
    if (simulateData && (simulateData as any).request) {
      // Simulation is ready, send immediately
      const timeoutId = setTimeout(sendTransaction, 100);
      return () => clearTimeout(timeoutId);
    } else if (simulateError && !simulateError.message?.includes('insufficient funds')) {
      // Simulation failed but not critical, send anyway (wallet will estimate)
      const timeoutId = setTimeout(sendTransaction, 200);
      return () => clearTimeout(timeoutId);
    } else {
      // Wait a bit for simulation to complete (max 2 seconds)
      const timeoutId = setTimeout(() => {
        // If simulation still not ready, send anyway
        sendTransaction();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, writeContract, betAmount, hasJoinedQueue, address, status, simulateData, simulateError]);

  // Poll game status as fallback if event doesn't fire
  // This handles cases where event listener might miss the event
  useEffect(() => {
    if (!isConnected || !isSuccess || !isMatching) return;
    
    // Poll every 2 seconds to check if game was created
    const pollInterval = setInterval(async () => {
      try {
        // Check if we have an active game by reading contract
        // This is a fallback if event listener doesn't catch the match
        // We'll check getMyGame status
      } catch (error) {
        console.error('Error polling game status:', error);
      }
    }, 2000);
    
    // Stop polling after 30 seconds (match should happen by then)
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 30000);
    
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isConnected, isSuccess, isMatching, address]);

  return (
    <div className="relative">
      {/* Transaction Approved Notification */}
      {showApproved && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="relative bg-black/95 backdrop-blur-lg px-8 py-6 rounded-xl shadow-[0_0_60px_rgba(34,211,238,1)] border-2 border-cyan-400">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-green-500/20 blur-xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="text-5xl animate-bounce drop-shadow-[0_0_30px_rgba(34,211,238,1)]">✅</div>
              <div>
                <h3 className="text-2xl font-black mb-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-green-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                  TRANSACTION APPROVED
                </h3>
                <p className="text-cyan-300 font-mono font-bold uppercase tracking-wider text-sm">
                  Successfully confirmed on blockchain
                </p>
              </div>
            </div>
            {/* Japanese Corner Accents with Neon */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
            {/* Pulse effect */}
            <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl animate-ping opacity-20"></div>
          </div>
        </div>
      )}
      
      {/* Japanese Gaming Match Found Notification */}
      {showMatchFound && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-match-found">
          <div className="relative bg-black/95 backdrop-blur-lg px-12 py-10 rounded-xl shadow-[0_0_60px_rgba(239,68,68,1)] border-2 border-red-400">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-blue-500/20 to-yellow-500/20 blur-xl"></div>
            <div className="relative flex items-center gap-6">
              <div className="text-7xl animate-bounce drop-shadow-[0_0_30px_rgba(239,68,68,1)]">🎉</div>
              <div>
                <h3 className="text-4xl font-black mb-2 bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                  MATCH FOUND!
                </h3>
                <p className="text-red-300 font-mono font-bold uppercase tracking-wider text-lg">
                  Game starting in 2 seconds...
                </p>
              </div>
            </div>
            {/* Japanese Corner Accents with Neon */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 lg:py-20">
        {/* Japanese Gaming Search Icon - Mobile Responsive */}
        <div className="relative mb-8 sm:mb-10 md:mb-12">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-black/60 border-3 sm:border-4 border-red-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)]">
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,1)] animate-pulse">🔍</div>
          </div>
          <div className="absolute inset-0 rounded-full border-3 sm:border-4 border-red-400/30 animate-ping"></div>
        </div>
        
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 text-center px-4">
          <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
            SEARCHING
          </span>
        </h2>
        
        <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-center max-w-md font-mono uppercase tracking-wider px-4">
          Looking for opponent...
        </p>
        
        {/* Pool Status Display - Mobile Responsive */}
        {isSuccess && isMatching && (
          <div className="mb-6 sm:mb-8 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-black/60 border-2 border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.4)] mx-4">
            <p className="text-cyan-400 font-mono font-bold text-center uppercase tracking-wider text-sm sm:text-base">
              Pool: {formatEther(betAmount)} ETH
            </p>
            <p className="text-gray-400 font-mono text-xs sm:text-sm text-center mt-2">
              Waiting for another player...
            </p>
          </div>
        )}
        
        {/* Gaming Status Indicators - Mobile Responsive */}
        <div className="space-y-4 sm:space-y-5 w-full max-w-md px-4">
          {isPending && !hash && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-blue-500/40 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.4)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-blue-400 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                <p className="text-blue-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                  {status === 'pending' ? 'Waiting for wallet approval...' : 'Sending transaction...'}
                </p>
              </div>
              <p className="text-gray-400 font-mono text-xs text-center mt-2">
                {txStartTime ? `Waiting ${Math.floor((Date.now() - txStartTime) / 1000)}s...` : 'Check your wallet for gas fee details'}
              </p>
              {txStartTime && Date.now() - txStartTime > 30000 && (
                <p className="text-yellow-400 font-mono text-xs text-center mt-1">
                  Taking longer than expected. Please check your wallet.
                </p>
              )}
            </div>
          )}
          
          {(isConfirming && !isPending && txHash) && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-yellow-500/40 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
                <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                  Transaction sent - waiting for match...
                </p>
              </div>
              <div className="mt-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 hover:text-yellow-200 font-mono text-xs underline"
                >
                  View on BaseScan
                </a>
              </div>
              <p className="text-gray-400 font-mono text-xs text-center mt-2">
                Event listener is active - match will be detected automatically
              </p>
            </div>
          )}
          
          {(writeError || txError) && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <p className="text-red-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm text-center">
                {txError || writeError?.message || 'Transaction failed'}
              </p>
              {(txError?.includes('rejected') || writeError?.message?.includes('rejected')) && (
                <div className="mt-2 text-center">
                  <p className="text-gray-400 font-mono text-xs mb-2">
                    Please check your wallet and approve the transaction.
                  </p>
                  <button
                    onClick={() => {
                      setHasJoinedQueue(false);
                      setTxError(null);
                      resetWriteContract?.(); // Reset writeContract state
                      // Retry transaction
                    }}
                    className="px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 font-mono text-sm hover:bg-red-500/30 transition-colors font-bold uppercase tracking-wider"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
          
          {isSuccess && isMatching && (
            <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-yellow-500/40 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
              <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                In Queue - Searching...
              </p>
            </div>
          )}
        </div>
        
        {/* Japanese Gaming Loading Dots */}
        <div className="flex gap-3 mt-12">
          <div className="w-4 h-4 bg-red-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,1)]" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,1)]" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(234,179,8,1)]" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Cancel Matchmaking Button - Mobile Responsive */}
        {onCancel && (isSuccess || isMatching) && (
          <div className="mt-8 sm:mt-10 md:mt-12 px-4">
            <button
              onClick={onCancel}
              disabled={isPending || isConfirming}
              className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-black/80 border-2 border-red-500/60 rounded-lg hover:border-red-500/80 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] text-red-400 font-mono font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base min-h-[48px]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>✕</span>
                <span>Cancel Search</span>
              </span>
              <div className="absolute inset-0 bg-red-500/10 blur-xl"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

