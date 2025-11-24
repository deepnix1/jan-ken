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
      
      {/* Loading content - Compact */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Spinning Circle - Smaller */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 animate-spin-slow">
            <div className="w-full h-full rounded-full border-4 border-red-500 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-red-400 border-t-transparent"></div>
            </div>
          </div>
        </div>
        
        {/* Loading text - Compact */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-red-400" style={{
            textShadow: '0 0 10px rgba(220,20,60,0.6)'
          }}>
            {message}{dots}
          </h2>
          {subMessage && (
            <p className="text-sm text-yellow-400/80 animate-pulse font-mono">
              {subMessage}
            </p>
          )}
        </div>
        
        {/* Loading bar - Smaller */}
        <div className="w-48 h-2 bg-black/60 rounded-full overflow-hidden border border-red-500/50">
          <div className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-full animate-loading-bar"></div>
        </div>
      </div>
      
      {/* Subtle Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-red-400/30 rounded-full animate-float"
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

