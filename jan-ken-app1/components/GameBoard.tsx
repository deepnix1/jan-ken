'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt, useSimulateContract, useConnectorClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { isValidChoice, isValidBetAmount } from '@/lib/security';

interface GameBoardProps {
  betAmount: bigint;
  gameId: string;
  onGameEnd: () => void;
}

const CHOICES = [
  { id: 1, name: 'Rock', image: '/rock.png', fallback: '🪨' },
  { id: 2, name: 'Paper', image: '/paper.png', fallback: '📄' },
  { id: 3, name: 'Scissors', image: '/scissors.png', fallback: '✂️' },
];

export function GameBoard({ betAmount: _betAmount, gameId: _gameId, onGameEnd }: GameBoardProps) {
  const { address } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20); // Changed from 40 to 20 seconds
  const [gameFinished, setGameFinished] = useState(false);
  const [player1Profile, setPlayer1Profile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { data: hash, writeContract, isPending, error: writeError, reset: resetWriteContract, status } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        console.log('[GameBoard] ✅✅✅ TRANSACTION HASH RECEIVED IN onSuccess! ✅✅✅', hash);
        setTxStartTime(null);
        setTxError(null); // Clear any previous errors
      },
      onError: (error: any) => {
        console.error('[GameBoard] ❌❌❌ TRANSACTION ERROR IN onError! ❌❌❌', error);
        
        // CRITICAL: Check if error is "User rejected" - this might be a false positive
        const errorMessage = error?.message || String(error);
        const isRejected = errorMessage.includes('rejected') || errorMessage.includes('Rejected') || errorMessage.includes('User rejected');
        
        if (isRejected) {
          console.warn('[GameBoard] ⚠️ User rejected transaction - but checking if wallet popup actually appeared...');
          // Don't immediately reset - wait a bit to see if it's a timing issue
          setTimeout(() => {
            if (!hash && !isPending) {
              console.error('[GameBoard] ❌ Confirmed: Transaction was rejected by user');
              setSelectedChoice(null);
              setTxStartTime(null);
              setTxError('Transaction was rejected. Please try again and make sure to approve in your wallet.');
            }
          }, 1000);
        } else {
          // Other errors - reset immediately
          setSelectedChoice(null);
          setTxStartTime(null);
          setTxError(errorMessage);
        }
      },
      onSettled: (data, error) => {
        console.log('[GameBoard] 📊 Transaction settled:', { 
          hash: data || 'none', 
          error: error?.message || 'none',
          hasError: !!error,
        });
      },
    },
  });
  const [txStartTime, setTxStartTime] = useState<number | null>(null);
  
  // Debug logging for connector client - ENHANCED VISIBILITY
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [GameBoard] DEBUG INFO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Connector client available:', !!connectorClient);
    console.log('✅ writeContract available:', typeof writeContract === 'function');
    console.log('✅ Address:', address);
    console.log('✅ Component mounted at:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');
  }, [connectorClient, writeContract, address]);
  
  // Simulate contract call to get gas estimates
  // Enable simulation when choice is selected (before transaction is sent)
  const { data: simulateData } = useSimulateContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'makeChoice',
    args: selectedChoice ? [selectedChoice] : undefined,
    query: {
      enabled: !!selectedChoice && !isPending && !hash,
      // Don't wait for simulation - it's optional
    },
  });
  
  const { isLoading: isConfirming, isSuccess: isTxSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash,
    timeout: 120000, // 120 second timeout (increased for slow networks)
    confirmations: 1,
    query: {
      retry: 5, // More retries
      retryDelay: 2000, // Longer delay between retries
      enabled: !!hash, // Only wait if we have hash
    },
  });
  
  // Monitor status changes and hash - ENHANCED LOGGING
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 [GameBoard] Transaction Status Update');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Status:', status);
    console.log('isPending:', isPending);
    console.log('Hash:', hash || 'NOT RECEIVED YET');
    console.log('Has Error:', !!writeError);
    console.log('Error Message:', writeError?.message || 'none');
    console.log('Selected Choice:', selectedChoice);
    console.log('Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');

    // CRITICAL: If hash received, log it prominently
    if (hash) {
      console.log('🎉🎉🎉 TRANSACTION HASH RECEIVED! 🎉🎉🎉', hash);
      setTxStartTime(null);
    }

    // If status is 'success' but no hash yet, wait a bit
    if (status === 'success' && !hash) {
      console.log('⚠️ Status is success but hash not received yet, waiting...');
    }

    // If status is 'error', handle it
    if (status === 'error' && !writeError && selectedChoice) {
      console.error('❌ Transaction status is error but no writeError');
      setSelectedChoice(null);
      setTxStartTime(null);
      alert('Transaction failed. Please try again.');
    }
  }, [status, isPending, hash, writeError, selectedChoice]);

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
      
      // After 60 seconds, reset and show error
      if (elapsed > 60000) {
        console.error('❌ Transaction timeout - no hash received after 60 seconds');
        setSelectedChoice(null);
        alert('Transaction timeout. Please check your wallet and try again.');
        resetWriteContract?.();
      }
    }
  }, [isPending, hash, txStartTime, status, writeError, resetWriteContract]);

  // Handle writeError for makeChoice
  useEffect(() => {
    if (writeError && selectedChoice) {
      console.error('Error making choice:', writeError);
      // Reset selection on error
      setSelectedChoice(null);
      setTxStartTime(null);
      
      // Show user-friendly error
      // Type assertion needed because shortMessage is not in the type definition
      const errorMsg = (writeError?.message) || ((writeError as any)?.shortMessage) || String(writeError);
      if (errorMsg.includes('rejected') || errorMsg.includes('Rejected') || errorMsg.includes('User rejected')) {
        alert('Transaction was rejected. Please approve in your wallet and try again.');
      } else {
        alert(`Transaction failed: ${errorMsg}`);
      }
    }
  }, [writeError, selectedChoice]);
  
  // Handle successful transaction
  const [showApproved, setShowApproved] = useState(false);
  
  useEffect(() => {
    if (isTxSuccess && hash && selectedChoice) {
      console.log('Transaction confirmed:', hash);
      setShowApproved(true);
      setTxStartTime(null);
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShowApproved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, hash, selectedChoice]);

  // Store hash when received
  useEffect(() => {
    if (hash && selectedChoice) {
      console.log('✅ Transaction hash received:', hash);
      setTxStartTime(null);
    }
  }, [hash, selectedChoice]);
  const { data: gameData, isLoading: isLoadingGame } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getMyGame',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: (data) => {
        // Stop polling if game is finished
        if (data && Array.isArray(data) && data.length > 0) {
          const status = data[5];
          if (status === 3 || status === 4) return false; // Finished or Cancelled
        }
        return 2000; // Poll every 2 seconds
      },
    },
  });

  useEffect(() => {
    if (timeLeft <= 0) {
      // Süre doldu
      if (!gameFinished) {
        setGameFinished(true);
        setTimeout(() => onGameEnd(), 2000);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameFinished, onGameEnd]);

  const handleChoice = async (choiceId: number) => {
    // Security: Input validation
    if (!isValidChoice(choiceId)) {
      console.error('[GameBoard] ❌ Invalid choice:', choiceId);
      return;
    }
    
    if (selectedChoice || !address) {
      console.warn('[GameBoard] ⚠️ Cannot make choice - already selected or no address');
      return;
    }

    // Check connector client before proceeding
    if (!connectorClient) {
      console.error('[GameBoard] ❌ Connector client not available');
      setTxError('Wallet connection issue. Please refresh the page or reconnect your wallet.');
      alert('Wallet connection issue. Please refresh the page.');
      return;
    }

    // Check if writeContract is available
    if (typeof writeContract !== 'function') {
      console.error('[GameBoard] ❌ writeContract is not a function');
      setTxError('Transaction function not available. Please refresh the page.');
      alert('Transaction function not available. Please refresh the page.');
      return;
    }

    // Security: Validate address format
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      console.error('[GameBoard] ❌ Invalid wallet address');
      setTxError('Invalid wallet address.');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎮 [GameBoard] MAKING CHOICE - TRANSACTION START');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All checks passed, preparing transaction...');
    console.log('📋 Choice ID:', choiceId);
    console.log('🔌 Connector client:', !!connectorClient);
    console.log('📝 writeContract type:', typeof writeContract);
    console.log('👤 Connector client account:', connectorClient?.account?.address);
    console.log('⛓️ Connector client chain:', connectorClient?.chain?.id);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');

    setSelectedChoice(choiceId);
    setTxStartTime(Date.now());
    setTxError(null);
    
    try {
      // Prepare transaction parameters
      const txParams = {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'makeChoice' as const,
        args: [choiceId] as const,
      };
      
      console.log('📤 [GameBoard] Transaction parameters:', {
        address: txParams.address,
        functionName: txParams.functionName,
        args: txParams.args,
      });
      
      // CRITICAL: Use simulateData.request if available (includes gas estimation)
      // Otherwise use direct params
      let finalParams: any;
      if (simulateData && (simulateData as any).request) {
        console.log('📤 [GameBoard] Using simulateData.request (includes gas estimation)');
        finalParams = (simulateData as any).request;
      } else {
        console.log('📤 [GameBoard] Using direct params (wallet will estimate gas)');
        finalParams = txParams;
      }
      
      // CRITICAL: Try to get Farcaster wallet provider directly
      // This ensures the wallet popup appears in Farcaster Mini App
      let farcasterProvider: any = null;
      if (sdk && sdk.wallet) {
        try {
          farcasterProvider = await sdk.wallet.getEthereumProvider();
          console.log('[GameBoard] ✅ Farcaster wallet provider obtained:', !!farcasterProvider);
          if (farcasterProvider) {
            const chainId = await farcasterProvider.request({ method: 'eth_chainId' });
            console.log('[GameBoard] 📱 Provider chainId:', chainId);
            
            // CRITICAL: Verify we're on the correct chain
            const expectedChainId = '0x14a34'; // Base Sepolia (84532 in decimal)
            if (chainId !== expectedChainId) {
              console.error('[GameBoard] ❌ Wrong chain! Expected:', expectedChainId, 'Got:', chainId);
              setTxError(`Wrong network. Please switch to Base Sepolia (Chain ID: 84532)`);
              setSelectedChoice(null);
              setTxStartTime(null);
              return;
            }
          }
        } catch (err) {
          console.warn('[GameBoard] ⚠️ Could not get Farcaster provider:', err);
        }
      }
      
      // CRITICAL: Verify connector client is ready and has correct account
      if (!connectorClient || !connectorClient.account) {
        console.error('[GameBoard] ❌ Connector client not ready:', {
          hasConnectorClient: !!connectorClient,
          hasAccount: !!connectorClient?.account,
        });
        setTxError('Wallet not ready. Please reconnect your wallet.');
        setSelectedChoice(null);
        setTxStartTime(null);
        return;
      }
      
      // CRITICAL: Verify account matches address
      if (connectorClient.account.address.toLowerCase() !== address?.toLowerCase()) {
        console.error('[GameBoard] ❌ Account mismatch:', {
          connectorAccount: connectorClient.account.address,
          currentAddress: address,
        });
        setTxError('Account mismatch. Please reconnect your wallet.');
        setSelectedChoice(null);
        setTxStartTime(null);
        return;
      }
      
      // CRITICAL: Force wallet popup by ensuring we're not in a pending state
      // Reset any previous transaction state
      if (isPending) {
        console.warn('[GameBoard] ⚠️ Previous transaction still pending, resetting...');
        resetWriteContract?.();
        // Wait a bit for reset to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 [GameBoard] CALLING writeContract NOW!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📤 Final params:', {
        address: finalParams.address || txParams.address,
        functionName: finalParams.functionName || txParams.functionName,
        args: finalParams.args ? finalParams.args.map((a: any) => a.toString()) : txParams.args,
      });
      console.log('🔌 Connector client ready:', !!connectorClient);
      console.log('📱 Farcaster provider ready:', !!farcasterProvider);
      console.log('⏰ Calling at:', new Date().toISOString());
      console.log('═══════════════════════════════════════════════════════════');
      
      // CRITICAL: Call writeContract - this MUST trigger wallet popup
      // In Wagmi v3, writeContract returns void but triggers the mutation
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 [GameBoard] CALLING writeContract NOW!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Final params:', JSON.stringify({
        address: finalParams.address || txParams.address,
        functionName: finalParams.functionName || txParams.functionName,
        args: finalParams.args ? finalParams.args.map((a: any) => a.toString()) : txParams.args,
      }, null, 2));
      console.log('Connector client ready:', !!connectorClient);
      console.log('Farcaster provider ready:', !!farcasterProvider);
      console.log('Timestamp:', new Date().toISOString());
      console.log('═══════════════════════════════════════════════════════════');
      
      // CRITICAL: Call writeContract - this MUST trigger wallet popup
      console.log('[GameBoard] 🚀 About to call writeContract with params:', JSON.stringify({
        address: finalParams.address || txParams.address,
        functionName: finalParams.functionName || txParams.functionName,
        args: finalParams.args ? finalParams.args.map((a: any) => a.toString()) : txParams.args,
      }, null, 2));
      
      // CRITICAL: Verify writeContract is actually a function before calling
      if (typeof writeContract !== 'function') {
        const error = new Error('writeContract is not a function');
        console.error('[GameBoard] ❌❌❌ CRITICAL: writeContract is not a function!', {
          type: typeof writeContract,
          value: writeContract,
        });
        throw error;
      }
      
      try {
        // CRITICAL: Call writeContract - it should trigger the mutation
        // In Wagmi v3, writeContract is a mutation trigger function
        // If this call succeeds (no exception), the transaction has been initiated
        // Status updates will happen asynchronously via hooks and callbacks
        writeContract(finalParams);
        console.log('✅ [GameBoard] writeContract CALLED! (no error thrown)');
        console.log('📊 Transaction initiated - status will update via hooks');
        console.log('⏰ Called at:', new Date().toISOString());
        console.log('💡 Note: Status updates happen asynchronously - onSuccess/onError callbacks will handle results');
        
        // CRITICAL: Don't check status immediately - Wagmi updates state asynchronously
        // The onSuccess/onError callbacks will handle success/failure
        // If writeContract() didn't throw, the transaction was initiated successfully
        // The wallet popup may take time to appear, and status may take time to update
      } catch (writeError: any) {
        console.error('❌ [GameBoard] ERROR calling writeContract:', writeError);
        console.error('[GameBoard] Error details:', {
          message: writeError?.message,
          name: writeError?.name,
          code: (writeError as any)?.code,
          shortMessage: (writeError as any)?.shortMessage,
        });
        throw writeError;
      }
    } catch (error: any) {
      console.error('[GameBoard] ❌ Error making choice:', error);
      console.error('[GameBoard] Error details:', {
        message: error?.message,
        name: error?.name,
        code: (error as any)?.code,
        shortMessage: (error as any)?.shortMessage,
      });
      
      // Reset selection on error
      setSelectedChoice(null);
      setTxStartTime(null);
      
      // Extract error message
      let errorMessage = 'Transaction failed. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if ((error as any)?.shortMessage) {
        errorMessage = (error as any).shortMessage;
      }
      
      setTxError(errorMessage);
      
      if (error?.message?.includes('rejected') || error?.message?.includes('Rejected')) {
        alert('Transaction was rejected. Please approve in your wallet and try again.');
      } else {
        alert(`Transaction error: ${errorMessage}`);
      }
    }
  };

  // Check game status from contract - PRODUCTION MODE
  useEffect(() => {
    if (!address || !gameData) return;
    
    if (Array.isArray(gameData) && gameData.length > 0) {
      const status = gameData[5]; // status field (GameStatus enum: 0=Waiting, 1=Matched, 2=InProgress, 3=Finished, 4=Cancelled)
      const player1Choice = gameData[3]; // Choice enum: 0=None, 1=Rock, 2=Paper, 3=Scissors
      const player2Choice = gameData[4];
      
      console.log('[GameBoard] 📊 Game status check:', JSON.stringify({
        status,
        player1Choice,
        player2Choice,
        gameFinished,
        hasHash: !!hash,
        isTxSuccess,
      }, null, 2));
      
      // CRITICAL: If game is finished (status === 3), go to results
      if (status === 3) {
        console.log('[GameBoard] ✅✅✅ Game finished (status 3) - calling onGameEnd');
        if (!gameFinished) {
          setGameFinished(true);
          setTimeout(() => {
            console.log('[GameBoard] 🎯 Calling onGameEnd callback');
            onGameEnd();
          }, 2000);
        }
      } 
      // CRITICAL: If both players made choices and game is in progress, wait for contract to finish
      // Don't call onGameEnd yet - wait for status to become 3
      else if (status === 2 && player1Choice > 0 && player2Choice > 0) {
        console.log('[GameBoard] ⏳ Both players made choices, waiting for contract to finish...');
        // Don't set gameFinished yet - wait for status === 3
      }
      // CRITICAL: If game is cancelled (status === 4), go to results
      else if (status === 4) {
        console.log('[GameBoard] ⚠️ Game cancelled (status 4) - calling onGameEnd');
        if (!gameFinished) {
          setGameFinished(true);
          setTimeout(() => {
            console.log('[GameBoard] 🎯 Calling onGameEnd callback (cancelled)');
            onGameEnd();
          }, 2000);
        }
      }
    }
  }, [gameData, address, onGameEnd, gameFinished, hash, isTxSuccess]);

  return (
    <div className="w-full">
      {/* Japanese Gaming Header - Mobile Responsive */}
      <div className="text-center mb-8 sm:mb-12 md:mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 md:mb-8">
          <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
            GAME STARTED
          </span>
        </h2>
        
        {/* Japanese Gaming Timer */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
          <div className={`relative inline-flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full bg-black/60 border-3 sm:border-4 ${
            timeLeft > 20 ? 'border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.6)]' :
            timeLeft > 10 ? 'border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.6)]' :
            'border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.6)]'
          }`}>
            <div className={`text-5xl sm:text-6xl md:text-7xl font-black font-mono ${
              timeLeft > 20 ? 'text-blue-400' :
              timeLeft > 10 ? 'text-yellow-400' :
              'text-red-400'
            } drop-shadow-[0_0_30px_currentColor] transition-all duration-300`}>
              {timeLeft}
            </div>
          </div>
        </div>
        
        <p className="text-gray-300 text-base sm:text-xl md:text-2xl font-mono font-bold uppercase tracking-wider px-4">
          {selectedChoice 
            ? '✓ Choice Locked - Waiting...' 
            : '⚡ Make Your Move!'}
        </p>
      </div>

      {/* Gaming Choices - Horizontal Layout, Smaller Size */}
      <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
        {CHOICES.map((choice, index) => {
          const isSelected = selectedChoice === choice.id;
          const isDisabled = selectedChoice !== null || gameFinished;
          
          // New design colors: Red, Blue, Yellow-Orange with neon glow
          const colorConfigs = [
            {
              gradient: 'from-red-900/80 to-red-700/80',
              border: 'border-red-500',
              text: 'text-red-400',
              shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.8)]',
              glow: 'bg-red-500/30',
            },
            {
              gradient: 'from-blue-900/80 to-blue-700/80',
              border: 'border-blue-500',
              text: 'text-blue-400',
              shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.8)]',
              glow: 'bg-blue-500/30',
            },
            {
              gradient: 'from-orange-900/80 to-yellow-700/80',
              border: 'border-yellow-500',
              text: 'text-yellow-400',
              shadow: 'shadow-[0_0_40px_rgba(234,179,8,0.8)]',
              glow: 'bg-yellow-500/30',
            },
          ];
          
          const config = colorConfigs[index];
          
          return (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={isDisabled}
              className={`group relative overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-300 transform ${
                isSelected
                  ? `scale-110 ${config.shadow} border-3 ${config.border}`
                  : isDisabled
                  ? 'opacity-30 cursor-not-allowed'
                  : `hover:scale-105 hover:${config.shadow} cursor-pointer border-3 ${config.border}`
              } bg-gradient-to-b ${config.gradient} backdrop-blur-sm w-[100px] sm:w-[120px] md:w-[140px] flex-shrink-0`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Neon Corner Brackets */}
              <div className={`absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 ${config.border} ${config.shadow}`}></div>
              <div className={`absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 ${config.border} ${config.shadow}`}></div>
              <div className={`absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 ${config.border} ${config.shadow}`}></div>
              <div className={`absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 ${config.border} ${config.shadow}`}></div>
              
              {/* Selected Checkmark */}
              {isSelected && (
                <div className={`absolute top-3 right-3 w-10 h-10 ${config.glow} rounded-full flex items-center justify-center ${config.shadow} z-20`}>
                  <span className="text-white text-2xl font-black">✓</span>
                </div>
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                {/* User's Custom Images - Smaller Size */}
                <div className={`mb-2 sm:mb-3 transform transition-all duration-300 relative flex items-center justify-center w-full h-[80px] sm:h-[100px] md:h-[120px] ${
                  isSelected 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                }`}>
                  {/* Strong Glow Background */}
                  <div className={`absolute inset-0 rounded-full blur-3xl opacity-70 ${config.glow}`}></div>
                  
                  {/* Image Container - Maximum Contrast */}
                  <div className="relative w-full h-full z-10 flex items-center justify-center">
                    <Image
                      src={choice.image}
                      alt={choice.name}
                      fill
                      className="object-contain"
                      style={{
                        filter: isSelected 
                          ? 'brightness(1.4) contrast(1.5) saturate(1.3) drop-shadow(0 0 30px rgba(255,255,255,0.5))' 
                          : 'brightness(1.3) contrast(1.4) saturate(1.2) drop-shadow(0 0 20px rgba(255,255,255,0.3))',
                        imageRendering: 'crisp-edges',
                      }}
                      unoptimized
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'text-9xl flex items-center justify-center w-full h-full';
                          fallback.textContent = choice.fallback;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Outer Neon Glow Ring */}
                  {isSelected && (
                    <div className={`absolute inset-0 rounded-full border-4 ${config.border} animate-pulse ${config.shadow}`} style={{ opacity: 0.8 }}></div>
                  )}
                </div>
                
                {/* Text with Neon Glow - ULTRA SMALL to prevent ANY overflow */}
                <div className={`text-xs sm:text-sm md:text-base font-black font-mono uppercase tracking-tight ${config.text} ${config.shadow} ${
                  isSelected ? 'scale-105' : ''
                } transition-all duration-300 text-center break-all px-1 leading-tight`} style={{ maxWidth: '100%', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {choice.name}
                </div>
              </div>
              
              {/* Pulse effect when selected */}
              {isSelected && (
                <div className={`absolute inset-0 ${config.glow} rounded-2xl animate-ping opacity-30`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Transaction Approved Notification - Enhanced */}
      {/* CRITICAL: Hide notification when wallet popup is open (status === 'pending' OR isPending) to allow clicking Confirm button */}
      {/* PC Farcaster wallet: isPending might be true even if status is not 'pending' yet */}
      {showApproved && status !== 'pending' && !isPending && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in" style={{ pointerEvents: 'none' }}>
          <div className="relative bg-black/95 backdrop-blur-lg px-8 py-6 rounded-xl shadow-[0_0_60px_rgba(34,197,94,1)] border-3 border-green-500 min-w-[350px]">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-xl"></div>
            <div className="relative flex flex-col items-center gap-3">
              <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(34,197,94,1)]">✅</div>
              <div className="text-center">
                <h3 className="text-2xl font-black mb-2 bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
                  TRANSACTION CONFIRMED!
                </h3>
                <p className="text-green-300 font-mono font-bold uppercase tracking-wider text-sm mb-2">
                  Your choice has been submitted
                </p>
                {hash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 font-mono text-xs underline bg-green-500/20 px-3 py-1 rounded inline-block mt-2"
                  >
                    🔗 View Transaction
                  </a>
                )}
              </div>
            </div>
            {/* Corner accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-green-400"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-green-400"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-green-400"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-green-400"></div>
            {/* Pulse effect */}
            <div className="absolute inset-0 border-2 border-green-400 rounded-xl animate-ping opacity-20"></div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {/* CRITICAL: Hide error when wallet popup is open (status === 'pending' OR isPending) to allow clicking Confirm button */}
      {/* PC Farcaster wallet: isPending might be true even if status is not 'pending' yet */}
      {(txError || writeError) && status !== 'pending' && !isPending && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down" style={{ pointerEvents: 'auto' }}>
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-black/95 backdrop-blur-lg border-3 border-red-500 rounded-xl shadow-[0_0_60px_rgba(239,68,68,0.8)] min-w-[300px] max-w-[90vw]">
            <div className="flex items-center gap-4">
              <div className="text-4xl">❌</div>
              <div className="flex flex-col">
                <p className="text-red-400 font-black text-lg uppercase tracking-wider">
                  Transaction Error
                </p>
                <p className="text-red-300 font-mono text-sm mt-1 break-words">
                  {txError || writeError?.message || (writeError as any)?.shortMessage || 'Unknown error'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setTxError(null);
                setSelectedChoice(null);
                resetWriteContract?.();
              }}
              className="px-6 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 font-mono text-sm hover:bg-red-500/30 transition-colors font-bold uppercase tracking-wider mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Transaction Status - Enhanced Visibility */}
      {/* CRITICAL: Hide our notification when wallet popup is open (isPending) to allow clicking Confirm button */}
      {/* PC Farcaster wallet: When isPending is true, wallet popup is open - hide our notification completely */}
      {/* Only show when transaction is confirming (hash received) but wallet popup is closed */}
      {(isConfirming && hash) && !isPending && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in-down" style={{ pointerEvents: 'none' }}>
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-black/95 backdrop-blur-lg border-3 border-red-500 rounded-xl shadow-[0_0_60px_rgba(220,20,60,0.8)] min-w-[300px]">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-3 border-red-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(220,20,60,1)]"></div>
              <div className="flex flex-col">
                <p className="text-red-400 font-black text-lg uppercase tracking-wider">
                  ✅ Confirming...
                </p>
                {hash && (
                  <p className="text-green-400 font-mono text-sm mt-1">
                    Transaction sent! Waiting for confirmation...
                  </p>
                )}
              </div>
            </div>
            {txStartTime && !hash && (
              <p className="text-gray-400 font-mono text-xs text-center">
                Waiting {Math.floor((Date.now() - txStartTime) / 1000)}s...
              </p>
            )}
            {hash && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <a
                  href={`https://sepolia.basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-300 hover:text-red-200 font-mono text-xs underline bg-red-500/20 px-3 py-1 rounded"
                >
                  🔗 View on BaseScan
                </a>
                <p className="text-gray-500 font-mono text-xs">
                  Hash: {hash.slice(0, 10)}...{hash.slice(-8)}
                </p>
              </div>
            )}
            {/* Corner accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-400"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-400"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-red-400"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-400"></div>
          </div>
        </div>
      )}
      
      {isReceiptError && (
        <div className="text-center py-6">
          <div className="inline-flex flex-col items-center gap-3 px-8 py-4 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <p className="text-red-400 font-mono font-bold uppercase tracking-wider text-sm">
              Transaction confirmation timeout
            </p>
            {hash && (
              <a
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-300 hover:text-red-200 font-mono text-xs underline"
              >
                Check transaction on BaseScan
              </a>
            )}
            <p className="text-gray-400 font-mono text-xs text-center mt-2">
              Transaction may still be processing. Check BaseScan for status.
            </p>
          </div>
        </div>
      )}

      {writeError && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <p className="text-red-400 font-mono font-bold uppercase tracking-wider text-sm">
              Error: {writeError.message || 'Transaction failed'}
            </p>
          </div>
        </div>
      )}

      {isLoadingGame && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-black/60 border-2 border-yellow-500/40 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]">
            <div className="w-6 h-6 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
            <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider">
              Loading game data...
            </p>
          </div>
        </div>
      )}

      {gameFinished && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-black/60 border-2 border-green-500/40 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <div className="text-3xl">🎉</div>
            <p className="text-green-400 font-mono font-black text-xl uppercase tracking-wider">
              Game Finished - Calculating...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

