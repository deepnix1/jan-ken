'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect, useConnectorClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { BetSelector } from '@/components/BetSelector';
import { Matchmaking } from '@/components/Matchmaking';
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
  const [showGame, setShowGame] = useState(false); // For "Let's Play" button
  const [isConnecting, setIsConnecting] = useState(false); // For loading screen
  const [isTransitioning, setIsTransitioning] = useState(false); // For page transitions

  // Call sdk.actions.ready() when interface is ready (per Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/guides/loading
  // "You should call ready as soon as possible while avoiding jitter and content reflows"
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let mounted = true;
    
    // Check if we're in Farcaster Mini App environment
    // On PC (Debug Tool), SDK might be available via window object
    const isFarcasterEnv = () => {
      try {
        // Check if SDK is imported and available
        if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
          return true;
        }
        // Check if SDK is available via window (PC Debug Tool)
        if ((window as any).farcaster?.sdk?.actions?.ready) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };
    
    // Function to call ready() when SDK is available
    const callReady = () => {
      try {
        // Try imported SDK first
        if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
          sdk.actions.ready();
          if (mounted) {
            setAppReady(true);
            console.log('✅ Farcaster SDK ready() called (imported SDK) - splash screen hidden');
          }
          return true;
        }
        
        // Try window SDK (PC Debug Tool)
        if ((window as any).farcaster?.sdk?.actions?.ready) {
          (window as any).farcaster.sdk.actions.ready();
          if (mounted) {
            setAppReady(true);
            console.log('✅ Farcaster SDK ready() called (window SDK) - splash screen hidden');
          }
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
        if (mounted) {
          setAppReady(true);
        }
        return false;
      }
    };
    
    // Try immediately
    if (callReady()) {
      return;
    }
    
    // If SDK not ready, wait for it with polling
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max (100 * 100ms) - longer for PC
    
    const checkSDK = setInterval(() => {
      attempts++;
      
      if (callReady()) {
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
        // SDK not available, continue anyway (PC might not have SDK)
        console.warn('⚠️ Farcaster SDK not available after waiting - continuing anyway (might be PC Debug Tool)');
        if (mounted) {
          setAppReady(true);
        }
      }
    }, 100); // Check every 100ms
    
    return () => {
      mounted = false;
      clearInterval(checkSDK);
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      // Reset all game state when wallet disconnects
      setGameState('select');
      setSelectedBet(null);
      setGameId(null);
      setShowMatchFound(false);
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
      if (!connectorClient) {
        console.warn('⚠️ Connected but connector client not available - waiting 2 seconds...');
        const timeout = setTimeout(() => {
          if (!connectorClient) {
            console.error('❌ Connector client still not available after 2 seconds');
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
        }, 2000);
        return () => clearTimeout(timeout);
      } else {
        console.log('✅ Connector client is available:', {
          account: connectorClient.account?.address,
          chain: connectorClient.chain?.id,
          chainName: connectorClient.chain?.name,
        });
      }
    }
  }, [isConnected, address, connectorClient, connectors, connect, disconnect]);

  // Fetch user profile when connected
  useEffect(() => {
    if (address && isConnected) {
      console.log('[Home] 📥 Fetching user profile:', address);
      getFarcasterProfileByAddress(address).then((profile) => {
        console.log('[Home] 📦 User profile received:', profile);
        setUserProfile(profile);
      });
    }
  }, [address, isConnected]);

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
    setShowMatchFound(true);
    setTimeout(() => {
      setGameId(id);
      setGameState('playing');
    }, 2000);
  };

  const handleGameEnd = () => {
    setGameState('result');
  };

  const handlePlayAgain = () => {
    setGameState('select');
    setSelectedBet(null);
    setGameId(null);
    setShowMatchFound(false);
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
    // Return to bet selection
    setGameState('select');
    setSelectedBet(null);
    setShowMatchFound(false);
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
          
          <main className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-yellow-500/10 rounded-full filter blur-3xl animate-pulse animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(34,211,238,0.03)_50%)] bg-[length:100%_4px] animate-scanline"></div>
      </div>

      <div className="relative z-10 min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex flex-col items-center mb-8 sm:mb-12 relative">
            {/* User Profile - Top Right (if connected) */}
            {isConnected && userProfile && (
              <div className="absolute top-0 right-0 flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-cyan-400 font-bold text-sm">
                    {userProfile.username || 'Player'}
                  </span>
                  <span className="text-cyan-400/60 font-mono text-xs">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-cyan-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.6)] bg-gradient-to-br from-cyan-600 to-blue-600">
                    {userProfile.pfpUrl ? (
                      <Image
                        src={userProfile.pfpUrl}
                        alt={userProfile.username || 'You'}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl font-black">
                        {address?.slice(2, 4).toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Logo - Centered and Smaller - Mobile Optimized */}
            <div className="relative w-full max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mb-4 sm:mb-6 md:mb-8 flex justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-blue-500/20 to-yellow-500/20 blur-3xl"></div>
              <div className="relative z-10 flex items-center justify-center w-full" style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.5))' }}>
                <Image
                  src="/new_logo.png"
                  alt="JaN KeN!"
                  width={300}
                  height={100}
                  className="object-contain w-full h-auto"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </header>
          
          {/* Main Content - Mobile Optimized */}
          <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-cyan-400/30 shadow-[0_0_60px_rgba(34,211,238,0.2)] p-4 sm:p-6 md:p-8 lg:p-12 min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-8 py-16">
                  <div className="text-center space-y-4">
                    <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                      CONNECTING...
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-300 text-center max-w-lg font-medium leading-relaxed">
                      Connecting to Farcaster Mini App...
                      <br />
                      <span className="text-gray-400 text-base">Your wallet will connect automatically.</span>
                    </p>
                  </div>
                 {connectError && (
                   <div className="mt-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-lg w-full max-w-md">
                     <p className="text-red-400 text-xs sm:text-sm font-mono">
                       Connection error: {
                         (connectError && typeof connectError === 'object' && 'shortMessage' in connectError) 
                           ? (connectError as any).shortMessage
                           : (connectError && typeof connectError === 'object' && 'message' in connectError)
                           ? (connectError as any).message
                           : (typeof connectError === 'string')
                           ? connectError
                           : 'Unknown error'
                       }
                     </p>
                   </div>
                 )}
              </div>
            ) : !showGame ? (
              /* Let's Play Landing Screen */
              <div className="flex flex-col items-center gap-8 py-16 animate-fade-in-up">
                <div className="text-center space-y-6">
                  <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse">
                    READY TO BATTLE?
                  </h2>
                  <p className="text-xl sm:text-2xl text-gray-300 font-bold">
                    Rock • Paper • Scissors
                  </p>
                  <p className="text-lg text-gray-400 max-w-md">
                    Challenge players on Base Network and win ETH!
                  </p>
                </div>
                
                {/* Button Group */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Let's Play Button */}
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setShowGame(true);
                        setIsTransitioning(false);
                      }, 400);
                    }}
                    className="group relative px-12 py-6 text-3xl font-black text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-[0_0_60px_rgba(239,68,68,1)] active:scale-95 animate-scale-in"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center gap-4">
                      <span className="text-5xl">🎮</span>
                      <span>LET&apos;S PLAY!</span>
                    </div>
                    
                    {/* Animated border */}
                    <div className="absolute inset-0 rounded-2xl border-4 border-white/50 animate-pulse"></div>
                  </button>
                  
                  {/* Connect Wallet Button (if not connected) */}
                  {!isConnected && (
                    <button
                      onClick={handleConnect}
                      disabled={isPending}
                      className="group relative px-8 py-4 text-xl font-bold text-cyan-400 bg-black/60 backdrop-blur-lg rounded-xl border-2 border-cyan-400/50 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:border-cyan-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed animate-scale-in animation-delay-200"
                    >
                      <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center gap-3">
                        <span className="text-2xl">👛</span>
                        <span>{isPending ? 'CONNECTING...' : 'CONNECT WALLET'}</span>
                      </div>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-cyan-500/30"></div>
                    </button>
                  )}
                </div>
                
                {/* Stats or Info */}
                <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-in-up animation-delay-400">
                  <div className="bg-cyan-500/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-cyan-400/30 hover:border-cyan-400 transition-all duration-300 hover:scale-105 cursor-pointer">
                    <p className="text-cyan-400 text-sm font-mono">⚡ Instant Matches</p>
                  </div>
                  <div className="bg-yellow-500/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-yellow-400/30 hover:border-yellow-400 transition-all duration-300 hover:scale-105 cursor-pointer">
                    <p className="text-yellow-400 text-sm font-mono">💰 Win ETH</p>
                  </div>
                  <div className="bg-purple-500/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-purple-400/30 hover:border-purple-400 transition-all duration-300 hover:scale-105 cursor-pointer">
                    <p className="text-purple-400 text-sm font-mono">🔒 Secure</p>
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
                  />
                )}
                {!isTransitioning && (
                  <>
                    {gameState === 'select' && (
                      <div className="w-full animate-fade-in-up">
                        <BetSelector onSelect={handleBetSelect} />
                      </div>
                    )}
                    
                    {gameState === 'matching' && selectedBet && (
                      <div className="w-full animate-scale-in">
                        <Matchmaking 
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
          </main>
          
          {/* Debug Panel - Always visible for mobile debugging */}
          <DebugPanel />
          </>
        );
      }
