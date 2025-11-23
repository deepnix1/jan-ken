'use client';

import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useWatchContractEvent, useSimulateContract, useChainId, useConnectorClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { isValidBetAmount, isValidAddress } from '@/lib/security';

interface MatchmakingProps {
  betAmount: bigint;
  onMatchFound: (gameId: string) => void;
  onCancel?: () => void; // Cancel matchmaking callback
  showMatchFound?: boolean;
}

export function Matchmaking({ betAmount, onMatchFound, onCancel, showMatchFound = false }: MatchmakingProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isMatching, setIsMatching] = useState(true);
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  
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
        const variablesForLog = variables ? {
          ...variables,
          args: variables.args ? variables.args.map((arg: any) => 
            typeof arg === 'bigint' ? arg.toString() : arg
          ) : variables.args,
          value: variables.value ? (typeof variables.value === 'bigint' ? variables.value.toString() : variables.value) : variables.value,
        } : variables;
        console.log('🔄 writeContract mutation started (onMutate callback):', variablesForLog);
        console.log('This means writeContract was called and is processing...');
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
  
  // Simulate contract call before sending transaction (per Wagmi best practices)
  // This validates the transaction and provides gas estimation
  const { data: simulateData, error: simulateError, status: simulateStatus } = useSimulateContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'joinQueue',
    args: [betAmount],
    value: betAmount,
    query: {
      enabled: isConnected && !!address && !!betAmount && !hasJoinedQueue && !!connectorClient,
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
  
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('Transaction confirmed:', hash);
      setShowApproved(true);
      
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShowApproved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash]);
  
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
      console.error('Error details:', {
        message: writeError?.message,
        shortMessage: (writeError as any)?.shortMessage,
        cause: (writeError as any)?.cause,
        name: writeError?.name,
        stack: writeError?.stack,
        code: (writeError as any)?.code,
        data: (writeError as any)?.data,
        fullError: JSON.stringify(writeError, Object.getOwnPropertyNames(writeError), 2),
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
  }, [writeError, resetWriteContract, betAmount, address, chainId, isConnected]);
  
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
        console.log('Simulate data:', simulateData);
        console.log('Simulate error:', simulateError);
        
        // CRITICAL: Wait for simulation to complete before sending transaction
        // Per Wagmi best practices, we should use simulateData.request for gas estimation
        if (simulateStatus === 'pending') {
          console.warn('⚠️ Simulation is still pending, waiting for it to complete...');
          console.warn('⚠️ This might take a few seconds. The useEffect will retry when simulation completes.');
          return; // Wait for simulation to complete - useEffect will retry when simulateStatus changes
        }
        
        if (simulateStatus === 'error') {
          // Log detailed error information (avoid BigInt serialization)
          console.error('❌ Simulation error detected');
          console.error('Simulate status:', simulateStatus);
          console.error('Error type:', typeof simulateError);
          console.error('Error constructor:', simulateError?.constructor?.name);
          console.error('Error name:', simulateError?.name);
          
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
          
          // Only block if it's a critical error (insufficient funds)
          if (errorMsg.includes('insufficient funds') || 
              errorMsg.includes('Insufficient') ||
              errorMsg.includes('insufficient balance')) {
            console.error('❌ Simulation error: Insufficient funds - BLOCKING transaction');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            setTxError('Insufficient funds. Please add more ETH to your wallet.');
            return;
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
        if (!simulateData && simulateStatus !== 'error') {
          console.warn('⚠️ Simulation data not available yet, waiting...');
          console.warn('⚠️ Simulation status:', simulateStatus);
          return; // Wait for simulation to complete
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
        const txParams = {
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'joinQueue' as const,
          args: [betAmount] as [bigint],
          value: betAmount,
        };
        
        // Send transaction with proper gas estimation
        console.log('📤 Sending transaction to contract...');
        console.log('Contract:', CONTRACT_ADDRESS);
        console.log('Function: joinQueue');
        console.log('Args:', [betAmount.toString()]);
        console.log('Value:', betAmount.toString(), 'wei =', (Number(betAmount) / 1e18).toFixed(6), 'ETH');
        console.log('From:', address);
        console.log('Chain ID:', chainId);
        console.log('writeContract function type:', typeof writeContract);
        console.log('Transaction params:', JSON.stringify({
          address: txParams.address,
          functionName: txParams.functionName,
          args: txParams.args.map(a => a.toString()),
          value: txParams.value.toString(),
        }, null, 2));
        
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
            console.log('Simulation request:', (simulateData as any).request);
            
            // Log simulation request details
            const simRequest = (simulateData as any).request;
            console.log('Simulation request details:', {
              address: simRequest.address,
              functionName: simRequest.functionName,
              args: simRequest.args?.map((a: any) => a?.toString()),
              value: simRequest.value?.toString(),
              gas: simRequest.gas?.toString(),
              gasPrice: simRequest.gasPrice?.toString(),
              maxFeePerGas: simRequest.maxFeePerGas?.toString(),
              maxPriorityFeePerGas: simRequest.maxPriorityFeePerGas?.toString(),
            });
            
            console.log('📤 Calling writeContract with simulation request...');
            writeContract(simRequest);
          } else {
            console.log('📤 Sending transaction directly (wallet will estimate gas)');
            console.log('Calling writeContract with params:', {
              address: txParams.address,
              functionName: txParams.functionName,
              args: txParams.args.map(a => a.toString()),
              value: txParams.value.toString(),
            });
            console.log('📤 Calling writeContract...');
            writeContract(txParams);
          }
          
          console.log('✅ writeContract called successfully');
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
          console.error('❌ Error calling writeContract:', err);
          console.error('Error details:', {
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
            cause: err?.cause,
          });
          setHasJoinedQueue(false);
          setTxStartTime(null);
          setTxError(`Failed to send transaction: ${err?.message || String(err)}`);
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
    if (simulateData && (simulateData as any).request) {
      // Simulation ready, send immediately
      const timeoutId = setTimeout(sendTransaction, 200);
      return () => clearTimeout(timeoutId);
    } else {
      // Wait max 1 second for simulation, then send anyway
      const timeoutId = setTimeout(sendTransaction, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, writeContract, betAmount, hasJoinedQueue, address, simulateData, simulateStatus, simulateError, chainId, connectorClient]);

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

