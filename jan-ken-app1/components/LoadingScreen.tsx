'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export function LoadingScreen({ message = 'Loading...', subMessage }: LoadingScreenProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      {/* Japanese Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-red-950 opacity-80 animate-gradient-shift"></div>
      
      {/* Japanese Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,20,60,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(220,20,60,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Japanese Mon (Family Crest) - Spinning */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 animate-spin-slow">
            <div className="w-full h-full rounded-full border-8 border-red-500 flex items-center justify-center">
              <div className="text-6xl animate-pulse">⚔️</div>
            </div>
          </div>
          <div className="absolute inset-0 animate-lantern-glow">
            <div className="w-full h-full rounded-full border-4 border-yellow-400 opacity-50"></div>
          </div>
        </div>
        
        {/* Loading text - Japanese */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl sm:text-4xl font-black text-red-400 animate-neon-flicker" style={{
            textShadow: '0 0 20px rgba(220,20,60,0.8), 0 0 40px rgba(220,20,60,0.5)'
          }}>
            {message}{dots}
          </h2>
          {subMessage && (
            <p className="text-lg text-yellow-400/80 animate-pulse font-mono">
              {subMessage}
            </p>
          )}
        </div>
        
        {/* Loading bar - Japanese Style */}
        <div className="w-64 h-3 bg-black/60 rounded-full overflow-hidden border-2 border-red-500/50">
          <div className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-full animate-loading-bar"></div>
        </div>
      </div>
      
      {/* Cherry Blossoms */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl animate-cherry-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${5 + Math.random() * 3}s`,
            }}
          >
            🌸
          </div>
        ))}
      </div>
    </div>
  );
}

// Connecting wallet specific loading
export function ConnectingWalletLoader() {
  return (
    <LoadingScreen 
      message="CONNECTING WALLET" 
      subMessage="Please approve in your wallet"
    />
  );
}

// Matching specific loading
export function MatchingLoader() {
  return (
    <LoadingScreen 
      message="FINDING OPPONENT" 
      subMessage="Searching for a worthy challenger"
    />
  );
}

// Transaction loading
export function TransactionLoader() {
  return (
    <LoadingScreen 
      message="PROCESSING" 
      subMessage="Confirming transaction on blockchain"
    />
  );
}

