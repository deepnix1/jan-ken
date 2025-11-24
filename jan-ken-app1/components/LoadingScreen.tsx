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
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-red-900 opacity-50 animate-gradient-shift"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse-slow"></div>
      
      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Spinning shuriken */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 animate-spin-slow">
            <svg width="128" height="128" viewBox="0 0 24 24" className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,1)]">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute inset-0 animate-spin-reverse opacity-50">
            <svg width="128" height="128" viewBox="0 0 24 24" className="text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,1)]">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            {message}{dots}
          </h2>
          {subMessage && (
            <p className="text-lg text-gray-400 animate-pulse">
              {subMessage}
            </p>
          )}
        </div>
        
        {/* Loading bar */}
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full animate-loading-bar"></div>
        </div>
      </div>
      
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
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

