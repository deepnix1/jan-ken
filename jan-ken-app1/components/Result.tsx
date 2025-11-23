'use client';

import { useEffect, useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';

interface ResultProps {
  onPlayAgain: () => void;
  onTieRematch?: () => void; // For automatic rematch on tie
}

export function Result({ onPlayAgain, onTieRematch }: ResultProps) {
  const { address } = useAccount();
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | 'loading'>('loading');
  const [prize, setPrize] = useState<string>('0');
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string; tx: number; ty: number }>>([]);
  const [sakura, setSakura] = useState<Array<{ id: number; x: number; delay: number; duration: number }>>([]);

  const { data: gameData } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getMyGame',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    // PRODUCTION MODE: Check contract data only
    if (!address || !gameData) {
      setResult('loading');
      return;
    }

    if (Array.isArray(gameData) && gameData.length > 0) {
      const winner = gameData[8]; // winner field (address or address(0) for tie)
      const status = gameData[5]; // status field (GameStatus enum)
      const betAmount = gameData[2]; // betAmount field (wei)
      const player1Choice = gameData[3]; // Choice enum
      const player2Choice = gameData[4]; // Choice enum

      // Status: 0=Waiting, 1=Matched, 2=InProgress, 3=Finished, 4=Cancelled
      if (status === 3) {
        // Game Finished
        if (winner && winner !== '0x0000000000000000000000000000000000000000') {
          // There is a winner
          if (winner.toLowerCase() === address.toLowerCase()) {
            // Player won
            setResult('win');
            setPrize((Number(betAmount) * 2 / 1e18).toFixed(4));
            
              // Create fireworks - spread from center
              const newFireworks: Array<{ id: number; x: number; y: number; color: string; tx: number; ty: number }> = [];
              const colors = ['#ff0066', '#00ffff', '#ffaa00', '#ff0066', '#00ffff', '#ff00ff', '#00ff00'];
              const centerX = 50;
              const centerY = 50;
              for (let i = 0; i < 80; i++) {
                const angle = (Math.PI * 2 * i) / 80;
                const distance = 30 + Math.random() * 40;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                newFireworks.push({
                  id: i,
                  x: centerX,
                  y: centerY,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  tx: tx,
                  ty: ty,
                });
              }
              setFireworks(newFireworks);
            
            // Create sakura petals
            const newSakura: Array<{ id: number; x: number; delay: number; duration: number }> = [];
            for (let i = 0; i < 30; i++) {
              newSakura.push({
                id: i,
                x: Math.random() * 100,
                delay: Math.random() * 5,
                duration: 3 + Math.random() * 4,
              });
            }
            setSakura(newSakura);
          } else {
            // Player lost
            setResult('lose');
          }
        } else {
          // Tie (winner is address(0))
          setResult('tie');
          // Auto rematch after 3 seconds
          if (onTieRematch) {
            setTimeout(() => {
              onTieRematch();
            }, 3000);
          }
        }
      } else if (status === 4) {
        // Cancelled
        setResult('tie');
        if (onTieRematch) {
          setTimeout(() => {
            onTieRematch();
          }, 3000);
        }
      } else if (status === 2 && player1Choice > 0 && player2Choice > 0) {
        // InProgress with both choices - check for tie
        if (player1Choice === player2Choice) {
          // Tie - will be handled by contract, but we can prepare
          setResult('loading');
        } else {
          // Not a tie, wait for contract to finish
          setResult('loading');
        }
      }
    } else {
      setResult('loading');
    }
  }, [gameData, address, onTieRematch]);

  return (
    <div className="w-full text-center py-8 relative overflow-hidden">
      {/* Fireworks Container */}
      {result === 'win' && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {fireworks.map((fw) => (
            <div
              key={fw.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
                backgroundColor: fw.color,
                boxShadow: `0 0 15px ${fw.color}, 0 0 30px ${fw.color}, 0 0 45px ${fw.color}`,
                animation: `firework 1.5s ease-out forwards`,
                animationDelay: `${fw.id * 0.02}s`,
                '--tx': `${fw.tx}vw`,
                '--ty': `${fw.ty}vh`,
              } as React.CSSProperties & { '--tx': string; '--ty': string }}
            />
          ))}
        </div>
      )}

      {/* Sakura Petals Container */}
      {result === 'win' && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {sakura.map((petal) => (
            <div
              key={petal.id}
              className="absolute text-4xl animate-sakura-fall"
              style={{
                left: `${petal.x}%`,
                animationDelay: `${petal.delay}s`,
                animationDuration: `${petal.duration}s`,
              }}
            >
              🌸
            </div>
          ))}
        </div>
      )}

      {result === 'loading' && (
        <div className="py-16">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
            <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-black/60 border-4 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.6)]">
              <div className="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(239,68,68,1)]"></div>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl text-gray-300 font-mono font-bold uppercase tracking-wider">
            Calculating Results...
          </p>
        </div>
      )}

      {result === 'win' && (
        <div className="relative z-10 animate-fade-in">
          {/* Animated YOU WIN Text */}
          <div className="mb-10">
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-4 sm:mb-6 animate-win-text px-4">
              <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(239,68,68,1)]">
                YOU WIN
              </span>
            </h2>
          </div>
          
          {/* Prize Amount */}
              <div className="inline-flex items-center gap-4 sm:gap-6 px-6 sm:px-8 md:px-12 py-6 sm:py-8 bg-black/80 border-3 sm:border-4 border-yellow-500/60 rounded-xl sm:rounded-2xl shadow-[0_0_60px_rgba(234,179,8,0.8)] mb-8 sm:mb-12 animate-prize-bounce mx-4">
                <span className="text-4xl sm:text-5xl md:text-6xl animate-bounce">💰</span>
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 font-mono uppercase tracking-wider mb-1 sm:mb-2">Prize Won</p>
                  <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-yellow-400 font-mono drop-shadow-[0_0_30px_rgba(234,179,8,1)]">
                    {prize} ETH
                  </p>
                </div>
              </div>
          
          <button
            onClick={onPlayAgain}
            className="relative px-12 py-6 bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500 text-black font-black rounded-lg hover:from-red-400 hover:via-blue-400 hover:to-yellow-400 transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:shadow-[0_0_60px_rgba(239,68,68,0.8)] text-xl uppercase tracking-wider border-2 border-red-400/50 z-10"
          >
            <span className="relative z-10">Play Again</span>
            <div className="absolute inset-0 bg-red-400/20 blur-xl"></div>
          </button>
        </div>
      )}

      {result === 'lose' && (
        <div className="relative z-10 animate-fade-in">
          {/* Animated YOU LOSE Text */}
          <div className="mb-10">
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-4 sm:mb-6 animate-lose-text px-4">
              <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(239,68,68,1)]">
                YOU LOSE
              </span>
            </h2>
          </div>
          
          <p className="text-xl sm:text-2xl text-gray-400 mb-12 font-mono uppercase tracking-wider">
            Better luck next time!
          </p>
          
          <button
            onClick={onPlayAgain}
            className="relative px-12 py-6 bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500 text-black font-black rounded-lg hover:from-red-400 hover:via-blue-400 hover:to-yellow-400 transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:shadow-[0_0_60px_rgba(239,68,68,0.8)] text-xl uppercase tracking-wider border-2 border-red-400/50 z-10"
          >
            <span className="relative z-10">Try Again</span>
            <div className="absolute inset-0 bg-red-400/20 blur-xl"></div>
          </button>
        </div>
      )}

      {result === 'tie' && (
        <div className="relative z-10 animate-fade-in">
          {/* Animated DRAW Text */}
          <div className="mb-10">
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-4 sm:mb-6 animate-draw-text px-4">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(234,179,8,1)]">
                DRAW
              </span>
            </h2>
          </div>
          
          {/* Animated Handshake Icon */}
          <div className="relative mb-10 inline-block">
            <div className="absolute inset-0 bg-yellow-400/30 blur-3xl rounded-full"></div>
            <div className="relative text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-yellow-400 drop-shadow-[0_0_40px_rgba(234,179,8,1)] animate-handshake">
              🤝
            </div>
          </div>
          
          {/* Bet Refunded Message */}
          <div className="inline-flex items-center gap-4 sm:gap-6 px-6 sm:px-8 md:px-12 py-6 sm:py-8 bg-black/80 border-3 sm:border-4 border-yellow-500/60 rounded-xl sm:rounded-2xl shadow-[0_0_60px_rgba(234,179,8,0.8)] mb-8 sm:mb-12 animate-prize-bounce mx-4">
            <span className="text-4xl sm:text-5xl md:text-6xl animate-bounce">💸</span>
            <div>
              <p className="text-xs sm:text-sm text-gray-400 font-mono uppercase tracking-wider mb-1 sm:mb-2">Bet Refunded</p>
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-yellow-400 font-mono font-bold uppercase tracking-wider">
                Rematch in 3 seconds...
              </p>
            </div>
          </div>
          
          {/* Countdown indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
              <p className="text-yellow-400 font-mono font-bold uppercase tracking-wider text-lg">
                Preparing next round...
              </p>
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

