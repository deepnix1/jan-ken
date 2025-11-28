'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { parseEther } from 'viem';

const BET_LEVELS = [
  { level: 1, amount: '0.0015', label: '$5', eth: '0.0015 ETH' },
  { level: 2, amount: '0.003', label: '$10', eth: '0.003 ETH' },
  { level: 3, amount: '0.015', label: '$50', eth: '0.015 ETH' },
  { level: 4, amount: '0.03', label: '$100', eth: '0.03 ETH' },
];

interface BetSelectorProps {
  onSelect: (betAmount: bigint) => void;
}

export function BetSelector({ onSelect }: BetSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const handleSelect = (level: number, amount: string) => {
    setSelectedLevel(level);
    const betAmount = parseEther(amount);
    onSelect(betAmount);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8">Bahis Seviyesi Seç</h2>
      <div className="grid grid-cols-2 gap-4">
        {BET_LEVELS.map((bet) => (
          <button
            key={bet.level}
            onClick={() => handleSelect(bet.level, bet.amount)}
            disabled={selectedLevel !== null}
            className={`p-6 rounded-lg border-2 transition-all ${
              selectedLevel === bet.level
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
            } ${selectedLevel !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-2xl font-bold">{bet.label}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{bet.eth}</div>
          </button>
        ))}
      </div>
      {selectedLevel && (
        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
          Eşleşme aranıyor...
        </p>
      )}
    </div>
  );
}







