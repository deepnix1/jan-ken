'use client';

import { useEffect, useRef, useState } from 'react';
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';
import Image from 'next/image';

interface MatchFoundAnimationProps {
  player1Address?: string;
  player2Address?: string;
  currentUserAddress?: string;
}

export function MatchFoundAnimation({ player1Address, player2Address, currentUserAddress }: MatchFoundAnimationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showAnimation, setShowAnimation] = useState(true);
  const [opponentProfile, setOpponentProfile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);

  // Determine opponent address
  const opponentAddress = currentUserAddress 
    ? (player1Address?.toLowerCase() === currentUserAddress.toLowerCase() ? player2Address : player1Address)
    : (player1Address || player2Address);

  useEffect(() => {
    // Fetch opponent profile
    const fetchProfiles = async () => {
      if (opponentAddress) {
        const opponentProfile = await getFarcasterProfileByAddress(opponentAddress);
        setOpponentProfile(opponentProfile);
      }
      
      // Fetch current user profile
      if (currentUserAddress) {
        const userProfile = await getFarcasterProfileByAddress(currentUserAddress);
        setCurrentUserProfile(userProfile);
      }
    };
    
    fetchProfiles();
  }, [player1Address, player2Address, currentUserAddress, opponentAddress]);

  useEffect(() => {
    // Play sound effect
    const playSound = () => {
      try {
        // Create a simple sound effect using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a "whoosh" sound effect (like shuriken)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log('Audio playback not available:', error);
      }
    };

    playSound();
    
    // Hide animation after 2.5 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Background overlay with glow */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-pulse"></div>
      
      {/* Main animation container */}
      <div className="relative animate-match-found">
        <div className="relative bg-gradient-to-br from-red-500/90 via-blue-500/90 to-yellow-500/90 text-white px-12 py-10 rounded-3xl shadow-2xl border-4 border-white/50 backdrop-blur-xl animate-glow-pulse">
          {/* Decorative corner elements */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-white/80"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-white/80"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-white/80"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-white/80"></div>
          
          {/* Shuriken animation */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-shuriken-spin">
            <svg width="40" height="40" viewBox="0 0 24 24" className="text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,1)]">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
          
          {/* Katana slash effect */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-0 w-20 h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-katana-slash opacity-60"></div>
          </div>
          
          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* Title with glow effect */}
            <h3 className="text-4xl sm:text-5xl font-black mb-2 text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
              <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent">
                MATCH FOUND!
              </span>
            </h3>
            
            {/* Player profiles - side by side */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-2">
              {/* Current User Profile */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/80 overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.8)] bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  {currentUserProfile?.pfpUrl ? (
                    <Image
                      src={currentUserProfile.pfpUrl}
                      alt={currentUserProfile.username || 'You'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl sm:text-3xl font-black">
                      {currentUserAddress?.slice(2, 4).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <p className="text-white/90 font-bold text-xs sm:text-sm text-center max-w-[80px] sm:max-w-[100px] truncate">
                  {currentUserProfile?.username || 'You'}
                </p>
              </div>
              
              {/* VS Divider */}
              <div className="text-white/80 font-black text-2xl sm:text-3xl">VS</div>
              
              {/* Opponent Profile */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/80 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.8)] bg-gradient-to-br from-red-500/20 to-pink-500/20">
                  {opponentProfile?.pfpUrl ? (
                    <Image
                      src={opponentProfile.pfpUrl}
                      alt={opponentProfile.username || 'Opponent'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 text-white text-2xl sm:text-3xl font-black">
                      {opponentAddress?.slice(2, 4).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <p className="text-white/90 font-bold text-xs sm:text-sm text-center max-w-[80px] sm:max-w-[100px] truncate">
                  {opponentProfile?.username || 'Opponent'}
                </p>
              </div>
            </div>
            
            {/* Subtitle */}
            <p className="text-white/90 font-bold text-lg sm:text-xl text-center">
              Opponent Ready
            </p>
            
            {/* Countdown */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
              <span className="text-white/80 font-mono text-sm">Game starting in 2 seconds...</span>
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
            </div>
            
            {/* Kunai animation */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 animate-kunai-throw">
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,1)]">
                <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" fill="currentColor" />
              </svg>
            </div>
          </div>
          
          {/* Glow rings */}
          <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-pulse"></div>
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-red-500/20 via-blue-500/20 to-yellow-500/20 blur-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

