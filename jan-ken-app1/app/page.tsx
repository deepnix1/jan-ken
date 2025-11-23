'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { BetSelector } from '@/components/BetSelector';
import { Matchmaking } from '@/components/Matchmaking';
import { GameBoard } from '@/components/GameBoard';
import { Result } from '@/components/Result';
import { MatchFoundAnimation } from '@/components/MatchFoundAnimation';
import { DebugPanel } from '@/components/DebugPanel';

// Disable SSR for this page (Wagmi doesn't work with SSR)
export const dynamic = 'force-dynamic';

export default function Home() {
  // useAccount automatically watches for account changes in Wagmi v3
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const [gameState, setGameState] = useState<'select' | 'matching' | 'playing' | 'result'>('select');
  const [selectedBet, setSelectedBet] = useState<bigint | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [showMatchFound, setShowMatchFound] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const previousAddressRef = useRef<string | undefined>(undefined);

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
    }
    previousAddressRef.current = address;
  }, [address]);

  const handleConnect = () => {
    if (connectors.length === 0) {
      console.error('No connectors available');
      alert('No wallet connectors available. Please install MetaMask or use Farcaster.');
      return;
    }
    
    // Per Farcaster docs: In Mini Apps, connector automatically connects if user has wallet
    // Try Farcaster Mini App connector first (it should be first in array)
    const farcasterConnector = connectors.find(c => c.name === 'Farcaster Mini App' || c.name?.includes('Farcaster'));
    const connector = farcasterConnector || connectors[0];
    
    // Per Farcaster docs: connect({ connector: connectors[0] })
    connect({ connector });
  };

  const handleBetSelect = (betAmount: bigint) => {
    // Wallet connection is already enforced at page level
    setSelectedBet(betAmount);
    setGameState('matching');
    setShowMatchFound(false);
  };

  const handleMatchFound = (id: string) => {
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
            
            {/* Wallet - Below logo with proper spacing */}
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl"></div>
              <div className="relative bg-black/60 backdrop-blur-lg rounded-full px-4 py-2 border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-cyan-400 font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isPending || connectors.length === 0}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </div>
          </header>
          
          {/* Main Content - Mobile Optimized */}
          <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-cyan-400/30 shadow-[0_0_60px_rgba(34,211,238,0.2)] p-4 sm:p-6 md:p-8 lg:p-12 min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-8 py-16">
                  <div className="text-center space-y-4">
                    <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                      WAITING FOR WALLET
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-300 text-center max-w-lg font-medium leading-relaxed">
                      Please connect your wallet to begin playing Rock Paper Scissors on Base Network.
                      <br />
                      <span className="text-gray-400 text-base">Ensure you&apos;re connected to Base Sepolia network.</span>
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
            ) : (
              <>
                {showMatchFound && (
                  <MatchFoundAnimation />
                )}
                {gameState === 'select' && (
                  <BetSelector onSelect={handleBetSelect} />
                )}
                
                {gameState === 'matching' && selectedBet && (
                  <Matchmaking 
                    betAmount={selectedBet} 
                    onMatchFound={handleMatchFound}
                    onCancel={handleCancelMatchmaking}
                    showMatchFound={showMatchFound}
                  />
                )}
                
                {gameState === 'playing' && selectedBet && gameId && (
                  <GameBoard 
                    betAmount={selectedBet}
                    gameId={gameId}
                    onGameEnd={handleGameEnd}
                  />
                )}
                
                {gameState === 'result' && (
                  <Result onPlayAgain={handlePlayAgain} onTieRematch={handleTieRematch} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
          </main>
          
          {/* Debug Panel - Always visible for mobile debugging */}
          {typeof window !== 'undefined' && <DebugPanel />}
          </>
        );
      }
