/**
 * Debug Panel Component
 * 
 * Shows console logs and transaction status in UI for mobile debugging
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

export function DebugPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const addLog = (level: LogEntry['level'], ...args: any[]): void => {
      // Safely convert arguments to string (avoid BigInt serialization issues)
      const message = args.map(arg => {
        if (arg === null || arg === undefined) {
          return String(arg);
        } else if (typeof arg === 'bigint') {
          return arg.toString();
        } else if (typeof arg === 'object') {
          try {
            // Try to stringify, but handle BigInt and circular references
            return JSON.stringify(arg, (key, value) => {
              if (typeof value === 'bigint') {
                return value.toString() + 'n';
              }
              return value;
            }, 2);
          } catch (e) {
            // If stringify fails (circular reference, BigInt, etc.), use String()
            try {
              return String(arg);
            } catch (e2) {
              return '[Object - could not serialize]';
            }
          }
        } else {
          return String(arg);
        }
      }).join(' ');
      
      setLogs(prev => {
        const newLog: LogEntry = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          level,
          message,
          data: args.length > 1 ? args : undefined,
        };
        return [...prev.slice(-199), newLog]; // Keep last 200 logs (increased for better debugging)
      });
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog('log', ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', ...args);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      addLog('info', ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🐛 Debug Panel button clicked');
          setIsOpen(true);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🐛 Debug Panel button touched');
          setIsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[99999] w-14 h-14 bg-purple-600 border-2 border-purple-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.8)] hover:bg-purple-500 active:bg-purple-700 transition-all cursor-pointer touch-manipulation"
        style={{ 
          position: 'fixed',
          zIndex: 99999,
          pointerEvents: 'auto',
        }}
        title="Open Debug Panel"
        aria-label="Open Debug Panel"
      >
        <span className="text-2xl select-none">🐛</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 w-[90vw] max-w-md max-h-[70vh] bg-black/95 backdrop-blur-lg border-2 border-purple-400/50 rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.4)] z-[99999] flex flex-col"
      style={{ 
        position: 'fixed',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-purple-400/30">
        <div>
          <h3 className="text-sm font-bold text-purple-400">Debug Panel</h3>
          <div className="text-xs text-gray-400 mt-1">
            {address?.slice(0, 6)}...{address?.slice(-4)} | Chain: {chainId} | Logs: {logs.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            className="px-2 py-1 bg-purple-500/20 border border-purple-400 rounded text-purple-300 text-xs hover:bg-purple-500/30"
          >
            Clear
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🐛 Debug Panel close clicked');
              setIsOpen(false);
            }}
            className="px-2 py-1 bg-red-500/20 border border-red-400 rounded text-red-300 text-xs hover:bg-red-500/30 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-2 border-b border-purple-400/30 bg-purple-500/10">
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-300">Connected: {isConnected ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${chainId === 84532 ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-300">Network: {chainId === 84532 ? 'Base Sepolia ✓' : `Chain ${chainId} ✗`}</span>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No logs yet...</div>
        ) : (
          logs.map((log) => {
            // Safely serialize log data for display
            let dataString = '';
            if (log.data) {
              try {
                dataString = JSON.stringify(log.data, (key, value) => {
                  if (typeof value === 'bigint') {
                    return value.toString() + 'n';
                  }
                  return value;
                }, 2);
              } catch (e) {
                dataString = '[Could not serialize data - may contain BigInt or circular references]';
              }
            }
            
            return (
              <div
                key={log.id}
                className={`p-2 rounded border-l-2 ${
                  log.level === 'error' ? 'border-red-400 bg-red-500/10' :
                  log.level === 'warn' ? 'border-yellow-400 bg-yellow-500/10' :
                  log.level === 'info' ? 'border-blue-400 bg-blue-500/10' :
                  'border-gray-400 bg-gray-500/10'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-bold ${getLogColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={`mt-1 break-words ${getLogColor(log.level)} whitespace-pre-wrap`}>
                  {log.message}
                </div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="text-gray-400 text-[10px] cursor-pointer hover:text-gray-300">
                      Details ({Array.isArray(log.data) ? log.data.length : 'Object'})
                    </summary>
                    <pre className="text-[10px] text-gray-500 mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                      {dataString}
                    </pre>
                  </details>
                )}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-purple-400/30 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3"
          />
          Auto-scroll
        </label>
        <button
          onClick={() => {
            try {
              const logText = logs.map(l => {
                let dataText = '';
                if (l.data) {
                  try {
                    dataText = '\n  Data: ' + JSON.stringify(l.data, (key, value) => {
                      if (typeof value === 'bigint') {
                        return value.toString() + 'n';
                      }
                      return value;
                    }, 2);
                  } catch (e) {
                    dataText = '\n  Data: [Could not serialize]';
                  }
                }
                return `[${l.level.toUpperCase()}] ${new Date(l.timestamp).toISOString()}\n${l.message}${dataText}`;
              }).join('\n\n');
              navigator.clipboard.writeText(logText);
              alert(`Copied ${logs.length} logs to clipboard!`);
            } catch (e) {
              console.error('Error copying logs:', e);
              alert('Error copying logs. Please try again.');
            }
          }}
          className="px-2 py-1 bg-purple-500/20 border border-purple-400 rounded text-purple-300 text-xs hover:bg-purple-500/30"
        >
          Copy Logs ({logs.length})
        </button>
      </div>
    </div>
  );
}

