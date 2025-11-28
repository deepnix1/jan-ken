'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getBetLevelFromAmount } from '@/lib/contract';
import { isValidBetAmount, isValidAddress } from '@/lib/security';
import { joinQueue, checkForMatch, leaveQueue, getQueueCount, MatchResult } from '@/lib/matchmakingService';
import { supabase } from '@/lib/supabase';
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
  
  // CRITICAL: Cleanup function - leave queue when component unmounts or conditions change
  useEffect(() => {
    return () => {
      // Cleanup: Leave queue when component unmounts
      if (hasJoinedQueue && address) {
        console.log('[Matchmaking] 🧹 Cleanup: Leaving queue on component unmount')
        leaveQueue(address).catch(err => {
          console.error('[Matchmaking] ❌ Error leaving queue on cleanup:', err)
        })
      }
    }
  }, [hasJoinedQueue, address])

  // Join queue when component mounts
  // CRITICAL: Only join queue if:
  // 1. Bet amount is selected (betAmount > 0)
  // 2. Wallet is connected
  // 3. Address is available
  // 4. App is visible
  // 5. Component is actually rendered (not just mounted)
  useEffect(() => {
    // CRITICAL: Don't join queue if bet is not selected
    if (!betAmount || betAmount === BigInt(0)) {
      console.log('[Matchmaking] ⚠️ Bet amount not selected, skipping queue join', JSON.stringify({
        betAmount: betAmount?.toString() || 'null',
        hasBetAmount: !!betAmount,
        betAmountIsZero: betAmount === BigInt(0),
      }, null, 2))
      setError('Please select a bet amount before joining the queue.')
      // CRITICAL: Leave queue if already joined but bet is not selected
      if (hasJoinedQueue && address) {
        console.log('[Matchmaking] 🧹 Leaving queue - bet amount not selected')
        leaveQueue(address).catch(err => {
          console.error('[Matchmaking] ❌ Error leaving queue:', err)
        })
        setHasJoinedQueue(false)
      }
      return
    }
    
    // CRITICAL: Don't join queue if wallet is not connected
    if (!isConnected) {
      console.log('[Matchmaking] ⚠️ Wallet not connected, skipping queue join')
      setError('Please connect your wallet first.')
      // CRITICAL: Leave queue if already joined but wallet disconnected
      if (hasJoinedQueue && address) {
        console.log('[Matchmaking] 🧹 Leaving queue - wallet disconnected')
        leaveQueue(address).catch(err => {
          console.error('[Matchmaking] ❌ Error leaving queue:', err)
        })
        setHasJoinedQueue(false)
      }
      return
    }
    
    // CRITICAL: Don't join queue if address is not available
    if (!address) {
      console.log('[Matchmaking] ⚠️ Wallet address not available, skipping queue join')
      setError('Wallet address not available.')
      return
    }
    
    // CRITICAL: Check if app is visible
    if (typeof document !== 'undefined' && document.hidden) {
      console.log('[Matchmaking] ⚠️ App is hidden, skipping queue join')
      setError('App must be visible to join queue.')
      // CRITICAL: Leave queue if already joined but app is hidden
      if (hasJoinedQueue) {
        console.log('[Matchmaking] 🧹 Leaving queue - app is hidden')
        leaveQueue(address).catch(err => {
          console.error('[Matchmaking] ❌ Error leaving queue:', err)
        })
        setHasJoinedQueue(false)
      }
      return
    }
    
    // CRITICAL: Don't join if already joined
    if (hasJoinedQueue) {
      console.log('[Matchmaking] ✅ Already joined queue, skipping')
      return
    }
    
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
      // CRITICAL: Stop polling if match found or not in queue
      if (!isConnected || !address || !hasJoinedQueue || showMatchFound) {
        if (matchCheckIntervalRef.current) {
          clearInterval(matchCheckIntervalRef.current);
          matchCheckIntervalRef.current = null;
          console.log('[Matchmaking] 🛑 Stopped checkForMatch polling:', JSON.stringify({
            isConnected,
            hasAddress: !!address,
            hasJoinedQueue,
            showMatchFound,
          }, null, 2))
        }
        return;
      }
      
      // CRITICAL: Check if player is still in queue before polling
      // This prevents unnecessary polling for cancelled players
      const checkQueueStatus = async () => {
        try {
          const { data: queueStatus } = await supabase
            .from('matchmaking_queue')
            .select('status')
            .eq('player_address', address.toLowerCase())
            .eq('status', 'waiting')
            .limit(1)
          
          // If player is not waiting, stop polling
          if (!queueStatus || queueStatus.length === 0) {
            console.log('[Matchmaking] 🛑 Player not in waiting queue, stopping checkForMatch polling')
            if (matchCheckIntervalRef.current) {
              clearInterval(matchCheckIntervalRef.current);
              matchCheckIntervalRef.current = null;
            }
            return false
          }
          return true
        } catch (err) {
          console.error('[Matchmaking] ❌ Error checking queue status:', err)
          return true // Continue polling on error
        }
      }
      
      // CRITICAL: useEffect cannot be async, so we need to wrap async logic
      // Check queue status and start polling only if player is in queue
      const initializePolling = async () => {
        const shouldPoll = await checkQueueStatus()
        if (!shouldPoll) {
          return
        }
        
        // Start polling only if shouldPoll is true
        // The polling logic will be set up below
      }
      
      // Call async function to check queue status
      initializePolling()
      
      // Continue with polling setup (will be checked on first poll)
    
    // CRITICAL: Update last_seen timestamp to keep player active in queue
    // This ensures only players with open apps can be matched
    const updateLastSeen = async () => {
      if (!address || !hasJoinedQueue) {
        console.warn('[Matchmaking] ⚠️ Cannot update last_seen - missing address or not in queue:', JSON.stringify({
          hasAddress: !!address,
          hasJoinedQueue,
          address: address?.slice(0, 10) + '...',
        }, null, 2))
        return;
      }
      
      try {
        // Check if app is visible
        if (typeof document !== 'undefined' && document.hidden) {
          console.log('[Matchmaking] ⚠️ App is hidden - not updating last_seen');
          return;
        }
        
        const now = new Date().toISOString()
        console.log('[Matchmaking] 🔄 Updating last_seen to:', now)
        
        // Update last_seen timestamp in queue
        const { data, error } = await supabase
          .from('matchmaking_queue')
          .update({ last_seen: now })
          .eq('player_address', address.toLowerCase())
          .eq('status', 'waiting')
          .select('id, last_seen')
        
        if (error) {
          console.error('[Matchmaking] ❌❌❌ CRITICAL: Could not update last_seen:', JSON.stringify({
            error: error.message || error.code || error,
            code: error.code,
            details: error.details,
            hint: error.hint,
            address: address.slice(0, 10) + '...',
            now,
          }, null, 2))
          // CRITICAL: This is a serious error - player will be excluded from matching
          // Try to leave queue if update fails repeatedly
          console.error('[Matchmaking] ⚠️ last_seen update failed - player will be excluded from matching')
        } else if (data && data.length > 0) {
          console.log('[Matchmaking] ✅✅✅ Updated last_seen successfully:', JSON.stringify({
            updatedRows: data.length,
            last_seen: data[0]?.last_seen,
            queueId: data[0]?.id,
          }, null, 2))
        } else {
          console.warn('[Matchmaking] ⚠️ Update last_seen returned no rows - player may not be in queue:', JSON.stringify({
            address: address.slice(0, 10) + '...',
            hasJoinedQueue,
          }, null, 2))
        }
      } catch (err: any) {
        console.error('[Matchmaking] ❌❌❌ CRITICAL ERROR updating last_seen:', JSON.stringify({
          error: err?.message || String(err),
          name: err?.name,
          stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
          address: address?.slice(0, 10) + '...',
        }, null, 2))
      }
    };
    
    const checkMatch = async () => {
      const isMobile = typeof window !== 'undefined' ? /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) : false;
      console.log('[Matchmaking] 🔄 Polling checkForMatch - address:', address?.slice(0, 10) + '...', JSON.stringify({
        isMobile,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        isConnected,
        hasJoinedQueue,
        isVisible: typeof document !== 'undefined' ? !document.hidden : true,
      }, null, 2))
      
      // CRITICAL: Update last_seen before checking for match
      await updateLastSeen();
      
      try {
        const match = await checkForMatch(address);
        if (match) {
          console.log('[Matchmaking] ✅✅✅ MATCH FOUND! ✅✅✅', JSON.stringify({
            gameId: match.gameId,
            player1: match.player1Address.slice(0, 10) + '...',
            player2: match.player2Address.slice(0, 10) + '...',
            betLevel: match.betLevel,
            currentPlayer: address?.slice(0, 10) + '...',
            isPlayer1: match.player1Address.toLowerCase() === address?.toLowerCase(),
            isPlayer2: match.player2Address.toLowerCase() === address?.toLowerCase(),
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
            isMobile: typeof window !== 'undefined' ? /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) : false,
          }, null, 2))
          
          // CRITICAL: Stop all polling immediately
          console.log('[Matchmaking] 🛑 Stopping all polling...')
          setIsMatching(false);
          setHasJoinedQueue(false);
          
          // Clear intervals immediately
          if (matchCheckIntervalRef.current) {
            clearInterval(matchCheckIntervalRef.current);
            matchCheckIntervalRef.current = null;
            console.log('[Matchmaking] ✅ matchCheckInterval cleared')
          }
          if (queueCountIntervalRef.current) {
            clearInterval(queueCountIntervalRef.current);
            queueCountIntervalRef.current = null;
            console.log('[Matchmaking] ✅ queueCountInterval cleared')
          }
          
          // CRITICAL: Call onMatchFound immediately (no delay needed)
          console.log('[Matchmaking] 🎯🎯🎯 Calling onMatchFound callback IMMEDIATELY...')
          console.log('[Matchmaking] 📞 onMatchFound function exists:', typeof onMatchFound === 'function')
          console.log('[Matchmaking] 📞 onMatchFound will be called with:', JSON.stringify({
            gameId: match.gameId,
            player1: match.player1Address.slice(0, 10) + '...',
            player2: match.player2Address.slice(0, 10) + '...',
          }, null, 2))
          
          try {
            onMatchFound(match.gameId, match.player1Address, match.player2Address);
            console.log('[Matchmaking] ✅✅✅ onMatchFound callback CALLED SUCCESSFULLY! ✅✅✅')
          } catch (callbackError: any) {
            console.error('[Matchmaking] ❌❌❌ ERROR calling onMatchFound:', JSON.stringify({
              error: callbackError?.message || String(callbackError),
              name: callbackError?.name,
              stack: callbackError?.stack?.split('\n').slice(0, 5).join('\n'),
            }, null, 2))
          }
        } else {
          console.log('[Matchmaking] ⚠️ No match found in this polling cycle')
        }
      } catch (err: any) {
        console.error('[Matchmaking] ❌ Error checking for match:', JSON.stringify({
          error: err?.message || String(err),
          name: err?.name,
          stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
        }, null, 2))
      }
    };
    
    // Check immediately
    checkMatch();
    
    // Then poll every 2 seconds
    matchCheckIntervalRef.current = setInterval(checkMatch, 2000);
    
    // CRITICAL: Separate heartbeat interval for last_seen updates (every 10 seconds)
    // This ensures last_seen is updated even if checkForMatch is not called
    const heartbeatInterval = setInterval(() => {
      if (address && hasJoinedQueue && typeof document !== 'undefined' && !document.hidden) {
        updateLastSeen().catch(err => {
          console.error('[Matchmaking] ❌ Heartbeat updateLastSeen error:', err);
        });
      }
    }, 10000); // Every 10 seconds
    
    return () => {
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current);
        matchCheckIntervalRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
    
    return () => {
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current);
        matchCheckIntervalRef.current = null;
      }
    };
  }, [isConnected, address, hasJoinedQueue, onMatchFound, showMatchFound]);
  
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
        console.log('[Matchmaking] 📊 Queue count updated:', count, 'for betLevel', betLevel)
        setQueueCount(count);
        
        // CRITICAL: If 2+ players waiting, force tryMatch
        if (count >= 2) {
          console.log('[Matchmaking] 🚀🚀🚀 2+ players waiting, forcing tryMatch for betLevel', betLevel)
          // Import tryMatch and call it directly
          const { tryMatch: tryMatchFn } = await import('@/lib/matchmakingService')
          tryMatchFn(betLevel)
            .then(result => {
              if (result) {
                console.log('[Matchmaking] ✅✅✅ Force tryMatch successful!', JSON.stringify({
                  gameId: result.gameId,
                  player1: result.player1Address.slice(0, 10) + '...',
                  player2: result.player2Address.slice(0, 10) + '...',
                  betLevel: result.betLevel,
                }, null, 2))
                
                // CRITICAL: If we're one of the matched players, trigger match found immediately
                const isPlayer1 = result.player1Address.toLowerCase() === address?.toLowerCase()
                const isPlayer2 = result.player2Address.toLowerCase() === address?.toLowerCase()
                
                if (isPlayer1 || isPlayer2) {
                  console.log('[Matchmaking] 🎯🎯🎯 WE ARE IN THE MATCH! Triggering onMatchFound immediately!', JSON.stringify({
                    gameId: result.gameId,
                    player1: result.player1Address.slice(0, 10) + '...',
                    player2: result.player2Address.slice(0, 10) + '...',
                    currentPlayer: address?.slice(0, 10) + '...',
                    isPlayer1,
                    isPlayer2,
                    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
                    isMobile: typeof window !== 'undefined' ? /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) : false,
                  }, null, 2))
                  
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
                  
                  // Call onMatchFound immediately
                  console.log('[Matchmaking] 📞 Calling onMatchFound from queue count update...')
                  try {
                    onMatchFound(result.gameId, result.player1Address, result.player2Address);
                    console.log('[Matchmaking] ✅ onMatchFound called successfully from queue count update')
                  } catch (callbackError: any) {
                    console.error('[Matchmaking] ❌ Error calling onMatchFound from queue count update:', JSON.stringify({
                      error: callbackError?.message || String(callbackError),
                      name: callbackError?.name,
                    }, null, 2))
                  }
                } else {
                  console.log('[Matchmaking] ⚠️ Match created but we are not one of the players')
                }
              } else {
                console.log('[Matchmaking] ⚠️ Force tryMatch returned null - no match created')
              }
            })
            .catch(err => {
              console.error('[Matchmaking] ❌ Force tryMatch error:', JSON.stringify({
                error: err?.message || String(err),
                name: err?.name,
                stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
              }, null, 2))
            })
        }
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
  
  // CRITICAL: Cleanup - Leave queue when component unmounts, visibility changes, or wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      // If wallet disconnected, leave queue immediately
      if (hasJoinedQueue) {
        console.log('[Matchmaking] 🚪 Wallet disconnected - leaving queue immediately', JSON.stringify({
          address: address?.slice(0, 10) + '...',
          isConnected,
        }, null, 2));
        leaveQueue(address || '' as any).catch(err => {
          console.error('[Matchmaking] ❌ Error leaving queue on disconnect:', err);
        });
        setHasJoinedQueue(false);
        setIsMatching(false);
      }
      return;
    }
    
    // Function to leave queue
    const cleanup = async () => {
      if (address && hasJoinedQueue) {
        try {
          console.log('[Matchmaking] 🧹 Cleanup: Leaving queue', JSON.stringify({
            address: address.slice(0, 10) + '...',
            reason: 'cleanup',
          }, null, 2));
          await leaveQueue(address);
          setHasJoinedQueue(false);
          setIsMatching(false);
          console.log('[Matchmaking] ✅ Successfully left queue on cleanup');
        } catch (err: any) {
          console.error('[Matchmaking] ❌ Error leaving queue on cleanup:', JSON.stringify({
            error: err?.message || String(err),
            name: err?.name,
          }, null, 2));
        }
      }
      
      // Clear intervals
      if (matchCheckIntervalRef.current) {
        clearInterval(matchCheckIntervalRef.current);
        matchCheckIntervalRef.current = null;
      }
      if (queueCountIntervalRef.current) {
        clearInterval(queueCountIntervalRef.current);
        queueCountIntervalRef.current = null;
      }
    };

    // CRITICAL: Leave queue on visibility change (tab hidden/closed/background)
    // Also set last_seen to NULL when app is hidden (based on web research)
    const handleVisibilityChange = async () => {
      if (document.hidden && hasJoinedQueue && address) {
        console.log('[Matchmaking] 👁️ Tab hidden/closed - setting last_seen to NULL and leaving queue', JSON.stringify({
          address: address?.slice(0, 10) + '...',
          hidden: document.hidden,
        }, null, 2));
        
        // CRITICAL: Set last_seen to NULL when app is hidden (prevents matching)
        try {
          await supabase
            .from('matchmaking_queue')
            .update({ last_seen: null })
            .eq('player_address', address.toLowerCase())
            .eq('status', 'waiting')
          console.log('[Matchmaking] ✅ Set last_seen to NULL (app hidden)');
        } catch (err) {
          console.error('[Matchmaking] ❌ Error setting last_seen to NULL:', err);
        }
        
        cleanup();
      }
    };

    // CRITICAL: Leave queue on beforeunload (page close/navigation)
    const handleBeforeUnload = () => {
      if (hasJoinedQueue && address) {
        console.log('[Matchmaking] 🚪 Page unloading - leaving queue', JSON.stringify({
          address: address.slice(0, 10) + '...',
        }, null, 2));
        // Use sendBeacon for reliable cleanup
        if (navigator.sendBeacon) {
          try {
            const data = JSON.stringify({ playerAddress: address });
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/match/leave', blob);
          } catch (err) {
            console.error('[Matchmaking] ❌ Error sending beacon:', err);
          }
        } else {
          // Fallback: sync fetch with keepalive
          fetch('/api/match/leave', {
            method: 'POST',
            body: JSON.stringify({ playerAddress: address }),
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {});
        }
        cleanup();
      }
    };
    
    // CRITICAL: Monitor wallet connection status
    const checkWalletConnection = () => {
      if (!isConnected || !address) {
        console.log('[Matchmaking] ⚠️ Wallet disconnected - leaving queue');
        cleanup();
      }
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Check wallet connection periodically (every 2 seconds)
    const walletCheckInterval = setInterval(checkWalletConnection, 2000);

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
              {queueCount >= 2 
                ? `🔍 ${queueCount} players waiting - matching...` 
                : queueCount === 1 
                  ? '1 player waiting - need 1 more...' 
                  : 'Waiting for another player...'}
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


