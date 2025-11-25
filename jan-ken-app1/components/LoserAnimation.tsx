'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface LoserAnimationProps {
  loserProfile?: { pfpUrl: string | null; username: string | null } | null;
  loserAddress?: string;
  onComplete?: () => void;
}

export function LoserAnimation({ loserProfile, loserAddress, onComplete }: LoserAnimationProps) {
  useEffect(() => {
    // Auto-complete after 4 seconds
    if (onComplete) {
      const timer = setTimeout(onComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Dark clouds */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`cloud-${i}`}
            className="absolute w-32 h-32 bg-black/20 rounded-full blur-3xl animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${4 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Rain effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`rain-${i}`}
            className="absolute w-0.5 h-20 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-sakura-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Loser content */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-lose-text">
        {/* Broken heart */}
        <div className="text-9xl animate-bounce-slow drop-shadow-[0_0_40px_rgba(59,130,246,1)]">
          💔
        </div>

        {/* You Lose text */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-[0_0_30px_rgba(59,130,246,1)] animate-pulse-slow">
          YOU LOSE
        </h1>

        {/* Loser profile */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 rounded-full border-4 border-blue-400 overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.8)] bg-gradient-to-br from-blue-600 to-purple-600 opacity-70">
            {loserProfile?.pfpUrl ? (
              <Image
                src={loserProfile.pfpUrl}
                alt={loserProfile.username || 'You'}
                fill
                className="object-cover grayscale"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-5xl font-black">
                {loserAddress?.slice(2, 4).toUpperCase() || '😢'}
              </div>
            )}
          </div>

          <p className="text-3xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,1)]">
            {loserProfile?.username || 'PLAYER'}
          </p>
        </div>

        {/* Consolation messages */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-2xl font-bold text-white/90">
            Better luck next time!
          </p>
          <p className="text-lg text-white/70">
            The way of the warrior continues...
          </p>
        </div>

        {/* Try again button hint */}
        <div className="mt-6 px-8 py-3 bg-blue-500/20 backdrop-blur-sm rounded-full border-2 border-blue-400 animate-pulse">
          <p className="text-xl font-bold text-blue-300">
            🎮 Ready for a rematch?
          </p>
        </div>
      </div>

      {/* Falling tears */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`tear-${i}`}
            className="absolute text-4xl animate-sakura-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 10}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            💧
          </div>
        ))}
      </div>
    </div>
  );
}



