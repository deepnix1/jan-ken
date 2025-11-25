'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect, useConnectorClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { BetSelector } from '@/components/BetSelector';
import { MatchmakingOffChain } from '@/components/MatchmakingOffChain';
import { GameBoard } from '@/components/GameBoard';
import { Result } from '@/components/Result';
import { MatchFoundAnimation } from '@/components/MatchFoundAnimation';
import { DebugPanel } from '@/components/DebugPanel';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';

// Disable SSR for this page (Wagmi doesn't work with SSR)
export const dynamic = 'force-dynamic';

export default function Home() {
  // useAccount automatically watches for account changes in Wagmi v3
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: connectorClient } = useConnectorClient();
  const [gameState, setGameState] = useState<'select' | 'matching' | 'playing' | 'result'>('select');
  const [selectedBet, setSelectedBet] = useState<bigint | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [showMatchFound, setShowMatchFound] = useState(false);
  const [player1Address, setPlayer1Address] = useState<string | undefined>(undefined);
  const [player2Address, setPlayer2Address] = useState<string | undefined>(undefined);
  const [appReady, setAppReady] = useState(false);
  const previousAddressRef = useRef<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showGame, setShowGame] = useState(false); // For "Let's Play" button
  const [isConnecting, setIsConnecting] = useState(false); // For loading screen
  const [isTransitioning, setIsTransitioning] = useState(false); // For page transitions

  // Call sdk.actions.ready() when interface is ready (per Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/getting-started#making-your-app-display
  // "After your app loads, you must call sdk.actions.ready() to hide the splash screen and display your content"
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let mounted = true;
    
    // Function to call ready() when SDK is available
    // Per docs: "await sdk.actions.ready()"
    const callReady = async () => {
      try {
        // Try imported SDK first
        if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
          await sdk.actions.ready();
          if (mounted) {
            setAppReady(true);
            console.log('✅ Farcaster SDK ready() called (imported SDK) - splash screen hidden');
          }
          return true;
        }
        
        // Try window SDK (PC Debug Tool or web environment)
        if ((window as any).farcaster?.sdk?.actions?.ready) {
          await (window as any).farcaster.sdk.actions.ready();
          if (mounted) {
            setAppReady(true);
            console.log('✅ Farcaster SDK ready() called (window SDK) - splash screen hidden');
          }
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
        // If we're not in Farcaster environment, continue anyway
        if (mounted) {
          setAppReady(true);
        }
        return false;
      }
    };
    
    // Try immediately
    callReady().then((success) => {
      if (success) {
        return;
      }
      
      // If SDK not ready, wait for it with polling
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max (50 * 100ms)
      
      const checkSDK = setInterval(async () => {
        attempts++;
        
        const success = await callReady();
        if (success) {
          clearInterval(checkSDK);
          return;
        }
        
        // Log debug info every 10 attempts (1 second)
        if (attempts % 10 === 0) {
          console.log(`🔍 Checking for Farcaster SDK... (attempt ${attempts}/${maxAttempts})`, {
            hasImportedSDK: !!sdk,
            hasSDKActions: !!(sdk && sdk.actions),
            hasReadyFunction: !!(sdk && sdk.actions && typeof sdk.actions.ready === 'function'),
            hasWindowSDK: !!(window as any).farcaster?.sdk,
            userAgent: navigator.userAgent,
          });
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(checkSDK);
          // SDK not available - might be normal web browser (not Farcaster Mini App)
          console.log('ℹ️ Farcaster SDK not available - this is normal if running in a regular web browser');
          if (mounted) {
            setAppReady(true);
          }
        }
      }, 100); // Check every 100ms
      
      return () => clearInterval(checkSDK);
    });
    
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-connect wallet when app is ready (Farcaster Mini App)
  useEffect(() => {
    if (!appReady || isConnected || isPending) return;
    
    console.log('🔄 Auto-connecting wallet in Farcaster Mini App...');
    console.log('Connectors available:', connectors.map(c => c.name));
    
    // Auto-connect with Farcaster connector
    const farcasterConnector = connectors.find(c => 
      c.name === 'Farcaster Mini App' || 
      c.name?.includes('Farcaster')
    );
    
    if (farcasterConnector) {
      console.log('✅ Found Farcaster connector, auto-connecting...');
      setIsConnecting(true);
      connect({ connector: farcasterConnector });
      
      // Hide loading after attempt
      setTimeout(() => {
        setIsConnecting(false);
      }, 3000);
    } else {
      console.warn('⚠️ Farcaster connector not found');
      console.log('Available connectors:', connectors);
    }
  }, [appReady, isConnected, isPending, connectors, connect]);

  useEffect(() => {
    if (!isConnected) {
      // Reset all game state when wallet disconnects
      setGameState('select');
      setSelectedBet(null);
      setGameId(null);
      setShowMatchFound(false);
      setShowGame(false);
      previousAddressRef.current = undefined;
    }
  }, [isConnected]);

  // Watch for wallet address changes in Farcaster
  useEffect(() => {
    if (!appReady || typeof window === 'undefined') return;

    // Listen for wallet changes from Farcaster SDK
    const handleWalletChange = async () => {
      try {
        if (sdk && typeof sdk.wallet !== 'undefined') {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            // Listen for account changes
            provider.on('accountsChanged', async (accounts: readonly `0x${string}`[]) => {
              console.log('🔄 Wallet address changed in Farcaster:', accounts);
              const newAddress = accounts[0]?.toLowerCase();
              const currentAddress = address?.toLowerCase();
              
              if (newAddress && newAddress !== currentAddress) {
                console.log('🔄 Reconnecting with new wallet address...');
                // Disconnect first, then reconnect
                disconnect();
                // Wait a bit for disconnect to complete
                setTimeout(() => {
                  const farcasterConnector = connectors.find(c => c.name === 'Farcaster Mini App' || c.name?.includes('Farcaster'));
                  if (farcasterConnector) {
                    connect({ connector: farcasterConnector });
                  }
                }, 500);
              }
            });

            // Listen for chain changes
            provider.on('chainChanged', () => {
              console.log('🔄 Chain changed, reconnecting...');
              disconnect();
              setTimeout(() => {
                const farcasterConnector = connectors.find(c => c.name === 'Farcaster Mini App' || c.name?.includes('Farcaster'));
                if (farcasterConnector) {
                  connect({ connector: farcasterConnector });
                }
              }, 500);
            });
          }
        }
      } catch (error) {
        console.error('Error setting up wallet change listener:', error);
      }
    };

    handleWalletChange();
  }, [appReady, address, connectors, connect, disconnect]);
  
  // Monitor connector client creation and auto-reconnect if needed
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔍 Connector client status check:', {
        isConnected,
        address,
        connectorClientAvailable: !!connectorClient,
        connectorClientAccount: connectorClient?.account?.address,
        connectorClientChain: connectorClient?.chain?.id,
        connectorsCount: connectors.length,
        connectorNames: connectors.map(c => c.name),
      });
      
      // If connected but no connector client, wait a bit then reconnect
      // This is normal during initial connection, so we'll wait up to 3 seconds
      if (!connectorClient) {
        // Only log warning after 1 second to avoid noise
        const warningTimeout = setTimeout(() => {
          console.warn('⚠️ Connector client not yet available - this is normal during connection initialization');
        }, 1000);
        
        const reconnectTimeout = setTimeout(() => {
          if (!connectorClient) {
            console.error('❌ Connector client still not available after 3 seconds');
            console.error('Attempting to reconnect...');
            
            // Get active connector
            const activeConnector = connectors.find(c => c.name === 'Farcaster Mini App' || c.name?.includes('Farcaster'));
            if (activeConnector) {
              console.log('🔄 Disconnecting and reconnecting with Farcaster connector...');
              disconnect();
              setTimeout(() => {
                console.log('🔄 Reconnecting...');
                connect({ connector: activeConnector });
              }, 1000);
            } else {
              console.error('❌ Farcaster connector not found for reconnect');
            }
          } else {
            console.log('✅ Connector client created after wait');
          }
        }, 3000);
        
        return () => {
          clearTimeout(warningTimeout);
          clearTimeout(reconnectTimeout);
        };
      } else {
        console.log('✅ Connector client is available:', {
          account: connectorClient.account?.address,
          chain: connectorClient.chain?.id,
          chainName: connectorClient.chain?.name,
        });
      }
    }
  }, [isConnected, address, connectorClient, connectors, connect, disconnect]);

  // Fetch user profile when connected - IMMEDIATE
  useEffect(() => {
    if (address && isConnected && !userProfile) {
      console.log('[Home] 📥 Fetching user profile IMMEDIATELY:', address);
      setIsLoadingProfile(true);
      
      // Fetch with timeout
      const fetchWithTimeout = Promise.race([
        getFarcasterProfileByAddress(address),
        new Promise<{ pfpUrl: null; username: null }>((resolve) => 
          setTimeout(() => {
            console.warn('[Home] ⏱️ Profile fetch timeout - showing fallback');
            resolve({ pfpUrl: null, username: null });
          }, 5000) // 5 second timeout
        )
      ]);
      
      fetchWithTimeout
        .then((profile) => {
          console.log('[Home] 📦 User profile received:', profile);
          setUserProfile(profile);
        })
        .catch((error) => {
          console.error('[Home] ❌ Profile fetch error:', error);
          setUserProfile({ pfpUrl: null, username: null });
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [address, isConnected, userProfile]);

  // Also watch for address changes via useAccount
  useEffect(() => {
    if (address && previousAddressRef.current && previousAddressRef.current !== address) {
      console.log('🔄 Wallet address changed via useAccount:', {
        previous: previousAddressRef.current,
        current: address,
      });
      // Reset game state when wallet changes
      setGameState('select');
      setSelectedBet(null);
      setGameId(null);
      setShowMatchFound(false);
      setShowGame(false); // Reset Let's Play state
    }
    previousAddressRef.current = address;
  }, [address]);

  const handleConnect = () => {
    if (connectors.length === 0) {
      console.error('No connectors available');
      alert('No wallet connectors available. Please install MetaMask or use Farcaster.');
      return;
    }
    
    setIsConnecting(true); // Show loading screen
    
    // Per Farcaster docs: In Mini Apps, connector automatically connects if user has wallet
    // Try Farcaster Mini App connector first (it should be first in array)
    const farcasterConnector = connectors.find(c => c.name === 'Farcaster Mini App' || c.name?.includes('Farcaster'));
    const connector = farcasterConnector || connectors[0];
    
    // Per Farcaster docs: connect({ connector: connectors[0] })
    connect({ connector });
    
    // Hide loading after attempt (success or fail will be handled by useEffect)
    setTimeout(() => {
      setIsConnecting(false);
    }, 2000);
  };

  const handleBetSelect = (betAmount: bigint) => {
    // Transition animation
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedBet(betAmount);
      setGameState('matching');
      setShowMatchFound(false);
      setIsTransitioning(false);
    }, 400);
  };

  const handleMatchFound = (id: string, p1Address?: string, p2Address?: string) => {
    setPlayer1Address(p1Address);
    setPlayer2Address(p2Address);
    setGameId(id); // Set gameId immediately
    setShowMatchFound(true);
    // Game state will be set to 'playing' when animation closes (onClose callback)
  };

  const handleGameEnd = () => {
    setGameState('result');
  };

  const handlePlayAgain = () => {
    // Reset all game-related state
    setGameState('select');
    setSelectedBet(null);
    setGameId(null);
    setShowMatchFound(false);
    setPlayer1Address(undefined);
    setPlayer2Address(undefined);
  };

  const handleTieRematch = () => {
    // Keep same players, same bet, start new game immediately
    if (selectedBet && gameId) {
      setGameState('playing');
      setShowMatchFound(false);
      // Generate new game ID for rematch
      setGameId(`rematch-${Date.now()}`);
    }
  };

  const handleCancelMatchmaking = () => {
    // Return to bet selection and reset all state
    setGameState('select');
    setSelectedBet(null);
    setShowMatchFound(false);
    setPlayer1Address(undefined);
    setPlayer2Address(undefined);
    setGameId(null);
    // Note: In production, we would need to call a contract function to leave queue
    // For now, we just reset the UI state
  };

  return (
          <>
          {/* Loading Screens */}
          {isConnecting && (
            <LoadingScreen 
              message="CONNECTING WALLET" 
              subMessage="Please approve in your wallet"
            />
          )}
          
          <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Japanese Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Traditional Japanese Wave Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(220, 20, 60, 0.3) 50px, rgba(220, 20, 60, 0.3) 51px)',
          backgroundSize: '100% 100px'
        }}></div>
        
        {/* Subtle Cherry Blossoms - Reduced */}
        <div className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`cherry-${i}`}
              className="absolute text-pink-300/40 text-lg animate-cherry-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            >
              🌸
            </div>
          ))}
        </div>
        
        {/* Red Lantern Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full filter blur-3xl animate-lantern-glow"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-red-600/20 rounded-full filter blur-3xl animate-lantern-glow animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-yellow-500/10 rounded-full filter blur-3xl animate-lantern-glow animation-delay-4000"></div>
        
        {/* Arcade Scan Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(220,20,60,0.05)_50%)] bg-[length:100%_4px]"></div>
        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent animate-arcade-scan"></div>
        
        {/* Japanese Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(220,20,60,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,20,60,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header - Clean Style - Hidden during matchmaking */}
          {gameState !== 'matching' && (
            <header className="flex flex-col items-center mb-6 relative">
              {/* User Profile - Top Right (Japanese Styled) */}
              {isConnected && (
                <div className="absolute top-0 right-0 flex items-center gap-3 animate-fade-in-down">
                  <div className="hidden sm:flex flex-col items-end">
                    {isLoadingProfile ? (
                      <>
                        <div className="h-4 w-24 bg-red-600/20 rounded animate-pulse"></div>
                        <div className="h-3 w-20 bg-red-600/10 rounded animate-pulse mt-1"></div>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-bold text-sm tracking-wide">
                          {userProfile?.username || 'PLAYER'}
                        </span>
                        <span className="text-yellow-400/80 font-mono text-xs">
                          {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-red-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-lantern-glow"></div>
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 border-red-500 overflow-hidden shadow-[0_0_20px_rgba(220,20,60,0.8)] bg-gradient-to-br from-red-900 to-black">
                      {isLoadingProfile ? (
                        <div className="w-full h-full flex items-center justify-center animate-pulse">
                          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : userProfile?.pfpUrl ? (
                        <Image
                          src={userProfile.pfpUrl}
                          alt={userProfile.username || 'You'}
                          fill
                          className="object-cover animate-scale-in"
                          unoptimized
                          onError={(e) => {
                            console.error('[Profile] ❌ Image load failed:', userProfile.pfpUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('[Profile] ✅ Image loaded:', userProfile.pfpUrl);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-400 text-xl font-black">
                          {address?.slice(2, 4).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Logo - Clean and Compact */}
              <div className="relative w-full max-w-[180px] sm:max-w-[200px] mb-6 flex justify-center">
                {/* Subtle Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-yellow-500/10 to-red-600/20 blur-2xl"></div>
                
                {/* Logo Container */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <Image
                    src="/new_logo.png"
                    alt="Jan-Ken"
                    width={200}
                    height={67}
                    className="object-contain w-full h-auto"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(220,20,60,0.6))' }}
          priority
                    unoptimized
                  />
                  
                  {/* Subtitle - Compact */}
                  <div className="mt-1 text-center">
                    <p className="text-red-400 text-xs sm:text-sm font-bold tracking-wider">
                      ROCK • PAPER • SCISSORS
                    </p>
                  </div>
                </div>
              </div>
            </header>
          )}
          
          {/* Main Content - Clean Style */}
          <div className="relative bg-black/80 backdrop-blur-xl rounded-xl border border-red-600/30 shadow-[0_0_40px_rgba(220,20,60,0.2)] p-4 sm:p-6 md:p-8 min-h-[50vh] flex items-center justify-center overflow-visible">
            {/* Subtle Corner Accents - Smaller */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/30"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500/30"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500/30"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/30"></div>
            
            {/* Content */}
            <div className="relative z-10 w-full">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-8 py-16 animate-fade-in-up">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                      <div className="relative w-24 h-24">
                        <div className="absolute inset-0 animate-spin-slow">
                          <svg width="96" height="96" viewBox="0 0 24 24" className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,1)]">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse">
                      CONNECTING...
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-300 text-center max-w-lg font-medium leading-relaxed">
                      Initializing Farcaster Mini App...
                      <br />
                      <span className="text-gray-400 text-base">Your wallet will connect automatically ✨</span>
                    </p>
                  </div>
                 {connectError && (
                   <div className="mt-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-lg w-full max-w-md animate-shake">
                     <p className="text-red-400 text-xs sm:text-sm font-mono text-center mb-2">
                       ⚠️ Connection Failed
                     </p>
                     <p className="text-red-300 text-xs sm:text-sm font-mono text-center">
                       {
                         (connectError && typeof connectError === 'object' && 'shortMessage' in connectError) 
                           ? (connectError as any).shortMessage
                           : (connectError && typeof connectError === 'object' && 'message' in connectError)
                           ? (connectError as any).message
                           : (typeof connectError === 'string')
                           ? connectError
                           : 'Unknown error'
                       }
                     </p>
                     <button
                       onClick={handleConnect}
                       className="mt-3 w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg transition-colors"
                     >
                       Retry Connection
                     </button>
                   </div>
                 )}
              </div>
            ) : !showGame ? (
              /* Let's Play Landing Screen - Clean Layout */
              <div className="flex flex-col items-center gap-6 py-8 animate-fade-in-up">
                {/* Main Title - Compact */}
                <div className="text-center space-y-3">
                  <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-red-500" style={{
                    textShadow: '0 0 15px rgba(220,20,60,0.6)'
                  }}>
                    JAN-KEN
                  </h2>
                  <p className="text-gray-300 text-sm max-w-md">
                    Play Rock Paper Scissors on Base Network • Win ETH
                  </p>
                </div>
                
                {/* Let's Play Button - Moved Up */}
                <button
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setShowGame(true);
                      setIsTransitioning(false);
                    }, 400);
                  }}
                  className="group relative px-10 py-5 text-2xl font-black text-yellow-400 bg-gradient-to-br from-red-600 via-red-700 to-black rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(220,20,60,0.9)] active:scale-95 border-2 border-red-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-800 to-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <span>LET&apos;S PLAY!</span>
                  </div>
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400"></div>
                </button>
                
                {/* How to Play Section - Compact Grid with Professional Numbers */}
                <div className="w-full max-w-xl bg-black/60 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-black text-red-400 mb-4 text-center">HOW TO PLAY</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 flex items-center justify-center shadow-[0_0_10px_rgba(220,20,60,0.5)]">
                        <span className="text-white font-black text-sm">1</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">Select Bet</p>
                        <p className="text-gray-400 text-xs">Choose bet level (0.0015-0.3 ETH)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 flex items-center justify-center shadow-[0_0_10px_rgba(220,20,60,0.5)]">
                        <span className="text-white font-black text-sm">2</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">Find Opponent</p>
                        <p className="text-gray-400 text-xs">Auto-match with same bet level</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 flex items-center justify-center shadow-[0_0_10px_rgba(220,20,60,0.5)]">
                        <span className="text-white font-black text-sm">3</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">Make Choice</p>
                        <p className="text-gray-400 text-xs">Rock 🪨 Paper 📄 Scissors ✂️ (20s)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 flex items-center justify-center shadow-[0_0_10px_rgba(220,20,60,0.5)]">
                        <span className="text-white font-black text-sm">4</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">Win or Lose</p>
                        <p className="text-gray-400 text-xs">Winner takes the pot!</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Stats - Compact */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  <div className="bg-red-900/20 backdrop-blur-sm px-4 py-2 rounded border border-red-500/30">
                    <p className="text-red-400 text-xs font-bold">⚡ INSTANT</p>
                  </div>
                  <div className="bg-yellow-900/20 backdrop-blur-sm px-4 py-2 rounded border border-yellow-500/30">
                    <p className="text-yellow-400 text-xs font-bold">💰 WIN ETH</p>
                  </div>
                  <div className="bg-gray-900/20 backdrop-blur-sm px-4 py-2 rounded border border-gray-500/30">
                    <p className="text-gray-300 text-xs font-bold">🔒 SECURE</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {showMatchFound && (
                  <MatchFoundAnimation 
                    player1Address={player1Address}
                    player2Address={player2Address}
                    currentUserAddress={address}
                    onClose={() => {
                      console.log('[Home] 🎮 Match Found animation closed, starting game');
                      setShowMatchFound(false);
                      setGameState('playing'); // Start game when animation closes
                    }}
                  />
                )}
                {/* Hide other content when Match Found animation is showing */}
                {!showMatchFound && !isTransitioning && (
                  <>
                    {gameState === 'select' && (
                      <div className="w-full animate-fade-in-up">
                        <BetSelector onSelect={handleBetSelect} />
                      </div>
                    )}
                    
                    {gameState === 'matching' && selectedBet && (
                      <div className="w-full animate-scale-in -mt-8 sm:-mt-12 md:-mt-16">
                        <MatchmakingOffChain 
                          betAmount={selectedBet} 
                          onMatchFound={handleMatchFound}
                          onCancel={handleCancelMatchmaking}
                          showMatchFound={showMatchFound}
                        />
                      </div>
                    )}
                    
                    {gameState === 'playing' && selectedBet && gameId && (
                      <div className="w-full animate-rotate-scale-in">
                        <GameBoard 
                          betAmount={selectedBet}
                          gameId={gameId}
                          onGameEnd={handleGameEnd}
                        />
                      </div>
                    )}
                    
                    {gameState === 'result' && (
                      <div className="w-full animate-fade-in-up">
                        <Result onPlayAgain={handlePlayAgain} onTieRematch={handleTieRematch} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>
          </main>
          
          {/* Debug Panel - Always visible for mobile debugging */}
          <DebugPanel />
          </>
  );
}
