'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';

interface DebugIssue {
  id: string;
  title: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<DebugIssue[]>([]);
  const { address, isConnected } = useAccount();

  // Monitor wallet connection
  useEffect(() => {
    if (!isConnected) {
      addIssue({
        id: 'wallet',
        title: 'Wallet Not Connected',
        status: 'error',
        message: 'Please connect your wallet to use the app',
      });
    } else {
      removeIssue('wallet');
      addIssue({
        id: 'wallet-ok',
        title: 'Wallet Connected',
        status: 'ok',
        message: `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`,
      });
    }
  }, [isConnected, address]);

  // Monitor queue status
  const { data: queueCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWaitingPlayersCount',
    args: address ? [BigInt(1500000000000000)] : undefined, // Default bet level
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 3000,
    },
  });

  useEffect(() => {
    if (queueCount !== undefined) {
      const count = Number(queueCount);
      if (count >= 2) {
        addIssue({
          id: 'queue-stuck',
          title: 'Matchmaking Issue',
          status: 'error',
          message: `${count} players in queue but no match! Check console for "🎮 GameCreated" events.`,
        });
      } else if (count === 1) {
        addIssue({
          id: 'queue-waiting',
          title: 'Waiting for Opponent',
          status: 'warning',
          message: `You're in queue (${count} player). Waiting for another player...`,
        });
      } else {
        removeIssue('queue-stuck');
        removeIssue('queue-waiting');
      }
    }
  }, [queueCount]);

  // Monitor console errors for specific issues
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError(...args);
      
      const errorStr = args.join(' ');
      
      // Check for Farcaster profile issues
      if (errorStr.includes('[Farcaster]') && errorStr.includes('❌')) {
        addIssue({
          id: 'farcaster',
          title: 'Farcaster Profile Failed',
          status: 'error',
          message: 'Failed to load profile pictures. Check console for "[Farcaster]" logs.',
        });
      }
      
      // Check for match found animation issues
      if (errorStr.includes('MatchFoundAnimation') || errorStr.includes('animation')) {
        addIssue({
          id: 'animation',
          title: 'Animation Issue',
          status: 'error',
          message: 'Match Found animation may be off-screen. Check if z-index and positioning are correct.',
        });
      }
      
      // Check for text overflow issues
      if (errorStr.includes('overflow') || errorStr.includes('Scissors')) {
        addIssue({
          id: 'text-overflow',
          title: 'Text Overflow',
          status: 'warning',
          message: 'Button text may be overflowing. Check "Scissors" button in game.',
        });
      }
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);

  // Monitor console logs for Farcaster success
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog(...args);
      
      const logStr = args.join(' ');
      
      // Check for Farcaster success
      if (logStr.includes('[Farcaster]') && logStr.includes('✅')) {
        removeIssue('farcaster');
      }
      
      // Check for match found
      if (logStr.includes('🎮') && logStr.includes('MATCH FOUND')) {
        removeIssue('queue-stuck');
        removeIssue('queue-waiting');
        addIssue({
          id: 'match-found',
          title: 'Match Found!',
          status: 'ok',
          message: 'Game matched successfully. Check if animation appears centered on screen.',
        });
      }
    };
    
    return () => {
      console.log = originalLog;
    };
  }, []);

  const addIssue = (issue: Omit<DebugIssue, 'timestamp'>) => {
    setIssues(prev => {
      const existing = prev.find(i => i.id === issue.id);
      if (existing) {
        return prev.map(i => i.id === issue.id ? { ...issue, timestamp: new Date().toISOString() } : i);
      }
      return [...prev, { ...issue, timestamp: new Date().toISOString() }];
    });
  };

  const removeIssue = (id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  };

  const clearIssues = () => {
    setIssues([]);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Copied to clipboard!');
    }
  };

  const copyAllIssues = () => {
    const text = issues.map(issue => 
      `[${issue.status.toUpperCase()}] ${issue.title}\n${issue.message}\nTime: ${new Date(issue.timestamp).toLocaleString()}\n`
    ).join('\n---\n\n');
    
    const summary = `
JAN-KEN DEBUG REPORT
Generated: ${new Date().toLocaleString()}
Wallet: ${address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
Total Issues: ${issues.length}
Errors: ${issues.filter(i => i.status === 'error').length}
Warnings: ${issues.filter(i => i.status === 'warning').length}

${text}
    `.trim();
    
    copyToClipboard(summary);
  };

  const getStatusColor = (status: DebugIssue['status']) => {
    switch (status) {
      case 'ok': return 'text-green-400 border-green-500 bg-green-500/10';
      case 'warning': return 'text-yellow-400 border-yellow-500 bg-yellow-500/10';
      case 'error': return 'text-red-400 border-red-500 bg-red-500/10';
    }
  };

  const getStatusEmoji = (status: DebugIssue['status']) => {
    switch (status) {
      case 'ok': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9998] w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg flex items-center justify-center transition-all"
        title="Debug Panel"
      >
        {issues.filter(i => i.status === 'error').length > 0 ? (
          <span className="text-2xl animate-pulse">🐛</span>
        ) : (
          <span className="text-2xl">🔧</span>
        )}
        {issues.filter(i => i.status === 'error').length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-bounce">
            {issues.filter(i => i.status === 'error').length}
          </span>
        )}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] max-h-[70vh] bg-black/95 border-2 border-purple-500 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔧</span>
              <h3 className="text-white font-black">Debug Panel</h3>
              {issues.length > 0 && (
                <span className="bg-purple-800 text-white text-xs px-2 py-1 rounded-full">
                  {issues.length}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {issues.length > 0 && (
                <button
                  onClick={copyAllIssues}
                  className="text-white/80 hover:text-white text-xs px-2 py-1 bg-purple-700 rounded flex items-center gap-1"
                  title="Copy all issues"
                >
                  📋 Copy
                </button>
              )}
              <button
                onClick={clearIssues}
                className="text-white/80 hover:text-white text-xs px-2 py-1 bg-purple-700 rounded"
                title="Clear all"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white text-lg leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Issues List */}
          <div className="overflow-y-auto max-h-[calc(70vh-4rem)] p-4 space-y-2">
            {issues.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-400 text-lg">✅</p>
                <p className="text-gray-400 text-sm mt-2">No issues detected</p>
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`border-2 rounded-lg p-3 ${getStatusColor(issue.status)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{getStatusEmoji(issue.status)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm flex-1">{issue.title}</h4>
                        <button
                          onClick={() => copyToClipboard(`[${issue.status.toUpperCase()}] ${issue.title}\n${issue.message}\nTime: ${new Date(issue.timestamp).toLocaleString()}`)}
                          className="text-xs opacity-60 hover:opacity-100 flex-shrink-0"
                          title="Copy this issue"
                        >
                          📋
                        </button>
                      </div>
                      <p className="text-xs mt-1 opacity-90 break-words">{issue.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(issue.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-purple-900/50 px-4 py-2 text-xs text-gray-400 border-t border-purple-700">
            <p>💡 Tip: Check browser console (F12) for detailed logs</p>
          </div>
        </div>
      )}
    </>
  );
}
