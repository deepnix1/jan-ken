'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getBetLevelFromAmount } from '@/lib/contract';
import { isValidBetAmount, isValidAddress } from '@/lib/security';
import { joinQueue, checkForMatch, leaveQueue, getQueueCount, MatchResult } from '@/lib/matchmakingService';
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';

interface MatchmakingProps {
  betAmount: bigint;
  onMatchFound: (gameId: string, player1Address?: string, player2Address?: string) => void;
  onCancel?: () => void;
  showMatchFound?: boolean;
}

function MatchmakingOffChainComponent({ betAmount, onMatchFound, onCancel, showMatchFound = false }: MatchmakingProps) {
  const { address, isConnected } = useAccount();
  const [isMatching, setIsMatching] = useState(true);
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [playerFid, setPlayerFid] = useState<number | null>(null);
  
  // Convert betAmount to betLevel
  const betLevel = useMemo(() => getBetLevelFromAmount(betAmount), [betAmount]);
  
  // Polling refs
  const matchCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get Farcaster FID
  useEffect(() => {
    if (address && isConnected) {
      getFarcasterProfileByAddress(address)
        .then(profile => {
          if (profile?.fid) {
            setPlayerFid(profile.fid);
          }
        })
        .catch(err => {
          console.warn('Could not get Farcaster profile:', err);
          // Continue without FID
        });
    }
  }, [address, isConnected]);
  
  if (!betLevel) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400 font-bold">Error: Invalid bet amount</p>
        <p className="text-gray-400 text-sm mt-2">Please select a valid bet level</p>
      </div>
    );
  }
  
  // Join queue when component mounts
  useEffect(() => {
    // CRITICAL: Don't join queue if bet is not selected
    if (!betAmount || betAmount === BigInt(0)) {
      console.log('[Matchmaking] ⚠️ Bet amount not selected, skipping queue join')
      setError('Please select a bet amount before joining the queue.')
      return
    }
    
    if (!isConnected || !address || hasJoinedQueue) return;
    
    // Validate bet level (must be valid)
    if (!betLevel || betLevel === 0) {
      console.log('[Matchmaking] ⚠️ Invalid bet level, skipping queue join')
      setError('Invalid bet amount. Please select a valid bet level.')
      return
    }
    
    // Validate inputs
    if (!isValidBetAmount(betAmount)) {
      console.log('[Matchmaking] ⚠️ Bet amount validation failed, skipping queue join')
      setError('Invalid bet amount. Please select a valid bet amount.')
      return;
    }
    
    if (!isValidAddress(address)) {
      setError('Invalid wallet address.');
      return;
    }
    
    const joinQueueAsync = async () => {
      try {
        console.log('[Matchmaking] 🎯 Joining queue (off-chain)...');
        console.log('[Matchmaking] Address:', address);
        console.log('[Matchmaking] FID:', playerFid);
        console.log('[Matchmaking] Bet Level:', betLevel);
        console.log('[Matchmaking] Bet Amount:', betAmount.toString());
        
        // Add a small delay to ensure Supabase client is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const queueId = await joinQueue({
          playerAddress: address,
          playerFid: playerFid,
          betLevel: betLevel,
          betAmount: betAmount,
        });
        
        console.log('[Matchmaking] ✅ Joined queue successfully. Queue ID:', queueId);
        setHasJoinedQueue(true);
        setError(null);
      } catch (err: any) {
        // Log detailed error information with proper serialization
        // CRITICAL: Serialize immediately to avoid [object Object]
        const errorDetails = {
          name: err?.name || 'Unknown',
          message: err?.message || 'No message',
          code: err?.code || null,
          stack: err?.stack ? err.stack.split('\n').slice(0, 5) : null,
        }
        
        // Serialize to strings immediately
        const errorDetailsStr = JSON.stringify(errorDetails, null, 2)
        const errorNameStr = String(errorDetails.name)
        const errorMsgStr = String(errorDetails.message)
        const errorCodeStr = errorDetails.code ? String(errorDetails.code) : 'null'
        const errorStackStr = errorDetails.stack ? errorDetails.stack.join('\n') : 'null'
        
        console.error('[Matchmaking] ❌ Error joining queue:', errorDetailsStr)
        console.error('[Matchmaking] ❌ Error name:', errorNameStr)
        console.error('[Matchmaking] ❌ Error message:', errorMsgStr)
        console.error('[Matchmaking] ❌ Error code:', errorCodeStr)
        console.error('[Matchmaking] ❌ Error stack:', errorStackStr)
        
        // Provide user-friendly error message
        let errorMessage = 'Failed to join queue. Please try again.';
        const errMsg = errorDetails.message.toLowerCase()
        
        if (errMsg.includes('network error') || errMsg.includes('unable to connect')) {
          errorMessage = 'Network error: Unable to connect to matchmaking service. Please check your internet connection.';
        } else if (errMsg.includes('database') || errMsg.includes('postgrest') || errMsg.includes('pgrst')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (errorDetails.message && errorDetails.message !== 'No message') {
          errorMessage = errorDetails.message;
        }
        
        setError(errorMessage);
        setHasJoinedQueue(false);
      }
    };
    
    joinQueueAsync();
  }, [isConnected, address, betLevel, betAmount, playerFid, hasJoinedQueue]);
  
  // Check for matches (polling)
  useEffect(() => {
    if (!isConnected || !address || !hasJoinedQueue) {
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current);
        matchCheckIntervalRef.current = null;
      }
      return;
    }
    
    const checkMatch = async () => {
      try {
        const match = await checkForMatch(address);
        if (match) {
          console.log('[Matchmaking] ✅ MATCH FOUND!', match);
          setIsMatching(false);
          setHasJoinedQueue(false);
          
          // Clear intervals
          if (matchCheckIntervalRef.current) {
            clearInterval(matchCheckIntervalRef.current);
            matchCheckIntervalRef.current = null;
          }
          if (queueCountIntervalRef.current) {
            clearInterval(queueCountIntervalRef.current);
            queueCountIntervalRef.current = null;
          }
          
          // Call onMatchFound
          onMatchFound(match.gameId, match.player1Address, match.player2Address);
        }
      } catch (err) {
        console.error('[Matchmaking] Error checking for match:', err);
      }
    };
    
    // Check immediately
    checkMatch();
    
    // Then poll every 2 seconds
    matchCheckIntervalRef.current = setInterval(checkMatch, 2000);
    
    return () => {
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current);
        matchCheckIntervalRef.current = null;
      }
    };
  }, [isConnected, address, hasJoinedQueue, onMatchFound]);
  
  // Update queue count
  useEffect(() => {
    if (!isConnected || !hasJoinedQueue) {
      if (queueCountIntervalRef.current) {
        clearInterval(queueCountIntervalRef.current);
        queueCountIntervalRef.current = null;
      }
      return;
    }
    
    const updateQueueCount = async () => {
      try {
        const count = await getQueueCount(betLevel);
        setQueueCount(count);
      } catch (err) {
        console.error('[Matchmaking] Error getting queue count:', err);
      }
    };
    
    // Update immediately
    updateQueueCount();
    
    // Then poll every 3 seconds
    queueCountIntervalRef.current = setInterval(updateQueueCount, 3000);
    
    return () => {
      if (queueCountIntervalRef.current) {
        clearInterval(queueCountIntervalRef.current);
        queueCountIntervalRef.current = null;
      }
    };
  }, [isConnected, hasJoinedQueue, betLevel]);
  
  // Cleanup on unmount - CRITICAL: Leave queue when component unmounts or app closes
  useEffect(() => {
    // Function to leave queue
    const cleanup = async () => {
      if (address && hasJoinedQueue) {
        try {
          console.log('[Matchmaking] 🧹 Cleanup: Leaving queue on unmount/app close')
          await leaveQueue(address)
          setHasJoinedQueue(false)
        } catch (err) {
          console.error('[Matchmaking] Error leaving queue on cleanup:', err)
        }
      }
      
      // Clear intervals
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current)
        matchCheckIntervalRef.current = null
      }
      if (queueCountIntervalRef.current) {
        clearInterval(queueCountIntervalRef.current)
        queueCountIntervalRef.current = null
      }
    }

    // Handle page visibility change (app closed/minimized)
    const handleVisibilityChange = () => {
      if (document.hidden && hasJoinedQueue) {
        console.log('[Matchmaking] 👁️ Page hidden, leaving queue')
        cleanup()
      }
    }

    // Handle beforeunload (browser/tab close)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasJoinedQueue && address) {
        console.log('[Matchmaking] 🚪 Before unload, leaving queue')
        // Use sendBeacon for reliable cleanup on page close
        const data = JSON.stringify({ playerAddress: address })
        const blob = new Blob([data], { type: 'application/json' })
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/match/leave', blob)
        } else {
          // Fallback: sync fetch with keepalive
          fetch('/api/match/leave', {
            method: 'POST',
            body: data,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {})
        }
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cleanup()
    }
  }, [address, hasJoinedQueue])
  
  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (address && hasJoinedQueue) {
      try {
        await leaveQueue(address);
        setHasJoinedQueue(false);
        setIsMatching(false);
      } catch (err) {
        console.error('[Matchmaking] Error leaving queue:', err);
      }
    }
    if (onCancel) {
      onCancel();
    }
  }, [address, hasJoinedQueue, onCancel]);
  
  return (
    <div className="relative">
      <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 text-center px-4">
          <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
            SEARCHING
          </span>
        </h2>
        
        <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-center max-w-md font-mono uppercase tracking-wider px-4">
          Looking for opponent...
        </p>
        
        {/* Queue Status Display */}
        {hasJoinedQueue && (
          <div className="mb-6 sm:mb-8 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-black/60 border-2 border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.4)] mx-4">
            <p className="text-cyan-400 font-mono font-bold text-center uppercase tracking-wider text-sm sm:text-base">
              Pool: {formatEther(betAmount)} ETH
            </p>
            <p className="text-gray-400 font-mono text-xs sm:text-sm text-center mt-2">
              {queueCount > 0 ? `${queueCount} player${queueCount > 1 ? 's' : ''} waiting...` : 'Waiting for another player...'}
            </p>
          </div>
        )}
        
        {/* Status Indicators */}
        <div className="space-y-4 sm:space-y-5 w-full max-w-md px-4">
          {!hasJoinedQueue && !error && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-blue-500/40 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.4)]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-blue-400 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                <p className="text-blue-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                  Joining queue...
                </p>
              </div>
            </div>
          )}
          
          {hasJoinedQueue && isMatching && (
            <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-yellow-500/40 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
              <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base">
                In Queue - Searching...
              </p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <p className="text-red-400 font-mono font-bold uppercase tracking-wider text-xs sm:text-sm text-center">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setHasJoinedQueue(false);
                }}
                className="px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 font-mono text-sm hover:bg-red-500/30 transition-colors font-bold uppercase tracking-wider mt-2"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        
        {/* Loading Dots */}
        <div className="flex gap-3 mt-12">
          <div className="w-4 h-4 bg-red-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,1)]" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,1)]" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(234,179,8,1)]" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Cancel Button */}
        {onCancel && (hasJoinedQueue || isMatching) && (
          <div className="mt-8 sm:mt-10 md:mt-12 px-4">
            <button
              onClick={handleCancel}
              className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-black/80 border-2 border-red-500/60 rounded-lg hover:border-red-500/80 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] text-red-400 font-mono font-bold uppercase tracking-wider text-sm sm:text-base min-h-[48px]"
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
export const MatchmakingOffChain = React.memo(MatchmakingOffChainComponent);


