'use client';

import { useState, useEffect } from 'react';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { BetSelector } from '@/components/BetSelector';
import { Matchmaking } from '@/components/Matchmaking';
import { GameBoard } from '@/components/GameBoard';
import { Result } from '@/components/Result';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [gameState, setGameState] = useState<'select' | 'matching' | 'playing' | 'result'>('select');
  const [selectedBet, setSelectedBet] = useState<bigint | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setGameState('select');
    }
  }, [isConnected]);

  const handleBetSelect = (betAmount: bigint) => {
    setSelectedBet(betAmount);
    setGameState('matching');
  };

  const handleMatchFound = (id: string) => {
    setGameId(id);
    setGameState('playing');
  };

  const handleGameEnd = () => {
    setGameState('result');
  };

  const handlePlayAgain = () => {
    setGameState('select');
    setSelectedBet(null);
    setGameId(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-6xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🪨📄✂️ Jan KeN!
        </h1>
        
        {!isConnected ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-xl mb-4">Oyunu başlatmak için wallet'ını bağla</p>
            <ConnectWallet />
          </div>
        ) : (
          <>
            {gameState === 'select' && (
              <BetSelector onSelect={handleBetSelect} />
            )}
            
            {gameState === 'matching' && selectedBet && (
              <Matchmaking 
                betAmount={selectedBet} 
                onMatchFound={handleMatchFound}
              />
            )}
            
            {gameState === 'playing' && selectedBet && gameId && (
              <GameBoard 
                betAmount={selectedBet}
                gameId={gameId}
                onGameEnd={handleGameEnd}
              />
            )}
            
            {gameState === 'result' && (
              <Result onPlayAgain={handlePlayAgain} />
            )}
          </>
        )}
      </div>
    </main>
  );
}




