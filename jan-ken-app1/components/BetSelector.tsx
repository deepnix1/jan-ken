'use client';

import { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import { getEthPrice } from '@/lib/ethPrice';

// Contract'taki sabit BET_LEVEL'lar (RockPaperScissors.sol)
// Bu değerler contract'taki BET_LEVEL_1-6 ile tam olarak eşleşmeli!
const CONTRACT_BET_LEVELS = [
  { level: 1, eth: '0.0015', emoji: '💵', color: 'from-green-500 to-emerald-600' }, // BET_LEVEL_1 = 0.0015 ether
  { level: 2, eth: '0.003', emoji: '💶', color: 'from-blue-500 to-cyan-600' },    // BET_LEVEL_2 = 0.003 ether
  { level: 3, eth: '0.015', emoji: '💷', color: 'from-purple-500 to-pink-600' },   // BET_LEVEL_3 = 0.015 ether
  { level: 4, eth: '0.03', emoji: '💴', color: 'from-orange-500 to-red-600' },   // BET_LEVEL_4 = 0.03 ether
  { level: 5, eth: '0.15', emoji: '💰', color: 'from-yellow-500 to-amber-600' },   // BET_LEVEL_5 = 0.15 ether
  { level: 6, eth: '0.3', emoji: '💎', color: 'from-indigo-500 to-violet-600' },   // BET_LEVEL_6 = 0.3 ether
];

interface BetSelectorProps {
  onSelect: (betAmount: bigint) => void;
}

export function BetSelector({ onSelect }: BetSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch ETH price on mount and update every minute (for display only)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const priceData = await getEthPrice();
        setEthPrice(priceData.price);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        setEthPrice(3000); // Fallback price
        setLoading(false);
      }
    };

    fetchPrice();
    
    // Update price every minute
    const interval = setInterval(fetchPrice, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (level: number, ethAmount: string) => {
    // Wallet connection is enforced at page level
    setSelectedLevel(level);
    // Use contract's exact bet level (must match contract BET_LEVEL_1-6)
    const betAmount = parseEther(ethAmount);
    onSelect(betAmount);
  };

  // Use contract's fixed bet levels (must match contract BET_LEVEL_1-6 exactly)
  // Calculate USD equivalent for display only
  const betLevels = CONTRACT_BET_LEVELS.map((bet) => {
    const ethAmount = parseFloat(bet.eth);
    const usdAmount = ethPrice ? (ethAmount * ethPrice).toFixed(2) : '...';
    return {
      ...bet,
      amount: bet.eth, // Use contract's exact ETH amount
      label: ethPrice ? `$${usdAmount}` : `~$${usdAmount}`,
      eth: `${bet.eth} ETH`,
    };
  });

  const getGamingColor = (level: number) => {
    // Japanese/Logo-inspired colors: Red, Blue, Yellow/Orange, Purple, Yellow, Indigo
    const colors = [
      'from-red-500/20 to-pink-600/20 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
      'from-blue-500/20 to-cyan-600/20 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]',
      'from-yellow-500/20 to-orange-600/20 border-yellow-500/40 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]',
      'from-purple-500/20 to-pink-600/20 border-purple-500/40 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
      'from-yellow-500/20 to-amber-600/20 border-yellow-500/40 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]',
      'from-indigo-500/20 to-violet-600/20 border-indigo-500/40 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]',
    ];
    return colors[level - 1] || colors[0];
  };

  return (
    <div className="w-full relative z-20">
      <div className="text-center mb-4 sm:mb-6 md:mb-8 relative z-10">
        <h2 
          className="text-xl sm:text-2xl md:text-3xl font-black mb-2 sm:mb-3 relative z-10"
          style={{
            background: 'linear-gradient(to right, #f87171, #60a5fa, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 30px rgba(239, 68, 68, 0.8)',
            filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.8))',
          }}
        >
          SELECT BET
        </h2>
        <p className="text-gray-300 text-xs sm:text-sm font-mono uppercase tracking-wider px-4 relative z-10 font-bold">
          Winner Takes All
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {betLevels.map((bet, index) => {
          const isSelected = selectedLevel === bet.level;
          const isDisabled = selectedLevel !== null && !isSelected;
          
          return (
            <button
              key={bet.level}
              onClick={() => handleSelect(bet.level, bet.amount)}
              disabled={isDisabled || loading || !ethPrice}
              className={`group relative overflow-hidden rounded-lg p-4 sm:p-5 md:p-6 transition-all-smooth transform animate-fade-in-up ${
                isSelected
                  ? 'scale-105 shadow-[0_0_40px_rgba(34,211,238,0.6)] border-2 border-cyan-400 animate-glow-pulse-strong'
                  : isDisabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:scale-110 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-95 cursor-pointer'
              } bg-gradient-to-br ${getGamingColor(bet.level)} border-2 bg-black/40 backdrop-blur-sm`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Corner Accents */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-current opacity-50"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-current opacity-50"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-current opacity-50"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-current opacity-50"></div>
              
              {/* Glow Effect */}
              {isSelected && (
                <div className="absolute inset-0 bg-cyan-400/10 blur-xl"></div>
              )}
              
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform drop-shadow-[0_0_20px_currentColor]">
                  {bet.emoji}
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-black mb-1 sm:mb-2 drop-shadow-[0_0_10px_currentColor] break-words">
                  {bet.label}
                </div>
                <div className="text-xs sm:text-sm md:text-base font-mono font-semibold opacity-90 break-words">
                  {bet.eth}
                </div>
              </div>
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.05)_50%)] bg-[length:100%_4px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          );
        })}
      </div>
      
      {selectedLevel && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-black/60 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
            <p className="text-red-400 font-mono font-bold text-lg uppercase tracking-wider">
              Searching for opponent...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

