'use client';

import { useEffect, useRef, useState } from 'react';
import { getFarcasterProfileByAddress } from '@/lib/farcasterProfile';
import Image from 'next/image';

interface MatchFoundAnimationProps {
  player1Address?: string;
  player2Address?: string;
  currentUserAddress?: string;
  onClose?: () => void;
}

export function MatchFoundAnimation({ player1Address, player2Address, currentUserAddress, onClose }: MatchFoundAnimationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasShownRef = useRef(false); // Prevent multiple renders
  const [showAnimation, setShowAnimation] = useState(false); // Start hidden - wait for profiles
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [opponentProfile, setOpponentProfile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ pfpUrl: string | null; username: string | null } | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState({ opponent: false, user: false });
  const [countdown, setCountdown] = useState(5); // Countdown from 5 to 0

  // Determine opponent address
  const opponentAddress = currentUserAddress 
    ? (player1Address?.toLowerCase() === currentUserAddress.toLowerCase() ? player2Address : player1Address)
    : (player1Address || player2Address);

  // Prevent multiple instances
  useEffect(() => {
    if (hasShownRef.current) {
      console.log('[MatchFound] ⚠️ Animation already shown, hiding duplicate');
      setShowAnimation(false);
      return;
    }
  }, []);

  useEffect(() => {
    // Fetch profiles - CRITICAL: Don't show animation until profiles are loaded
    const fetchProfiles = async () => {
      console.log('[MatchFound] 🔍 Fetching profiles...');
      console.log('[MatchFound] Opponent address:', opponentAddress);
      console.log('[MatchFound] Current user address:', currentUserAddress);
      
      setIsLoadingProfiles(true);
      
      // Timeout: Show animation after 8 seconds even if images aren't loaded
      const timeoutId = setTimeout(() => {
        console.warn('[MatchFound] ⏱️ Image loading timeout (8s), showing animation with fallback data');
        setIsLoadingProfiles(false);
        setImagesLoaded({ opponent: true, user: true }); // Force mark as loaded
        setShowAnimation(true);
        hasShownRef.current = true;
      }, 8000);
      
      try {
        // Fetch both profiles in parallel
        const [opponentData, userData] = await Promise.all([
          opponentAddress ? getFarcasterProfileByAddress(opponentAddress) : Promise.resolve({ pfpUrl: null, username: null }),
          currentUserAddress ? getFarcasterProfileByAddress(currentUserAddress) : Promise.resolve({ pfpUrl: null, username: null })
        ]);
        
        clearTimeout(timeoutId); // Clear timeout if profiles loaded successfully
        
        console.log('[MatchFound] 📦 Opponent profile received:', opponentData);
        console.log('[MatchFound] 📦 Current user profile received:', userData);
        
        setOpponentProfile(opponentData);
        setCurrentUserProfile(userData);
        
        // Check if we have profile data (username + pfpUrl)
        const hasOpponentData = opponentData && (opponentData.username || opponentData.pfpUrl);
        const hasUserData = userData && (userData.username || userData.pfpUrl);
        
        // If no images to load, show immediately
        if (!opponentData?.pfpUrl && !userData?.pfpUrl) {
          console.log('[MatchFound] ✅ Profiles loaded (no images), showing animation');
          setIsLoadingProfiles(false);
          setShowAnimation(true);
          hasShownRef.current = true;
        } else {
          // Wait for images to load - they will trigger onLoad handlers
          console.log('[MatchFound] ⏳ Waiting for images to load...');
          setIsLoadingProfiles(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[MatchFound] ❌ Error fetching profiles:', error);
        // Show animation anyway with fallback data
        setIsLoadingProfiles(false);
        setShowAnimation(true);
        hasShownRef.current = true;
      }
    };
    
    fetchProfiles();
  }, [player1Address, player2Address, currentUserAddress, opponentAddress]);

  // Check if all images are loaded
  useEffect(() => {
    const opponentHasImage = opponentProfile?.pfpUrl;
    const userHasImage = currentUserProfile?.pfpUrl;
    
    // If no images to load, mark as loaded
    if (!opponentHasImage && !userHasImage) {
      setImagesLoaded({ opponent: true, user: true });
      return;
    }
    
    // Check if both images that need to load are loaded
    const opponentLoaded = !opponentHasImage || imagesLoaded.opponent;
    const userLoaded = !userHasImage || imagesLoaded.user;
    
    if (opponentLoaded && userLoaded && !showAnimation) {
      console.log('[MatchFound] ✅ All images loaded, showing animation');
      setIsLoadingProfiles(false);
      setShowAnimation(true);
      hasShownRef.current = true;
    }
  }, [imagesLoaded, opponentProfile, currentUserProfile, showAnimation]);

  // Countdown timer effect - Fixed to prevent stuttering
  useEffect(() => {
    if (!showAnimation) return;
    
    // Play sound effect when animation starts
    const playSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
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
    
    // Reset countdown to 5 when animation starts
    setCountdown(5);
    
    // Countdown timer: decrement every second using a stable interval
    let intervalId: NodeJS.Timeout | null = null;
    
    // Use a ref to track if we should continue counting
    let shouldContinue = true;
    
    const startCountdown = () => {
      intervalId = setInterval(() => {
        if (!shouldContinue) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        
        setCountdown((prev) => {
          if (prev <= 1) {
            shouldContinue = false;
            if (intervalId) clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };
    
    // Start countdown after a small delay to ensure state is ready
    const timeoutId = setTimeout(() => {
      startCountdown();
    }, 100);

    return () => {
      shouldContinue = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [showAnimation]); // Only depend on showAnimation

  // When countdown reaches 0, close animation
  useEffect(() => {
    if (countdown === 0 && showAnimation) {
      console.log('[MatchFound] ⏱️ Countdown reached 0, closing animation');
      setShowAnimation(false);
      if (onClose) {
        onClose();
      }
    }
  }, [countdown, showAnimation, onClose]);

  // Show loading state while profiles are being fetched
  if (isLoadingProfiles) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/80 font-mono text-sm">Loading opponent profile...</p>
        </div>
      </div>
    );
  }

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-auto">
      {/* Background overlay with glow - Full screen blocking */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
      
      {/* Main animation container - FORCE CENTER with proper scrolling */}
      <div className="relative w-full max-w-lg mx-auto my-auto" style={{ minHeight: 'fit-content' }}>
        <div className="relative bg-gradient-to-br from-red-500/90 via-blue-500/90 to-yellow-500/90 text-white px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-white/50 backdrop-blur-xl animate-pulse-slow">
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
          
          {/* Main content - FORCE CENTER */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 sm:gap-3">
            {/* Title with glow effect */}
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] mb-1">
              <span className="bg-gradient-to-r from-red-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent">
                MATCH FOUND!
              </span>
            </h3>
            
            {/* Player profiles - side by side - FORCE CENTER */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 mb-1 sm:mb-2">
              {/* Current User Profile */}
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-white/80 overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.8)] bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  {currentUserProfile?.pfpUrl ? (
                    <Image
                      src={currentUserProfile.pfpUrl}
                      alt={currentUserProfile.username || 'You'}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        console.error('[MatchFound] ❌ Failed to load current user image:', currentUserProfile.pfpUrl);
                        e.currentTarget.style.display = 'none';
                        // Mark as loaded even on error (so animation can show)
                        setImagesLoaded(prev => ({ ...prev, user: true }));
                      }}
                      onLoad={() => {
                        console.log('[MatchFound] ✅ Current user image loaded:', currentUserProfile.pfpUrl);
                        setImagesLoaded(prev => ({ ...prev, user: true }));
                      }}
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
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-white/80 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.8)] bg-gradient-to-br from-red-500/20 to-pink-500/20">
                  {opponentProfile?.pfpUrl ? (
                    <Image
                      src={opponentProfile.pfpUrl}
                      alt={opponentProfile.username || 'Opponent'}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        console.error('[MatchFound] ❌ Failed to load opponent image:', opponentProfile.pfpUrl);
                        e.currentTarget.style.display = 'none';
                        // Mark as loaded even on error (so animation can show)
                        setImagesLoaded(prev => ({ ...prev, opponent: true }));
                      }}
                      onLoad={() => {
                        console.log('[MatchFound] ✅ Opponent image loaded:', opponentProfile.pfpUrl);
                        setImagesLoaded(prev => ({ ...prev, opponent: true }));
                      }}
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
            <p className="text-white/90 font-bold text-sm sm:text-base md:text-lg text-center mb-1">
              Opponent Ready
            </p>
            
            {/* Countdown - FORCE CENTER */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="text-6xl sm:text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)] animate-pulse">
                {countdown}
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                <span className="text-white/80 font-mono text-xs sm:text-sm text-center">
                  Game starting in {countdown} second{countdown !== 1 ? 's' : ''}...
                </span>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
              </div>
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

