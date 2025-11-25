'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface WinnerAnimationProps {
  winnerProfile?: { pfpUrl: string | null; username: string | null } | null;
  winnerAddress?: string;
  prize?: string;
  onComplete?: () => void;
}

export function WinnerAnimation({ winnerProfile, winnerAddress, prize, onComplete }: WinnerAnimationProps) {
  const [fireworks, setFireworks] = useState<Array<{ id: number; left: string; delay: string }>>([]);

  useEffect(() => {
    // Generate random fireworks
    const newFireworks = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
    }));
    setFireworks(newFireworks);

    // Auto-complete after 5 seconds
    if (onComplete) {
      const timer = setTimeout(onComplete, 5000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-yellow-900 via-orange-900 to-red-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Fireworks */}
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute bottom-0 w-2 h-2 bg-yellow-400 rounded-full animate-firework"
          style={{
            left: fw.left,
            animationDelay: fw.delay,
          }}
        />
      ))}

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="absolute w-3 h-3 animate-sakura-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
            }}
          />
        ))}
      </div>

      {/* Winner content */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-win-text">
        {/* Trophy */}
        <div className="text-9xl animate-prize-bounce drop-shadow-[0_0_40px_rgba(251,191,36,1)]">
          🏆
        </div>

        {/* Winner text */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_0_30px_rgba(251,191,36,1)] animate-pulse">
          YOU WIN!
        </h1>

        {/* Winner profile */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.8)] bg-gradient-to-br from-yellow-500 to-orange-500">
            {winnerProfile?.pfpUrl ? (
              <Image
                src={winnerProfile.pfpUrl}
                alt={winnerProfile.username || 'Winner'}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-5xl font-black">
                {winnerAddress?.slice(2, 4).toUpperCase() || '🎉'}
              </div>
            )}
          </div>

          <p className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,1)]">
            {winnerProfile?.username || 'CHAMPION'}
          </p>
        </div>

        {/* Prize */}
        {prize && (
          <div className="bg-yellow-500/20 backdrop-blur-sm px-8 py-4 rounded-2xl border-2 border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <p className="text-4xl font-black text-yellow-400">
              +{prize} ETH
            </p>
          </div>
        )}

        {/* Celebration messages */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-2xl font-bold text-white/90 animate-pulse">
            ✨ LEGENDARY VICTORY ✨
          </p>
          <p className="text-lg text-white/70">
            The ultimate Jan-Ken warrior!
          </p>
        </div>
      </div>

      {/* Sparkles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}


