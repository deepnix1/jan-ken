'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useConnectorClient, useChainId } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';

interface DebugIssue {
  id: string;
  title: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface TransactionLog {
  id: string;
  type: 'writeContract' | 'readContract' | 'wallet' | 'error' | 'info';
  message: string;
  timestamp: string;
  data?: any;
  error?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<DebugIssue[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'issues' | 'transactions' | 'wallet' | 'contract'>('issues');
  const { address, isConnected, connector } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const chainId = useChainId();
  const logsRef = useRef<TransactionLog[]>([]);
  const writeContractCallsRef = useRef<Array<{ timestamp: string; params: any; result?: any; error?: any }>>([]);

  // Intercept console.log for transaction monitoring
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const logStr = args.join(' ');
      
      // Track writeContract calls
      if (logStr.includes('writeContract') || logStr.includes('[useCommitReveal]') || logStr.includes('[createMatch]') || logStr.includes('[joinMatch]') || logStr.includes('[sendCommitTx]') || logStr.includes('[sendRevealTx]')) {
        const log: TransactionLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          type: 'writeContract',
          message: logStr,
          timestamp: new Date().toISOString(),
          data: args.length > 1 ? args.slice(1) : undefined,
        };
        logsRef.current.push(log);
        if (logsRef.current.length > 100) logsRef.current.shift();
        setTransactionLogs([...logsRef.current]);
      }

      // Track transaction hash
      if (logStr.includes('Transaction hash') || logStr.includes('hash:') || logStr.includes('txHash')) {
        const hashMatch = logStr.match(/0x[a-fA-F0-9]{64}/);
        if (hashMatch) {
          addIssue({
            id: 'tx-hash-received',
            title: 'Transaction Hash Received',
            status: 'ok',
            message: `Hash: ${hashMatch[0].slice(0, 10)}...${hashMatch[0].slice(-8)}`,
            details: { hash: hashMatch[0] },
          });
        }
      }

      // Track wallet popup related logs
      if (logStr.includes('wallet popup') || logStr.includes('popup') || logStr.includes('CALLING writeContract')) {
        addIssue({
          id: 'wallet-popup-attempt',
          title: 'Wallet Popup Attempt',
          status: 'warning',
          message: logStr,
          details: { timestamp: new Date().toISOString() },
        });
      }

      // Track Farcaster SDK
      if (logStr.includes('[Farcaster]') || logStr.includes('Farcaster SDK')) {
        if (logStr.includes('✅')) {
          removeIssue('farcaster-error');
        } else if (logStr.includes('❌')) {
          addIssue({
            id: 'farcaster-error',
            title: 'Farcaster SDK Error',
            status: 'error',
            message: logStr,
          });
        }
      }
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const errorStr = args.join(' ');
      
      // Serialize error objects properly
      const serializedError = args.map(arg => {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
          }
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.parse(JSON.stringify(arg, (key, value) => {
              // Handle BigInt and other non-serializable values
              if (typeof value === 'bigint') {
                return value.toString()
              }
              return value
            }))
          } catch {
            return String(arg)
          }
        }
        return arg
      })
      
      const log: TransactionLog = {
        id: `error-${Date.now()}-${Math.random()}`,
        type: 'error',
        message: errorStr,
        timestamp: new Date().toISOString(),
        error: serializedError,
      };
      logsRef.current.push(log);
      if (logsRef.current.length > 100) logsRef.current.shift();
      setTransactionLogs([...logsRef.current]);

      // Parse common errors
      if (errorStr.includes('User rejected') || errorStr.includes('user rejected') || errorStr.includes('User denied')) {
        addIssue({
          id: 'user-rejected',
          title: 'User Rejected Transaction',
          status: 'warning',
          message: 'User rejected the transaction in wallet',
        });
      } else if (errorStr.includes('insufficient funds') || errorStr.includes('Insufficient funds')) {
        addIssue({
          id: 'insufficient-funds',
          title: 'Insufficient Funds',
          status: 'error',
          message: 'Not enough ETH to complete transaction',
        });
      } else if (errorStr.includes('network') || errorStr.includes('Network')) {
        addIssue({
          id: 'network-error',
          title: 'Network Error',
          status: 'error',
          message: errorStr,
        });
      } else if (errorStr.includes('writeContract') || errorStr.includes('transaction')) {
        addIssue({
          id: 'transaction-error',
          title: 'Transaction Error',
          status: 'error',
          message: errorStr,
          details: { error: args },
        });
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const warnStr = args.join(' ');
      
      if (warnStr.includes('wallet') || warnStr.includes('connector') || warnStr.includes('transaction')) {
        addIssue({
          id: `warn-${Date.now()}`,
          title: 'Warning',
          status: 'warning',
          message: warnStr,
        });
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Monitor wallet connection state
  useEffect(() => {
    const walletIssues: DebugIssue[] = [];

    if (!isConnected) {
      walletIssues.push({
        id: 'wallet-disconnected',
        title: 'Wallet Not Connected',
        status: 'error',
        message: 'Please connect your wallet to use the app',
        timestamp: new Date().toISOString(),
      });
    } else {
      walletIssues.push({
        id: 'wallet-connected',
        title: 'Wallet Connected',
        status: 'ok',
        message: `Address: ${address?.slice(0, 6)}...${address?.slice(-4)}`,
        timestamp: new Date().toISOString(),
        details: {
          address,
          connector: connector?.name || 'Unknown',
          chainId,
        },
      });

      // Check connector client
      if (!connectorClient) {
        walletIssues.push({
          id: 'connector-client-missing',
          title: 'Connector Client Missing',
          status: 'error',
          message: 'Wallet connected but connector client not available. Transactions may fail.',
          timestamp: new Date().toISOString(),
        });
      } else {
        walletIssues.push({
          id: 'connector-client-ok',
          title: 'Connector Client Ready',
          status: 'ok',
          message: `Account: ${connectorClient.account?.address?.slice(0, 6)}...${connectorClient.account?.address?.slice(-4)}`,
          timestamp: new Date().toISOString(),
          details: {
            account: connectorClient.account?.address,
            chain: connectorClient.chain?.name,
            chainId: connectorClient.chain?.id,
          },
        });
      }

      // Check chain
      if (chainId !== 84532) {
        walletIssues.push({
          id: 'wrong-chain',
          title: 'Wrong Network',
          status: 'error',
          message: `Connected to chain ${chainId}, but Base Sepolia (84532) is required`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update wallet-related issues
    setIssues(prev => {
      const filtered = prev.filter(i => !i.id.startsWith('wallet-') && !i.id.startsWith('connector-') && i.id !== 'wrong-chain');
      return [...filtered, ...walletIssues];
    });
  }, [isConnected, address, connector, connectorClient, chainId]);

  // Monitor contract interactions
  useEffect(() => {
    // Check if contract address is configured
    if (!CONTRACT_ADDRESS) {
      addIssue({
        id: 'contract-address-missing',
        title: 'Contract Address Missing',
        status: 'error',
        message: 'CONTRACT_ADDRESS is not configured',
      });
    } else {
      removeIssue('contract-address-missing');
    }
  }, []);

  // Monitor queue status (if using old contract)
  const { data: queueCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWaitingPlayersCount',
    args: address ? [BigInt(1500000000000000)] : undefined,
    query: {
      enabled: isConnected && !!address && !!CONTRACT_ADDRESS,
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    if (queueCount !== undefined && isConnected) {
      const count = Number(queueCount);
      if (count >= 2) {
        addIssue({
          id: 'queue-stuck',
          title: 'Matchmaking Issue',
          status: 'error',
          message: `${count} players in queue but no match!`,
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
  }, [queueCount, isConnected]);

  // Intercept writeContract calls globally
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monitor for writeContract calls
    const checkInterval = setInterval(() => {
      // This will be populated by console.log interception above
    }, 1000);

    return () => clearInterval(checkInterval);
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

  const clearLogs = () => {
    logsRef.current = [];
    setTransactionLogs([]);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Copied to clipboard!');
    } catch (err) {
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
      `[${issue.status.toUpperCase()}] ${issue.title}\n${issue.message}\n${issue.details ? JSON.stringify(issue.details, null, 2) : ''}\nTime: ${new Date(issue.timestamp).toLocaleString()}\n`
    ).join('\n---\n\n');
    
    const summary = `
JAN-KEN DEBUG REPORT
Generated: ${new Date().toLocaleString()}
Wallet: ${address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
Connector: ${connector?.name || 'N/A'}
Chain ID: ${chainId}
Connector Client: ${connectorClient ? 'Available' : 'Missing'}
Total Issues: ${issues.length}
Errors: ${issues.filter(i => i.status === 'error').length}
Warnings: ${issues.filter(i => i.status === 'warning').length}

${text}

TRANSACTION LOGS:
${transactionLogs.slice(-20).map(log => `[${log.type.toUpperCase()}] ${log.message}\nTime: ${new Date(log.timestamp).toLocaleString()}\n`).join('\n---\n')}
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

  const getLogTypeColor = (type: TransactionLog['type']) => {
    switch (type) {
      case 'writeContract': return 'text-blue-400 border-blue-500 bg-blue-500/10';
      case 'readContract': return 'text-purple-400 border-purple-500 bg-purple-500/10';
      case 'wallet': return 'text-cyan-400 border-cyan-500 bg-cyan-500/10';
      case 'error': return 'text-red-400 border-red-500 bg-red-500/10';
      case 'info': return 'text-gray-400 border-gray-500 bg-gray-500/10';
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
        <div className="fixed bottom-20 right-4 z-[9999] w-[600px] max-w-[calc(100vw-2rem)] max-h-[80vh] bg-black/95 border-2 border-purple-500 rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
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
                onClick={() => {
                  clearIssues();
                  clearLogs();
                }}
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

          {/* Tabs */}
          <div className="flex border-b border-purple-700 bg-purple-900/30 flex-shrink-0">
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'issues' 
                  ? 'bg-purple-600 text-white border-b-2 border-white' 
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Issues ({issues.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'transactions' 
                  ? 'bg-purple-600 text-white border-b-2 border-white' 
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Transactions ({transactionLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'wallet' 
                  ? 'bg-purple-600 text-white border-b-2 border-white' 
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('contract')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'contract' 
                  ? 'bg-purple-600 text-white border-b-2 border-white' 
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Contract
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4">
            {activeTab === 'issues' && (
              <div className="space-y-2">
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
                              onClick={() => copyToClipboard(`[${issue.status.toUpperCase()}] ${issue.title}\n${issue.message}\n${issue.details ? JSON.stringify(issue.details, null, 2) : ''}\nTime: ${new Date(issue.timestamp).toLocaleString()}`)}
                              className="text-xs opacity-60 hover:opacity-100 flex-shrink-0"
                              title="Copy this issue"
                            >
                              📋
                            </button>
                          </div>
                          <p className="text-xs mt-1 opacity-90 break-words">{issue.message}</p>
                          {issue.details && (
                            <details className="mt-2">
                              <summary className="text-xs opacity-60 cursor-pointer">Details</summary>
                              <pre className="text-xs mt-1 opacity-80 overflow-auto max-h-32">
                                {JSON.stringify(issue.details, null, 2)}
                              </pre>
                            </details>
                          )}
                          <p className="text-xs mt-1 opacity-60">
                            {new Date(issue.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-2">
                {transactionLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No transaction logs yet</p>
                  </div>
                ) : (
                  transactionLogs.slice().reverse().map((log) => (
                    <div
                      key={log.id}
                      className={`border-2 rounded-lg p-3 ${getLogTypeColor(log.type)}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold flex-shrink-0">[{log.type}]</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs break-words">{log.message}</p>
                          {log.data && (
                            <details className="mt-1">
                              <summary className="text-xs opacity-60 cursor-pointer">Data</summary>
                              <pre className="text-xs mt-1 opacity-80 overflow-auto max-h-32">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                          {log.error && (
                            <details className="mt-1">
                              <summary className="text-xs opacity-60 cursor-pointer text-red-400">Error</summary>
                              <pre className="text-xs mt-1 opacity-80 overflow-auto max-h-32 text-red-300">
                                {JSON.stringify(log.error, null, 2)}
                              </pre>
                            </details>
                          )}
                          <p className="text-xs mt-1 opacity-60">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="space-y-4">
                <div className="border-2 border-purple-500 rounded-lg p-4">
                  <h4 className="font-bold text-sm mb-3 text-purple-300">Connection Status</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">Connected:</span>
                      <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                        {isConnected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {address && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Address:</span>
                        <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="opacity-60">Connector:</span>
                      <span>{connector?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Chain ID:</span>
                      <span>{chainId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Chain Name:</span>
                      <span>{chainId === 84532 ? 'Base Sepolia' : 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-purple-500 rounded-lg p-4">
                  <h4 className="font-bold text-sm mb-3 text-purple-300">Connector Client</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">Available:</span>
                      <span className={connectorClient ? 'text-green-400' : 'text-red-400'}>
                        {connectorClient ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {connectorClient?.account && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Account:</span>
                        <span className="font-mono">{connectorClient.account.address.slice(0, 10)}...{connectorClient.account.address.slice(-8)}</span>
                      </div>
                    )}
                    {connectorClient?.chain && (
                      <>
                        <div className="flex justify-between">
                          <span className="opacity-60">Chain:</span>
                          <span>{connectorClient.chain.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-60">Chain ID:</span>
                          <span>{connectorClient.chain.id}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contract' && (
              <div className="space-y-4">
                <div className="border-2 border-purple-500 rounded-lg p-4">
                  <h4 className="font-bold text-sm mb-3 text-purple-300">Contract Configuration</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">Address:</span>
                      <span className="font-mono">{CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 10)}...${CONTRACT_ADDRESS.slice(-8)}` : 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Queue Count:</span>
                      <span>{queueCount !== undefined ? Number(queueCount) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-purple-500 rounded-lg p-4">
                  <h4 className="font-bold text-sm mb-3 text-purple-300">Supabase Configuration</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">URL:</span>
                      <span className="font-mono text-[10px] break-all">
                        {process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Key Exists:</span>
                      <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-400' : 'text-red-400'}>
                        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Key Length:</span>
                      <span>{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const { testSupabaseConnection } = await import('@/lib/supabaseTest')
                        const result = await testSupabaseConnection()
                        if (result.success) {
                          addIssue({
                            id: 'supabase-test-ok',
                            title: 'Supabase Connection Test',
                            status: 'ok',
                            message: 'Connection test successful!',
                            details: result.details,
                          })
                        } else {
                          addIssue({
                            id: 'supabase-test-fail',
                            title: 'Supabase Connection Test Failed',
                            status: 'error',
                            message: result.error || 'Connection test failed',
                            details: result.details,
                          })
                        }
                      }}
                      className="mt-2 w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded"
                    >
                      Test Supabase Connection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-purple-900/50 px-4 py-2 text-xs text-gray-400 border-t border-purple-700 flex-shrink-0">
            <p>💡 Tip: Check browser console (F12) for detailed logs</p>
            <p className="mt-1">🔄 Auto-refreshing every 5 seconds</p>
          </div>
        </div>
      )}
    </>
  );
}
