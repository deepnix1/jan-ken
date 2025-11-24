'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';

interface VSScreenProps {
  player1Address?: string;
  player2Address?: string;
  currentUserAddress?: string;
  onComplete: () => void;
}

export function VSScreen({ player1Address, player2Address, currentUserAddress, onComplete }: VSScreenProps) {
  const [player1Profile, setPlayer1Profile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [showVS, setShowVS] = useState(false);

  // Determine who is who
  const isPlayer1 = currentUserAddress?.toLowerCase() === player1Address?.toLowerCase();
  const currentUserProfile = isPlayer1 ? player1Profile : player2Profile;
  const opponentProfile = isPlayer1 ? player2Profile : player1Profile;
  const opponentAddress = isPlayer1 ? player2Address : player1Address;

  useEffect(() => {
    // Fetch profiles
    const fetchProfiles = async () => {
      if (player1Address) {
        const p1 = await getFarcasterProfileByAddress(player1Address);
        setPlayer1Profile(p1);
      }
      if (player2Address) {
        const p2 = await getFarcasterProfileByAddress(player2Address);
        setPlayer2Profile(p2);
      }
    };
    
    fetchProfiles();
  }, [player1Address, player2Address]);

  useEffect(() => {
    // Show VS animation
    const timer = setTimeout(() => {
      setShowVS(true);
    }, 500);

    // Complete after 2.5 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-red-900 animate-gradient-shift"></div>
      
      {/* Lightning effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-0 animate-lightning-1"></div>
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-0 animate-lightning-2"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl px-4 flex items-center justify-between">
        {/* Current User - Left */}
        <div className="flex flex-col items-center gap-4 animate-slide-in-left">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-blue-500 blur-2xl opacity-50 animate-pulse"></div>
            
            {/* Profile picture */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border-4 sm:border-6 border-blue-500 overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.8)] bg-gradient-to-br from-blue-600 to-cyan-600">
              {currentUserProfile?.pfpUrl ? (
                <Image
                  src={currentUserProfile.pfpUrl}
                  alt={currentUserProfile.username || 'You'}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-5xl sm:text-6xl md:text-7xl font-black">
                  {currentUserAddress?.slice(2, 4).toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
          
          {/* Username */}
          <div className="bg-blue-500/20 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-blue-500">
            <p className="text-white font-black text-xl sm:text-2xl md:text-3xl text-center">
              {currentUserProfile?.username || 'YOU'}
            </p>
          </div>
        </div>

        {/* VS Animation - Center */}
        <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${showVS ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="relative">
            {/* Rotating ring */}
            <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-spin-slow"></div>
            <div className="absolute inset-2 rounded-full border-4 border-red-400 animate-spin-reverse"></div>
            
            {/* VS Text */}
            <div className="relative bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 text-white w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_60px_rgba(234,179,8,1)] animate-pulse-intense">
              <span className="text-5xl sm:text-6xl md:text-7xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">VS</span>
            </div>
          </div>
          
          {/* Sparks */}
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-spark-1"></div>
            <div className="w-3 h-3 bg-red-400 rounded-full animate-spark-2"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-spark-3"></div>
          </div>
        </div>

        {/* Opponent - Right */}
        <div className="flex flex-col items-center gap-4 animate-slide-in-right">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-red-500 blur-2xl opacity-50 animate-pulse"></div>
            
            {/* Profile picture */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border-4 sm:border-6 border-red-500 overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.8)] bg-gradient-to-br from-red-600 to-pink-600">
              {opponentProfile?.pfpUrl ? (
                <Image
                  src={opponentProfile.pfpUrl}
                  alt={opponentProfile.username || 'Opponent'}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-5xl sm:text-6xl md:text-7xl font-black">
                  {opponentAddress?.slice(2, 4).toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
          
          {/* Username */}
          <div className="bg-red-500/20 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-red-500">
            <p className="text-white font-black text-xl sm:text-2xl md:text-3xl text-center">
              {opponentProfile?.username || 'OPPONENT'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

