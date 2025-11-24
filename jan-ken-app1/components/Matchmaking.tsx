'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useWatchContractEvent, useSimulateContract, useChainId, useConnectorClient, useReadContract } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, getBetLevelFromAmount } from '@/lib/contract';
import { isValidBetAmount, isValidAddress } from '@/lib/security';

interface MatchmakingProps {
  betAmount: bigint;
  onMatchFound: (gameId: string, player1Address?: string, player2Address?: string) => void;
  onCancel?: () => void; // Cancel matchmaking callback
  showMatchFound?: boolean;
}

function MatchmakingComponent({ betAmount, onMatchFound, onCancel, showMatchFound = false }: MatchmakingProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isMatching, setIsMatching] = useState(true);
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  
  // Convert betAmount to betLevel (CRITICAL FIX!)
  const betLevel = useMemo(() => getBetLevelFromAmount(betAmount), [betAmount]);
  
  if (!betLevel) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400 font-bold">Error: Invalid bet amount</p>
        <p className="text-gray-400 text-sm mt-2">Please select a valid bet level</p>
      </div>
    );
  }
  
  const { data: hash, writeContract, isPending, error: writeError, reset: resetWriteContract, status } = useWriteContract({
    mutation: {
      onError: (error) => {
        // Safely extract error details (avoid BigInt serialization issues)
        console.error('❌ writeContract mutation error (onError callback)');
        console.error('Error type:', typeof error);
        console.error('Error name:', error?.name);
        console.error('Error constructor:', error?.constructor?.name);
        
        // Extract error properties safely (avoid JSON.stringify with BigInt)
        let errorMessage = 'Transaction failed';
        let errorCode: any = undefined;
        let errorShortMessage = '';
        let errorCause: any = null;
        
        try {
          // Extract error code
          if (error && typeof error === 'object') {
            errorCode = (error as any)?.code;
          }
          
          // Extract error message (multiple attempts)
          if (error?.message) {
            errorMessage = String(error.message);
          } else if ((error as any)?.shortMessage) {
            errorShortMessage = String((error as any).shortMessage);
            errorMessage = errorShortMessage;
          } else {
            try {
              errorMessage = String(error);
            } catch (e) {
              errorMessage = 'Transaction failed (could not extract error message)';
            }
          }
          
          // Try to extract cause safely
          try {
            if ((error as any)?.cause) {
              const cause = (error as any).cause;
              errorCause = {
                message: cause?.message ? String(cause.message) : undefined,
                name: cause?.name,
                code: cause?.code,
              };
            }
          } catch (e) {
            // Ignore cause extraction errors
          }
        } catch (e) {
          console.warn('Could not extract error details:', e);
          errorMessage = 'Transaction failed (could not extract error details)';
        }
        
        console.error('❌ Error message:', errorMessage);
        console.error('❌ Error short message:', errorShortMessage || 'none');
        console.error('❌ Error code:', errorCode);
        console.error('❌ Error cause:', errorCause);
        
        // Don't show BigInt serialization errors to user
        if (errorMessage.includes('BigInt') || errorMessage.includes('serialize')) {
          errorMessage = 'Transaction failed. Please try again.';
          console.error('❌ Internal error (BigInt serialization) - not showing to user');
        }
        
        setTxError(`Transaction failed: ${errorMessage}`);
        setHasJoinedQueue(false);
        setTxStartTime(null);
      },
      onSuccess: (data) => {
        console.log('✅ writeContract mutation success (onSuccess callback):', data);
        console.log('Transaction hash from callback:', data);
        if (data) {
          setTxHash(data);
          setHasJoinedQueue(true);
          setTxError(null);
        }
      },
      onMutate: (variables) => {
        // Convert BigInt values to string for logging (JSON.stringify can't serialize BigInt)
        // DON'T use spread operator - it copies ABI which may contain BigInt values
        try {
          const variablesForLog: any = {
            address: variables?.address,
            functionName: variables?.functionName,
            args: variables?.args ? variables.args.map((arg: any) => 
              typeof arg === 'bigint' ? arg.toString() : (typeof arg === 'object' ? '[object]' : String(arg))
            ) : variables?.args,
            value: variables?.value ? (typeof variables.value === 'bigint' ? variables.value.toString() : String(variables.value)) : variables?.value,
            // Don't log ABI - it's very large and may contain BigInt
            abi: 'ABI_REMOVED_FOR_LOGGING',
          };
          console.log('🔄 writeContract mutation started (onMutate callback):', variablesForLog);
          console.log('This means writeContract was called and is processing...');
        } catch (e) {
          // If logging fails, just log a simple message
          console.log('🔄 writeContract mutation started (onMutate callback)');
          console.log('This means writeContract was called and is processing...');
          console.warn('Could not log mutation variables (BigInt serialization issue):', e);
        }
      },
      onSettled: (data: any, error: any) => {
        // Safely log settled state (avoid BigInt serialization issues)
        const settledData: any = {
          data: data ? (typeof data === 'bigint' ? data.toString() : String(data)) : data,
          error: null,
        };
        
        if (error) {
          settledData.error = {
            message: error?.message,
            name: error?.name,
            code: (error as any)?.code,
            shortMessage: (error as any)?.shortMessage,
          };
        }
        
        console.log('🏁 writeContract mutation settled (onSettled callback):', settledData);
      },
    },
  });
  const { data: connectorClient } = useConnectorClient();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStartTime, setTxStartTime] = useState<number | null>(null);
  
  // Check user's current game status before joining queue
  // This helps prevent E15 error (player already in queue)
  const { data: currentGame, refetch: refetchGame } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getMyGame',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      retry: 2,
    },
  });
  
  // Simulate contract call before sending transaction (per Wagmi best practices)
  // This validates the transaction and provides gas estimation
  // CRITICAL FIX: Contract expects betLevel, not betAmount!
  const { data: simulateData, error: simulateError, status: simulateStatus } = useSimulateContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'joinQueue',
    args: [BigInt(betLevel)], // ✅ FIX: Use betLevel instead of betAmount
    value: betAmount, // Value is still betAmount (ETH to send)
    query: {
      enabled: isConnected && !!address && !!betAmount && !!betLevel && !hasJoinedQueue && !!connectorClient,
      retry: 3,
      retryDelay: 1000,
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
  const [txConfirmed, setTxConfirmed] = useState(false);
  
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('[Matchmaking] ✅ Transaction confirmed:', hash);
      setShowApproved(true);
      setTxConfirmed(true);
      
      // Hide approved notification after 3 seconds, but keep confirmed state
      const timer = setTimeout(() => {
        setShowApproved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash]);
  
  // Reset confirmed state when starting new transaction
  useEffect(() => {
    if (isPending && !hash) {
      setTxConfirmed(false);
    }
  }, [isPending, hash]);
  
  // Handle receipt errors
  useEffect(() => {
    if (isReceiptError) {
      console.error('[Matchmaking] ❌ Transaction receipt error:', isReceiptError);
      setTxError('Transaction confirmation failed. Please try again.');
      setHasJoinedQueue(false);
      setTxStartTime(null);
    }
  }, [isReceiptError]);
  
  // Store hash when transaction is sent and update state
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      setHasJoinedQueue(true);
      setTxError(null);
      setTxStartTime(null);
      console.log('✅ Transaction hash received:', hash);
      console.log('Transaction status:', status);
      console.log('✅ Transaction sent to contract:', CONTRACT_ADDRESS);
    }
  }, [hash, status]);

  // Monitor status changes - hash might come after status changes
  useEffect(() => {
    console.log('📊 Transaction status changed:', {
      status,
      isPending,
      hash,
      hasError: !!writeError,
      timestamp: new Date().toISOString(),
    });


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
    }
    
    // CRITICAL: If status goes from pending to idle without hash or error, something is wrong
    // This happens when wallet popup doesn't appear or transaction is silently rejected
    if (status === 'idle' && !hash && !writeError && hasJoinedQueue && !isPending) {
      console.error('❌ CRITICAL: Transaction status went from pending to idle without hash or error!');
      console.error('This means wallet popup did not appear or transaction was silently rejected');
      console.error('Status:', status);
      console.error('isPending:', isPending);
      console.error('hash:', hash);
      console.error('writeError:', writeError);
      console.error('hasJoinedQueue:', hasJoinedQueue);
      
      // Reset state to allow retry
      setHasJoinedQueue(false);
      setTxError('Transaction was not sent. Wallet popup may not have appeared. Please check your wallet connection and try again.');
      resetWriteContract?.();
    }
  }, [status, isPending, hash, writeError, hasJoinedQueue, resetWriteContract]);
  
  // Handle writeError from useWriteContract
  useEffect(() => {
    if (writeError) {
      console.error('❌ WriteContract error detected:', writeError);
      console.error('Error type:', typeof writeError);
      console.error('Error constructor:', writeError?.constructor?.name);
      // Log error details safely (avoid BigInt serialization)
      console.error('Error details:', {
        message: writeError?.message ? String(writeError.message) : undefined,
        shortMessage: (writeError as any)?.shortMessage ? String((writeError as any).shortMessage) : undefined,
        name: writeError?.name,
        code: (writeError as any)?.code,
        // Don't log cause, stack, or data - they may contain BigInt or circular references
      });
      
      setHasJoinedQueue(false);
      setTxStartTime(null);
      
      let errorMessage = 'Transaction failed';
      const errorMsg = writeError?.message || (writeError as any)?.shortMessage || (writeError as any)?.cause?.message || String(writeError);
      const errorCode = (writeError as any)?.code;
      
      console.error('Error message extracted:', errorMsg);
      console.error('Error code:', errorCode);
      
      // Check for specific error codes
      if (errorCode === 4001 || errorCode === '4001') {
        errorMessage = 'Transaction was rejected by user. Please check your wallet popup and approve the transaction.';
      } else if (errorCode === -32603 || errorCode === '-32603') {
        errorMessage = 'Internal JSON-RPC error. Please check your wallet connection and try again.';
      } else if (errorMsg.includes('rejected') || errorMsg.includes('Rejected') || errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('ACTION_REJECTED')) {
        errorMessage = 'Transaction was rejected. Please check your wallet popup and approve the transaction. Make sure you are on Base Sepolia network (Chain ID: 84532).';
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient')) {
        errorMessage = 'Insufficient funds. Please add more ETH to your wallet.';
      } else if (errorMsg.includes('denied') || errorMsg.includes('Denied')) {
        errorMessage = 'Transaction was denied. Please approve in your wallet.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        errorMessage = 'Transaction timeout. Please try again.';
      } else if (errorMsg.includes('network') || errorMsg.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMsg.includes('not connected') || errorMsg.includes('Not connected')) {
        errorMessage = 'Wallet not connected. Please reconnect your wallet.';
      } else if (errorMsg) {
        errorMessage = `Transaction failed: ${errorMsg}`;
      }
      
      setTxError(errorMessage);
      
      // Reset writeContract state to allow retry
      if (errorMsg.includes('rejected') || errorCode === 4001 || errorCode === '4001') {
        console.log('Resetting writeContract state to allow retry...');
        resetWriteContract?.();
      }
      
      console.error('Final transaction error details:', {
        error: writeError,
        errorMessage,
        errorCode,
        contract: CONTRACT_ADDRESS,
        betAmount: betAmount.toString(),
        address,
        chainId,
        isConnected,
      });
    }
  }, [writeError, resetWriteContract, betAmount, betLevel, address, chainId, isConnected]);
  
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

  // Watch for PlayerJoinedQueue event - track when players join queue
  // This helps us detect if 2 players are in queue but match hasn't happened
  // OPTIMIZED: Memoized callback and debounced refetch
  const playerJoinedQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handlePlayerJoinedQueue = useCallback((logs: any[]) => {
    // If we're waiting for a match and someone joined, check game status
    if (isMatching && hasJoinedQueue && logs.length > 0) {
      // Clear previous timeout
      if (playerJoinedQueueTimeoutRef.current) {
        clearTimeout(playerJoinedQueueTimeoutRef.current);
      }
      
      // Debounced refetch - only check once after a short delay
      playerJoinedQueueTimeoutRef.current = setTimeout(() => {
        refetchGame();
        playerJoinedQueueTimeoutRef.current = null;
      }, 1000);
    }
  }, [isMatching, hasJoinedQueue, refetchGame]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    eventName: 'PlayerJoinedQueue',
    enabled: isConnected && !!address && hasJoinedQueue, // Only watch when we're in queue
    pollingInterval: 3000, // Poll every 3 seconds (optimized)
    onLogs: handlePlayerJoinedQueue,
  });

  // Watch for GameCreated event - this means a match was found
  // IMPORTANT: Event listener should be active even before transaction completes
  // because match can happen when another player joins after us
  // OPTIMIZED: Memoized callback and increased polling interval
  const handleGameCreatedLogs = useCallback((logs: any[]) => {
    // Check ALL logs, not just one
    logs.forEach((log: any) => {
      const player1 = log.args?.player1?.toLowerCase();
      const player2 = log.args?.player2?.toLowerCase();
      const currentAddress = address?.toLowerCase();
      const isMatch = player1 === currentAddress || player2 === currentAddress;
      
      if (isMatch) {
        console.log('[Matchmaking] ✅ MATCH FOUND! GameCreated event received!');
        
        // Stop matching
        setIsMatching(false);
        
        // Use gameId from event or transaction hash
        const gameId = log.args?.gameId?.toString() || log.transactionHash || hash || `game-${Date.now()}`;
        const p1 = log.args?.player1;
        const p2 = log.args?.player2;
        
        onMatchFound(gameId, p1, p2);
      }
    });
  }, [address, hash, onMatchFound]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    eventName: 'GameCreated',
    enabled: isConnected && !!address, // Always enabled when connected, not just after joining queue
    pollingInterval: 3000, // Poll every 3 seconds for events (optimized - less aggressive)
    onLogs: handleGameCreatedLogs,
  });

  // Join queue via contract - PRODUCTION MODE
  useEffect(() => {
    // CRITICAL: Check connector client before proceeding
    if (!connectorClient) {
      console.warn('⚠️ Connector client not available, cannot send transaction');
      if (isConnected && address) {
        setTxError('Wallet connection issue. Please disconnect and reconnect your wallet.');
      }
      return;
    }
    
    if (!isConnected || !writeContract || hasJoinedQueue) return;
    
    // Check network - Base Sepolia chain ID is 84532
    if (chainId !== 84532) {
      console.error('Wrong network! Current chain ID:', chainId, 'Expected: 84532 (Base Sepolia)');
      setTxError('Please switch to Base Sepolia network. Current network is not supported.');
      return;
    }
    
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
    const sendTransaction = async () => {
      try {
        // Check wallet provider before sending - use imported SDK
        console.log('🔍 Wallet provider check:');
        console.log('  - Imported SDK available:', !!sdk);
        console.log('  - SDK wallet available:', !!(sdk && sdk.wallet));
        
        let farcasterProvider: any = null;
        if (sdk && sdk.wallet) {
          try {
            farcasterProvider = await sdk.wallet.getEthereumProvider();
            console.log('  - Farcaster provider:', !!farcasterProvider);
            if (farcasterProvider) {
              const providerAny = farcasterProvider as any;
              
              // Get chainId via request method (EIP-1193)
              try {
                const chainIdHex = await providerAny.request({ method: 'eth_chainId' });
                const chainId = chainIdHex ? parseInt(chainIdHex, 16) : undefined;
                console.log('  - Provider chainId (via request):', chainId);
                console.log('  - Provider chainId (direct):', providerAny.chainId);
                
                if (chainId && chainId !== 84532) {
                  console.error('  - ❌ Wrong chain ID! Expected 84532 (Base Sepolia), got:', chainId);
                  setTxError(`Wrong network. Please switch to Base Sepolia (Chain ID: 84532). Current: ${chainId}`);
                  setHasJoinedQueue(false);
                  setTxStartTime(null);
                  return;
                }
              } catch (err) {
                console.warn('  - Could not get chainId from provider:', err);
              }
              
              // Get network version
              try {
                const networkVersion = await providerAny.request({ method: 'net_version' });
                console.log('  - Provider networkVersion (via request):', networkVersion);
              } catch (err) {
                console.warn('  - Could not get networkVersion from provider:', err);
              }
              
              console.log('  - Provider networkVersion (direct):', providerAny.networkVersion);
              console.log('  - Provider isConnected (direct):', providerAny.isConnected);
              console.log('  - Provider has request method:', typeof providerAny.request === 'function');
              console.log('  - Provider has send method:', typeof providerAny.send === 'function');
              
              // Test if provider is responsive
              try {
                const accounts = await providerAny.request({ method: 'eth_accounts' });
                console.log('  - Provider accounts:', accounts);
              } catch (err) {
                console.warn('  - Could not get accounts from provider:', err);
              }
            } else {
              console.error('  - ❌ Farcaster provider is null/undefined!');
            }
          } catch (err) {
            console.error('  - ❌ Could not get Farcaster provider:', err);
          }
        } else {
          console.error('  - ❌ SDK or SDK.wallet not available!');
        }
        
        // Also check window for debugging
        if (typeof window !== 'undefined') {
          const ethereum = (window as any).ethereum;
          const farcaster = (window as any).farcaster;
          console.log('  - window.ethereum:', !!ethereum);
          console.log('  - window.farcaster:', !!farcaster);
        }
        
        console.log('🚀 Attempting to send transaction...');
        console.log('Contract address:', CONTRACT_ADDRESS);
        console.log('Bet amount:', betAmount.toString());
        console.log('Address:', address);
        console.log('Chain ID:', chainId);
        console.log('Is connected:', isConnected);
        console.log('Simulate status:', simulateStatus);
        console.log('Simulate data available:', !!simulateData);
        // Don't log simulateError object directly - it may contain BigInt
        console.log('Simulate error available:', !!simulateError);
        if (simulateError) {
          console.log('Simulate error type:', typeof simulateError);
          console.log('Simulate error name:', simulateError?.name);
          console.log('Simulate error message:', simulateError?.message ? String(simulateError.message) : 'none');
        }
        
        // CRITICAL: Wait for simulation to complete before sending transaction
        // Per Wagmi best practices, we should use simulateData.request for gas estimation
        if (simulateStatus === 'pending') {
          console.warn('⚠️ Simulation is still pending, waiting for it to complete...');
          console.warn('⚠️ This might take a few seconds. The useEffect will retry when simulation completes.');
          return; // Wait for simulation to complete - useEffect will retry when simulateStatus changes
        }
        
        if (simulateStatus === 'error') {
          // Log detailed error information (avoid BigInt serialization)
          // DON'T log simulateError object directly - it may contain BigInt values
          console.error('❌ Simulation error detected');
          console.error('Simulate status:', simulateStatus);
          console.error('Error type:', typeof simulateError);
          console.error('Error constructor:', simulateError?.constructor?.name);
          console.error('Error name:', simulateError?.name);
          
          // Try to get error keys safely
          try {
            if (simulateError && typeof simulateError === 'object') {
              const errorKeys = Object.keys(simulateError);
              console.error('Error keys:', errorKeys);
            }
          } catch (e) {
            console.error('Could not get error keys:', e);
          }
          
          // Try to extract error message safely (avoid JSON.stringify with BigInt)
          let errorMsg = 'Unknown simulation error';
          let errorCode: any = undefined;
          let errorShortMessage = '';
          
          try {
            if (simulateError) {
              // Extract error code
              if (typeof simulateError === 'object') {
                errorCode = (simulateError as any)?.code;
              }
              
              // Extract error message (multiple attempts, avoid BigInt)
              if (simulateError?.message) {
                errorMsg = String(simulateError.message);
              } else if ((simulateError as any)?.shortMessage) {
                errorShortMessage = String((simulateError as any).shortMessage);
                errorMsg = errorShortMessage;
              } else if ((simulateError as any)?.cause?.message) {
                errorMsg = String((simulateError as any).cause.message);
              } else if ((simulateError as any)?.reason) {
                errorMsg = String((simulateError as any).reason);
              } else {
                // Last resort: try to stringify (but catch BigInt issues)
                try {
                  errorMsg = String(simulateError);
                } catch (e) {
                  errorMsg = 'Simulation error (could not extract details)';
                }
              }
            } else {
              // If simulateError is null/undefined but status is error, it might be a different issue
              console.warn('⚠️ Simulation status is error but simulateError is null/undefined');
              console.warn('⚠️ This might indicate a network or RPC issue');
              errorMsg = 'Simulation failed (network or RPC issue)';
            }
          } catch (e) {
            console.warn('Could not extract error message:', e);
            errorMsg = 'Simulation error (could not extract details)';
          }
          
          console.error('❌ Simulation error message:', errorMsg);
          console.error('❌ Simulation error short message:', errorShortMessage || 'none');
          console.error('❌ Simulation error code:', errorCode);
          
          // Only block if it's a critical error (insufficient funds or E15 - player already in queue)
          if (errorMsg.includes('insufficient funds') || 
              errorMsg.includes('Insufficient') ||
              errorMsg.includes('insufficient balance')) {
            console.error('❌ Simulation error: Insufficient funds - BLOCKING transaction');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            setTxError('Insufficient funds. Please add more ETH to your wallet.');
            return;
          }
          
          // E15 error: Player already in queue (player1 == player2 in _matchPlayers)
          // E5 error: Player already has an active game
          // If user is already in queue (E5), check game status - might be waiting for match
          if (errorMsg.includes('E15') || errorMsg.includes('E5')) {
            console.warn('⚠️ Simulation error: Player already in queue (E15/E5)');
            console.warn('⚠️ Checking current game status...');
            
            // Check current game status - might be waiting for match
            try {
              const gameData = await refetchGame();
              if (gameData?.data) {
                const game = gameData.data;
                const gameStatus = game.status;
                const hasPlayer2 = game.player2 && game.player2 !== '0x0000000000000000000000000000000000000000';
                
                console.log('📊 Current game status:', {
                  status: gameStatus,
                  player1: game.player1,
                  player2: game.player2,
                  hasPlayer2,
                  betAmount: game.betAmount?.toString(),
                });
                
                // Status 2 = InProgress (matched and game started)
                if (gameStatus === 2 || (gameStatus === 1 && hasPlayer2)) {
                  console.log('✅ Game already matched! Status:', gameStatus);
                  setIsMatching(false);
                  setHasJoinedQueue(true); // Mark as joined since game exists
                  const gameId = game.player1 && game.player2 
                    ? `game-${game.player1.toLowerCase()}-${game.player2.toLowerCase()}-${Date.now()}`
                    : `game-${Date.now()}`;
                  console.log('✅ Calling onMatchFound with gameId:', gameId);
                  onMatchFound(gameId, game.player1, game.player2);
                  return; // Don't show error, game already exists
                } else if (gameStatus === 0 && !hasPlayer2) {
                  // Status 0 = Waiting, no player2 yet - user is in queue waiting for match
                  console.log('⏳ User is in queue waiting for match (status: Waiting)');
                  console.log('⏳ Enabling polling to wait for match...');
                  setHasJoinedQueue(true); // Mark as joined since we're in queue
                  setTxError(null); // Clear error - this is expected, we're waiting
                  // Don't return - let polling mechanism handle it
                  // Continue to send transaction anyway (might be duplicate, but contract will handle it)
                } else {
                  // Other status - show error
                  console.error('❌ Game in unexpected state:', gameStatus);
                  setHasJoinedQueue(false);
                  setTxStartTime(null);
                  setTxError('You are already in the queue or have an active game. Please wait for a match or finish your current game.');
                  return;
                }
              } else {
                // No game data - might be a different issue
                console.error('❌ No game data found, but E5 error occurred');
                setHasJoinedQueue(false);
                setTxStartTime(null);
                setTxError('You are already in the queue or have an active game. Please wait for a match or finish your current game.');
                return;
              }
            } catch (gameCheckError) {
              console.error('❌ Error checking game status:', gameCheckError);
              setHasJoinedQueue(false);
              setTxStartTime(null);
              setTxError('You are already in the queue or have an active game. Please wait for a match or finish your current game.');
              return;
            }
            
            // If we reach here, user is in queue waiting - don't block, let transaction proceed
            // Contract will handle duplicate join attempts
            console.warn('⚠️ User already in queue, but allowing transaction to proceed (contract will handle)');
          }
          
          // For other simulation errors, log but continue (might be false positive)
          // Common non-critical errors: RPC timeout, network issues, etc.
          console.warn('⚠️ Simulation error (non-critical), proceeding with direct transaction');
          console.warn('⚠️ Error details:', errorMsg);
          console.warn('⚠️ Error code:', errorCode);
          console.warn('⚠️ Wallet will estimate gas instead');
          // Continue to send transaction even if simulation failed (non-critical error)
        }
        
        // If simulation data is not available and status is not error, wait for it
        // Note: This check is after the pending check above, so status can be 'success' or 'error' here
        // BUT: If simulation status is error, we should proceed with fallback transaction
        if (!simulateData && simulateStatus !== 'error' && simulateStatus !== 'success') {
          console.warn('⚠️ Simulation data not available yet, waiting...');
          console.warn('⚠️ Simulation status:', simulateStatus);
          return; // Wait for simulation to complete
        }
        
        // If simulation failed (error status) but we don't have data, proceed with fallback
        if (!simulateData && simulateStatus === 'error') {
          console.warn('⚠️ Simulation failed but no data available, proceeding with fallback transaction');
          console.warn('⚠️ Wallet will estimate gas instead');
        }
        
        // Check Wagmi connector client - CRITICAL CHECK
        console.log('🔍 Wagmi connector client check:');
        console.log('  - Connector client available:', !!connectorClient);
        console.log('  - isConnected:', isConnected);
        console.log('  - address:', address);
        console.log('  - chainId:', chainId);
        
        // CRITICAL: If connector client is not available, we cannot send transactions
        if (!connectorClient) {
          console.error('  - ❌ CRITICAL: Connector client is not available!');
          console.error('  - This means Wagmi cannot send transactions.');
          console.error('  - isConnected:', isConnected);
          console.error('  - address:', address);
          console.error('  - chainId:', chainId);
          console.error('  - Farcaster provider available:', !!farcasterProvider);
          
          // If connected but no client, this is a critical issue
          if (isConnected && address) {
            console.error('  - ⚠️ Wallet is connected but connector client is missing!');
            console.error('  - This usually means connector needs to be reconnected.');
            console.error('  - SOLUTION: Disconnect and reconnect your wallet.');
            setTxError('Wallet connection issue detected. Please disconnect and reconnect your wallet to fix this.');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            return;
          } else {
            console.error('  - ⚠️ Wallet is not connected, cannot send transaction.');
            setTxError('Wallet not connected. Please connect your wallet first.');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            return;
          }
        } else {
          console.log('  - ✅ Connector client is available!');
          console.log('  - Connector client account:', connectorClient.account);
          console.log('  - Connector client chain:', connectorClient.chain);
          console.log('  - Connector client transport:', !!connectorClient.transport);
          
          // Try to get provider from connector client
          try {
            // In Wagmi v3, connector client uses transport, not direct provider
            // Provider is accessed via connector client's transport or account
            const connectorProvider = (connectorClient as any).provider;
            const connectorTransport = connectorClient.transport;
            const connectorAccount = connectorClient.account;
            
            console.log('  - Connector provider (direct):', !!connectorProvider);
            console.log('  - Connector transport:', !!connectorTransport);
            console.log('  - Connector account:', !!connectorAccount);
            
            // Try to get provider from transport
            if (connectorTransport) {
              const transportProvider = (connectorTransport as any).value?.provider || (connectorTransport as any).provider;
              console.log('  - Transport provider:', !!transportProvider);
              if (transportProvider) {
                console.log('  - Transport provider chainId:', transportProvider.chainId);
              }
            }
            
            if (connectorProvider) {
              console.log('  - Connector provider chainId:', connectorProvider.chainId);
              console.log('  - Connector provider is same as Farcaster provider:', connectorProvider === farcasterProvider);
            } else {
              console.warn('  - ⚠️ Connector provider is not available in connector client');
              console.warn('  - This is normal for Wagmi v3 - provider is accessed via transport');
            }
          } catch (err) {
            console.warn('  - Could not get connector provider:', err);
          }
        }
        
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
        
        // Validate writeContract is available
        if (!writeContract) {
          console.error('❌ writeContract is not available');
          setTxError('Wallet connection error. Please reconnect your wallet.');
          setHasJoinedQueue(false);
          setTxStartTime(null);
          return;
        }
        
        setTxError(null);
        setTxStartTime(Date.now());
        
        // Prepare transaction parameters
        // CRITICAL FIX: Contract expects betLevel, not betAmount!
        const txParams = {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'joinQueue' as const,
          args: [BigInt(betLevel)] as [bigint], // ✅ FIX: Use betLevel instead of betAmount
          value: betAmount, // Value is still betAmount (ETH to send)
        };
        
        // Send transaction with proper gas estimation
        console.log('📤 Sending transaction to contract...');
        console.log('Contract:', CONTRACT_ADDRESS);
        console.log('Function: joinQueue');
        console.log('Args (betLevel):', [betLevel]); // ✅ FIX: Log betLevel
        console.log('Value:', betAmount.toString(), 'wei =', (Number(betAmount) / 1e18).toFixed(6), 'ETH');
        console.log('🎯 betLevel:', betLevel, '(contract expects this, not betAmount!)');
        console.log('From:', address);
        console.log('Chain ID:', chainId);
        console.log('writeContract function type:', typeof writeContract);
        // Log transaction params safely (avoid JSON.stringify with BigInt)
        console.log('Transaction params:', {
          address: txParams.address,
          functionName: txParams.functionName,
          args: txParams.args.map(a => typeof a === 'bigint' ? a.toString() : String(a)),
          value: txParams.value.toString(),
        });
        
        try {
          // IMPORTANT: If Farcaster provider is not available, we can't send transaction
          if (!farcasterProvider && sdk && sdk.wallet) {
            console.error('❌ Farcaster provider not available - cannot send transaction');
            setTxError('Wallet provider not available. Please check your Farcaster wallet connection.');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            return;
          }
          
          // Verify provider chainId matches expected network
          if (farcasterProvider) {
            try {
              const providerAny = farcasterProvider as any;
              const chainIdHex = await providerAny.request({ method: 'eth_chainId' });
              const providerChainId = chainIdHex ? parseInt(chainIdHex, 16) : undefined;
              
              if (providerChainId && providerChainId !== 84532) {
                console.error('❌ Provider chainId mismatch! Expected 84532, got:', providerChainId);
                setTxError(`Wrong network. Please switch to Base Sepolia (Chain ID: 84532). Current: ${providerChainId}`);
                setHasJoinedQueue(false);
                setTxStartTime(null);
                return;
              }
              
              console.log('✅ Provider chainId verified:', providerChainId);
            } catch (err) {
              console.warn('⚠️ Could not verify provider chainId, proceeding anyway:', err);
            }
          }
          
          // Use simulation data if available for better gas estimation
          if (simulateData && (simulateData as any).request) {
            console.log('📤 Using simulation data for gas estimation');
            
            // Log simulation request details safely (avoid BigInt serialization)
            const simRequest = (simulateData as any).request;
            // DON'T log simRequest directly - it contains BigInt values
            console.log('Simulation request details:', {
              address: simRequest.address,
              functionName: simRequest.functionName,
              args: simRequest.args?.map((a: any) => typeof a === 'bigint' ? a.toString() : String(a)),
              value: simRequest.value ? (typeof simRequest.value === 'bigint' ? simRequest.value.toString() : String(simRequest.value)) : undefined,
              gas: simRequest.gas ? (typeof simRequest.gas === 'bigint' ? simRequest.gas.toString() : String(simRequest.gas)) : undefined,
              gasPrice: simRequest.gasPrice ? (typeof simRequest.gasPrice === 'bigint' ? simRequest.gasPrice.toString() : String(simRequest.gasPrice)) : undefined,
              maxFeePerGas: simRequest.maxFeePerGas ? (typeof simRequest.maxFeePerGas === 'bigint' ? simRequest.maxFeePerGas.toString() : String(simRequest.maxFeePerGas)) : undefined,
              maxPriorityFeePerGas: simRequest.maxPriorityFeePerGas ? (typeof simRequest.maxPriorityFeePerGas === 'bigint' ? simRequest.maxPriorityFeePerGas.toString() : String(simRequest.maxPriorityFeePerGas)) : undefined,
            });
            
            console.log('📤 Calling writeContract with simulation request...');
            try {
              writeContract(simRequest);
              console.log('✅ writeContract called successfully (with simulation request)');
            } catch (writeErr: any) {
              console.error('❌ Error calling writeContract with simulation request:', writeErr);
              // Safely extract error message
              let errorMsg = '';
              try {
                errorMsg = writeErr?.message || (writeErr as any)?.shortMessage || String(writeErr);
              } catch (e) {
                errorMsg = 'Unknown error';
              }
              setTxError(`Failed to send transaction: ${errorMsg}`);
              setHasJoinedQueue(false);
              setTxStartTime(null);
              return;
            }
          } else {
            console.log('📤 Sending transaction directly (wallet will estimate gas)');
            console.log('Calling writeContract with params:', {
              address: txParams.address,
              functionName: txParams.functionName,
              args: txParams.args.map(a => a.toString()),
              value: txParams.value.toString(),
            });
            console.log('📤 Calling writeContract...');
            try {
              writeContract(txParams);
              console.log('✅ writeContract called successfully (direct)');
            } catch (writeErr: any) {
              console.error('❌ Error calling writeContract directly:', writeErr);
              // Safely extract error message
              let errorMsg = '';
              try {
                errorMsg = writeErr?.message || (writeErr as any)?.shortMessage || String(writeErr);
              } catch (e) {
                errorMsg = 'Unknown error';
              }
              setTxError(`Failed to send transaction: ${errorMsg}`);
              setHasJoinedQueue(false);
              setTxStartTime(null);
              return;
            }
          }
          
          console.log('Current status after call:', status);
          console.log('isPending after call:', isPending);
          console.log('Waiting for wallet popup...');
          
          // Monitor status changes more closely
          let statusCheckCount = 0;
          const statusCheckInterval = setInterval(() => {
            statusCheckCount++;
            console.log(`⏰ ${statusCheckCount * 0.5}s after writeContract call:`, {
              status,
              isPending,
              hash: hash || 'none',
              error: writeError ? {
                message: writeError.message,
                code: (writeError as any).code,
                name: writeError.name,
              } : 'none',
            });
            
            // If we've been pending for more than 5 seconds without hash or error, something is wrong
            if (statusCheckCount >= 10) {
              clearInterval(statusCheckInterval);
              if (!hash && !writeError) {
                console.error('❌ Transaction stuck - no hash and no error after 5 seconds');
                console.error('This usually means wallet popup did not appear or transaction was silently rejected');
                
                // Try to get more info from Farcaster SDK
                if (sdk && sdk.wallet) {
                  sdk.wallet.getEthereumProvider().then(async (provider) => {
                    if (provider) {
                      const providerAny = provider as any;
                      try {
                        const chainIdHex = await providerAny.request({ method: 'eth_chainId' });
                        const chainId = chainIdHex ? parseInt(chainIdHex, 16) : undefined;
                        const accounts = await providerAny.request({ method: 'eth_accounts' });
                        console.log('Provider state:', {
                          chainId: chainId,
                          chainIdDirect: providerAny.chainId,
                          accounts: accounts,
                          isConnected: providerAny.isConnected,
                          hasRequest: typeof providerAny.request === 'function',
                        });
                      } catch (err) {
                        console.error('Could not get provider state details:', err);
                        console.log('Provider state (basic):', {
                          chainId: providerAny.chainId,
                          isConnected: providerAny.isConnected,
                        });
                      }
                    } else {
                      console.warn('Provider is null/undefined');
                    }
                  }).catch(err => {
                    console.error('Could not get provider state:', err);
                  });
                }
              }
            }
            
            // Stop checking if we have hash or error
            if (hash || writeError) {
              clearInterval(statusCheckInterval);
            }
          }, 500); // Check every 500ms
          
        } catch (err: any) {
          // Safely extract error details (avoid BigInt serialization issues)
          // DON'T log error object directly - it may contain BigInt values
          console.error('❌ Error calling writeContract detected');
          console.error('❌ Error type:', typeof err);
          console.error('❌ Error constructor:', err?.constructor?.name);
          console.error('❌ Error name:', err?.name);
          
          // Try to extract error message safely
          let errorMsg = '';
          try {
            errorMsg = err?.message ||
                      (err as any)?.shortMessage ||
                      (err as any)?.cause?.message ||
                      (err as any)?.reason ||
                      String(err);
          } catch (e) {
            console.warn('Could not extract error message:', e);
            errorMsg = 'Unknown error (could not extract message)';
          }
          
          console.error('❌ Extracted error message:', errorMsg);
          console.error('❌ Error code:', (err as any)?.code);
          
          setHasJoinedQueue(false);
          setTxStartTime(null);
          setTxError(`Failed to send transaction: ${errorMsg}`);
          return;
        }
        
        // Set up a listener for status changes
        // Note: In Wagmi v3, status changes are tracked via the hook
        // We'll monitor it via useEffect above
      } catch (error: any) {
        // Safely extract error details (avoid BigInt serialization issues)
        console.error('❌ Error joining queue detected');
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error constructor:', error?.constructor?.name);
        console.error('❌ Error name:', error?.name);
        
        // Try to extract error properties safely (avoid JSON.stringify with BigInt)
        let errorCode: any = undefined;
        let errorMessage = 'Transaction failed';
        let errorMsg = '';
        let errorShortMessage = '';
        let errorCause: any = null;
        
        try {
          // Extract error code
          if (error && typeof error === 'object') {
            errorCode = (error as any)?.code;
          }
          
          // Extract error message (multiple attempts)
          if (error?.message) {
            errorMsg = String(error.message);
          } else if ((error as any)?.shortMessage) {
            errorShortMessage = String((error as any).shortMessage);
            errorMsg = errorShortMessage;
          } else if ((error as any)?.cause?.message) {
            errorMsg = String((error as any).cause.message);
          } else if ((error as any)?.reason) {
            errorMsg = String((error as any).reason);
          } else {
            // Last resort: try to stringify error (but catch BigInt issues)
            try {
              errorMsg = String(error);
            } catch (e) {
              errorMsg = 'Unknown error (could not extract message)';
            }
          }
        } catch (e) {
          console.warn('Could not extract error message:', e);
          errorMsg = 'Unknown error (could not extract message)';
        }
        
        // Try to extract cause safely
        try {
          if ((error as any)?.cause) {
            const cause = (error as any).cause;
            errorCause = {
              message: cause?.message ? String(cause.message) : undefined,
              name: cause?.name,
              code: cause?.code,
            };
          }
        } catch (e) {
          // Ignore cause extraction errors
        }
        
        console.error('❌ Extracted error message:', errorMsg);
        console.error('❌ Error short message:', errorShortMessage || 'none');
        console.error('❌ Error code:', errorCode);
        console.error('❌ Error cause:', errorCause);
        
        setHasJoinedQueue(false);
        setTxStartTime(null);
        
        // Determine user-friendly error message
        if (errorMsg.includes('rejected') || errorMsg.includes('Rejected') || errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('ACTION_REJECTED') || errorCode === 4001) {
          errorMessage = 'Transaction was rejected. Please check your wallet and approve the transaction when the popup appears.';
        } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient') || errorMsg.includes('insufficient balance')) {
          errorMessage = 'Insufficient funds. Please add more ETH to your wallet.';
        } else if (errorMsg.includes('denied') || errorMsg.includes('Denied')) {
          errorMessage = 'Transaction was denied. Please approve in your wallet.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
          errorMessage = 'Transaction timeout. Please try again.';
        } else if (errorMsg.includes('BigInt') || errorMsg.includes('serialize')) {
          // This is an internal error, not a user-facing error
          errorMessage = 'Transaction failed. Please try again. If the problem persists, refresh the page.';
          console.error('❌ Internal error (BigInt serialization) - this should not be shown to user');
        } else if (errorMsg && errorMsg !== 'Unknown error (could not extract message)') {
          errorMessage = errorMsg;
        } else {
          errorMessage = 'Transaction failed. Please check your wallet connection and try again.';
        }
        
        console.error('❌ Final error message for user:', errorMessage);
        setTxError(errorMessage);
      }
    };
    
    // Wait a bit for simulation to complete if available
    // This helps with gas estimation but don't wait too long
    // CRITICAL: If simulation status is 'error', send transaction immediately (fallback mode)
    if (simulateStatus === 'error') {
      // Simulation failed - send transaction immediately with fallback (wallet will estimate gas)
      console.log('⚠️ Simulation error detected in useEffect, sending transaction immediately (fallback mode)');
      const timeoutId = setTimeout(sendTransaction, 100);
      return () => clearTimeout(timeoutId);
    } else if (simulateData && (simulateData as any).request) {
      // Simulation ready, send immediately
      console.log('✅ Simulation data available, sending transaction with gas estimation');
      const timeoutId = setTimeout(sendTransaction, 200);
      return () => clearTimeout(timeoutId);
    } else if (simulateStatus === 'pending') {
      // Simulation still pending - wait a bit more
      console.log('⏳ Simulation pending, waiting up to 3 seconds...');
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Simulation timeout after 3 seconds, sending transaction anyway (fallback mode)');
        sendTransaction();
      }, 3000); // Wait 3 seconds max
      return () => clearTimeout(timeoutId);
    } else {
      // No simulation data and not pending - send immediately (fallback mode)
      console.log('⚠️ No simulation data, sending transaction immediately (fallback mode)');
      const timeoutId = setTimeout(sendTransaction, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, writeContract, betAmount, betLevel, hasJoinedQueue, address, simulateData, simulateStatus, simulateError, chainId, connectorClient, resetWriteContract, currentGame, refetchGame]);

  // Read queue count for this bet level - Optimized polling interval
  // CRITICAL FIX: Contract expects betLevel, not betAmount!
  const { data: queueCount, refetch: refetchQueueCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWaitingPlayersCount',
    args: [BigInt(betLevel)], // ✅ FIX: Use betLevel instead of betAmount
    query: {
      enabled: isConnected && !!address && !!betLevel && (hasJoinedQueue || isMatching), // Enable when matching too
      refetchInterval: 4000, // Refetch every 4 seconds (optimized - less aggressive)
      staleTime: 2000, // Consider data fresh for 2 seconds
    },
  });

  // Memoize callbacks to prevent unnecessary re-renders
  const handleMatchFound = useCallback((gameId: string, p1?: string, p2?: string) => {
    setIsMatching(false);
    setHasJoinedQueue(true);
    onMatchFound(gameId, p1, p2);
  }, [onMatchFound]);

  // Memoize betLevel to prevent unnecessary recalculations
  const memoizedBetLevel = useMemo(() => betLevel, [betLevel]);

  // Poll game status as fallback if event doesn't fire - OPTIMIZED
  // This handles cases where event listener might miss the event
  // Also handles cases where user is already in queue (E5 error)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    // Start polling if:
    // 1. User is connected and has joined queue, OR
    // 2. User is in matching state (waiting for match)
    if (!isConnected || !address) {
      // Cleanup if disconnected
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    
    // Check if we should start polling
    const shouldPoll = hasJoinedQueue || isMatching;
    if (!shouldPoll) {
      // Cleanup if not polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pollCountRef.current = 0;
      return;
    }
    
    // Reset poll count when starting new polling session
    if (!pollingRef.current) {
      pollCountRef.current = 0;
    }
    
    const maxPolls = 60; // Poll for 180 seconds (60 * 3 seconds) - optimized
    
    // Poll every 3 seconds (optimized - less aggressive)
    if (!pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        pollCountRef.current++;
        
        // Only log every 5th poll to reduce console spam
        if (pollCountRef.current % 5 === 0) {
          console.log(`[Matchmaking] 🔄 Polling (${pollCountRef.current}/${maxPolls})...`);
        }
        
        try {
          // Refetch game status (queue count is handled by useReadContract)
          const gameData = await refetchGame();
          
          if (gameData?.data) {
            const game = gameData.data;
            const gameStatus = game.status;
            const hasPlayer2 = game.player2 && game.player2 !== '0x0000000000000000000000000000000000000000';
            
            // Status 2 = InProgress (matched and game started)
            // Status 1 = Matched (if contract uses this)
            // Status 0 = Waiting (still in queue)
            if (gameStatus === 2 || (gameStatus === 1 && hasPlayer2)) {
              console.log('[Matchmaking] ✅ Match found via polling!');
              
              // Cleanup
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              
              // Generate gameId from player addresses
              const gameId = game.player1 && game.player2 
                ? `game-${game.player1.toLowerCase()}-${game.player2.toLowerCase()}-${Date.now()}`
                : hash || `game-${Date.now()}`;
              
              handleMatchFound(gameId, game.player1, game.player2);
              return;
            }
          }
          
          // Stop polling after max attempts
          if (pollCountRef.current >= maxPolls) {
            console.warn('[Matchmaking] ⚠️ Polling timeout - no match found after 180 seconds');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (error) {
          // Only log errors, don't spam console
          if (pollCountRef.current % 10 === 0) {
            console.error('[Matchmaking] ❌ Error polling game status:', error);
          }
        }
      }, 3000); // Poll every 3 seconds (optimized)
    }
    
    // Stop polling after 180 seconds
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        console.log('[Matchmaking] ⏰ Polling timeout reached (180 seconds)');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        timeoutRef.current = null;
      }, 180000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pollCountRef.current = 0;
    };
  }, [isConnected, hasJoinedQueue, isMatching, address, refetchGame, handleMatchFound, hash]);

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

      <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-8">
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
          
          {(isConfirming && !isPending && txHash && !isSuccess) && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-yellow-500/40 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
                <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                  Confirming transaction...
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
                Waiting for blockchain confirmation...
              </p>
            </div>
          )}
          
          {(isSuccess && txHash) && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-green-500/40 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.4)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,1)]">
                  <span className="text-green-900 font-black text-lg">✓</span>
                </div>
                <p className="text-green-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                  Transaction confirmed!
                </p>
              </div>
              <div className="mt-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-200 font-mono text-xs underline"
                >
                  View on BaseScan
                </a>
              </div>
              {isMatching && (
                <p className="text-gray-400 font-mono text-xs text-center mt-2">
                  Searching for opponent...
                </p>
              )}
            </div>
          )}
          
          {(writeError || txError) && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <p className="text-red-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm text-center">
                {txError || writeError?.message || 'Transaction failed'}
              </p>
              {(txError?.includes('rejected') || writeError?.message?.includes('rejected')) && (
                <div className="mt-2 text-center space-y-3">
                  <p className="text-gray-400 font-mono text-xs mb-2">
                    Transaction was rejected. Please:
                  </p>
                  <ul className="text-gray-400 font-mono text-xs text-left space-y-1 mb-3 max-w-md mx-auto">
                    <li>1. ✓ Check your wallet popup is open</li>
                    <li>2. ✓ Make sure you are on Base Sepolia network</li>
                    <li>3. ✓ Approve the transaction in your wallet</li>
                    <li>4. ✓ Ensure you have enough ETH for gas fees</li>
                  </ul>
                  <button
                    onClick={() => {
                      setHasJoinedQueue(false);
                      setTxError(null);
                      resetWriteContract?.(); // Reset writeContract state
                      // Component will automatically retry via useEffect
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

// Memoize component to prevent unnecessary re-renders
export const Matchmaking = React.memo(MatchmakingComponent);

