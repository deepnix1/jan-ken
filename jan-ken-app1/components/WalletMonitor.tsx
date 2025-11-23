/**
 * Wallet Transaction Monitor Component
 * 
 * Monitors transactions from a specific wallet address
 */

'use client';

import { useEffect, useState } from 'react';
import {
  getWalletTransactions,
  monitorWalletTransaction,
  getWalletBalance,
  WalletMonitor as WalletMonitorClass,
  type WalletTransaction,
} from '@/lib/walletMonitor';
import { formatEther } from 'viem';

const MONITORED_ADDRESS = '0x24e741834c689B57e777D2403175fEF5559980d8' as `0x${string}`;

export function WalletMonitor() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitor, setMonitor] = useState<WalletMonitorClass | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const result = await getWalletTransactions(MONITORED_ADDRESS, 50);
      if (result.success && result.transactions) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const result = await getWalletBalance(MONITORED_ADDRESS);
      if (result.success) {
        setBalance(result.balanceEth);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const startMonitoring = () => {
    if (monitor && monitor.isActive()) {
      monitor.stop();
      setIsMonitoring(false);
      return;
    }

    const newMonitor = new WalletMonitorClass(MONITORED_ADDRESS);
    newMonitor.start((tx) => {
      console.log('🆕 New transaction detected:', tx);
      setTransactions((prev) => [tx, ...prev].slice(0, 50));
    }, 3000); // Poll every 3 seconds

    setMonitor(newMonitor);
    setIsMonitoring(true);
  };

  const verifyTx = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      alert('Please enter a valid transaction hash');
      return;
    }

    setIsLoading(true);
    try {
      const result = await monitorWalletTransaction(txHash as `0x${string}`);
      if (result.success && result.transactions) {
        setTransactions((prev) => {
          const existing = prev.find((t) => t.hash === txHash);
          if (existing) return prev;
          return [result.transactions![0], ...prev].slice(0, 50);
        });
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadBalance();
    
    // Refresh every 5 seconds (more frequent for better monitoring)
    const interval = setInterval(() => {
      loadTransactions();
      loadBalance();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (monitor) {
        monitor.stop();
      }
    };
  }, []);

  // Auto-refresh when monitoring is active
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        loadTransactions();
        loadBalance();
      }, 3000); // Even more frequent when monitoring
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  return (
    <div className="fixed bottom-4 left-4 w-[500px] max-h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-lg border-2 border-purple-400/50 rounded-lg p-4 shadow-[0_0_30px_rgba(168,85,247,0.4)] z-50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-purple-400">Wallet Monitor</h3>
          <div className="text-xs text-gray-400 font-mono mt-1">
            {MONITORED_ADDRESS.slice(0, 10)}...{MONITORED_ADDRESS.slice(-8)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('🔄 Check Now button clicked - loading transactions...');
              loadTransactions();
              loadBalance();
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500/30 border-2 border-purple-400 rounded-lg text-purple-300 font-bold text-sm hover:bg-purple-500/40 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all"
          >
            {isLoading ? '⏳ Loading...' : '🔄 Check Now'}
          </button>
          <button
            onClick={startMonitoring}
            className={`px-4 py-2 border-2 rounded-lg text-sm font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all ${
              isMonitoring
                ? 'bg-red-500/30 border-red-400 text-red-300 hover:bg-red-500/40 hover:border-red-300'
                : 'bg-green-500/30 border-green-400 text-green-300 hover:bg-green-500/40 hover:border-green-300'
            }`}
          >
            {isMonitoring ? '⏹️ Stop' : '▶️ Monitor'}
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded">
        <div className="text-sm font-mono text-purple-300">
          Balance: <span className="text-purple-400 font-bold">{balance} ETH</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {transactions.length} transactions found
        </div>
        {transactions.length > 0 && transactions[0].isContractCall && (
          <div className="text-xs text-green-400 mt-2 font-bold">
            ✅ Latest transaction sent to contract!
          </div>
        )}
      </div>

      <div className="border-t border-purple-400/30 pt-4 mb-4">
        <h4 className="text-sm font-bold text-purple-400 mb-2">Verify Transaction</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="flex-1 px-2 py-1 bg-black/50 border border-purple-400/50 rounded text-purple-400 text-xs font-mono"
          />
          <button
            onClick={verifyTx}
            disabled={isLoading || !txHash}
            className="px-3 py-1 bg-purple-500/20 border border-purple-400 rounded text-purple-400 text-xs hover:bg-purple-500/30 disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-purple-400">Recent Transactions</h4>
        {transactions.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No transactions found</div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.hash}
              className={`p-3 rounded border ${
                tx.isContractCall
                  ? 'bg-green-500/10 border-green-400/30'
                  : 'bg-gray-500/10 border-gray-400/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-xs font-mono text-purple-300 break-all">
                    {tx.hash.slice(0, 20)}...
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Block: {tx.blockNumber.toString()}
                  </div>
                </div>
                <div className={`text-xs font-bold ${
                  tx.status === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {tx.status === 'success' ? '✅' : '❌'}
                </div>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <div>
                  Value: <span className="text-purple-300">{formatEther(tx.value)} ETH</span>
                </div>
                <div>
                  Gas: <span className="text-purple-300">{tx.gasUsed.toString()}</span>
                </div>
                {tx.isContractCall && (
                  <div className="text-green-400 font-bold">
                    ✓ Contract Call: {tx.contractAddress?.slice(0, 10)}...
                  </div>
                )}
                <div>
                  <a
                    href={`https://sepolia.basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    View on BaseScan
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

