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
  type: 'writeContract' | 'readContract' | 'wallet' | 'error' | 'info' | 'matchmaking';
  message: string;
  timestamp: string;
  data?: any;
  error?: any;
}

interface MatchmakingLog {
  id: string;
  type: 'tryMatch' | 'checkForMatch' | 'joinQueue' | 'leaveQueue' | 'matchFound' | 'error';
  step?: string;
  message: string;
  timestamp: string;
  data?: any;
  error?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<DebugIssue[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [matchmakingLogs, setMatchmakingLogs] = useState<MatchmakingLog[]>([]);
  const [activeTab, setActiveTab] = useState<'issues' | 'transactions' | 'wallet' | 'contract' | 'matchmaking'>('issues');
  const { address, isConnected, connector } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const chainId = useChainId();
  const logsRef = useRef<TransactionLog[]>([]);
  const matchmakingLogsRef = useRef<MatchmakingLog[]>([]);

  // Monitor wallet popup DOM elements - ONLY wallet popup issues
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let popupCheckInterval: NodeJS.Timeout | null = null;
    
    const checkWalletPopup = () => {
      // Check for Farcaster wallet popup elements
      const possibleSelectors = [
        'iframe[src*="farcaster"]',
        'iframe[src*="wallet.farcaster"]',
        'iframe[src*="privy.farcaster"]',
        '[data-farcaster-wallet]',
        '[data-wallet-popup]',
        '.wallet-popup',
        '.farcaster-wallet',
        'div[role="dialog"]',
        '[aria-modal="true"]',
      ];
      
      let popupFound = false;
      let popupElement: HTMLElement | null = null;
      
      for (const selector of possibleSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            popupFound = true;
            popupElement = element as HTMLElement;
            break;
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
      
      // Also check for iframes in general (wallet popups often use iframes)
      if (!popupFound) {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          const src = iframe.getAttribute('src') || '';
          if (src.includes('farcaster') || src.includes('wallet') || src.includes('privy')) {
            popupFound = true;
            popupElement = iframe;
            break;
          }
        }
      }
      
      if (popupFound && popupElement) {
        const rect = popupElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(popupElement);
        const zIndex = computedStyle.zIndex;
        const pointerEvents = computedStyle.pointerEvents;
        const visibility = computedStyle.visibility;
        const display = computedStyle.display;
        const opacity = computedStyle.opacity;
        
        // Check if popup is visible
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         display !== 'none' && 
                         visibility !== 'hidden' && 
                         opacity !== '0';
        
        // Check for overlaying elements
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        const isBlocked = elementAtCenter && !popupElement.contains(elementAtCenter);
        
        // Check for Confirm button
        let confirmButtonFound = false;
        let confirmButtonClickable = false;
        if (popupElement.tagName === 'IFRAME') {
          try {
            const iframeDoc = (popupElement as HTMLIFrameElement).contentDocument || 
                            (popupElement as HTMLIFrameElement).contentWindow?.document;
            if (iframeDoc) {
              const confirmButtons = iframeDoc.querySelectorAll('button, [role="button"], a[href]');
              confirmButtonFound = confirmButtons.length > 0;
              for (const btn of confirmButtons) {
                const btnStyle = iframeDoc.defaultView?.getComputedStyle(btn as Element);
                if (btnStyle && btnStyle.pointerEvents !== 'none' && btnStyle.display !== 'none') {
                  confirmButtonClickable = true;
                  break;
                }
              }
            }
          } catch (e) {
            // Cross-origin iframe - can't access
          }
        } else {
          const confirmButtons = popupElement.querySelectorAll('button, [role="button"], a[href]');
          confirmButtonFound = confirmButtons.length > 0;
          for (const btn of confirmButtons) {
            const btnStyle = window.getComputedStyle(btn as Element);
            if (btnStyle && btnStyle.pointerEvents !== 'none' && btnStyle.display !== 'none') {
              confirmButtonClickable = true;
              break;
            }
          }
        }
        
        // CRITICAL: If popup is blocked, try to fix it automatically
        if (isBlocked && elementAtCenter) {
          // Try to hide blocking element temporarily
          let blockingEl = elementAtCenter as HTMLElement;
          const originalDisplay = blockingEl.style.display;
          const originalPointerEvents = blockingEl.style.pointerEvents;
          const originalZIndex = blockingEl.style.zIndex;
          const originalOpacity = blockingEl.style.opacity;
          
          // Check if it's one of our notification elements
          let isOurNotification = 
            (blockingEl.classList.contains('fixed') || blockingEl.closest('.fixed')) &&
            (blockingEl.classList.contains('z-50') || 
             blockingEl.classList.contains('z-40') || 
             blockingEl.closest('.z-50') || 
             blockingEl.closest('.z-40') ||
             blockingEl.className.includes('z-50') ||
             blockingEl.className.includes('z-40'));
          
          // Also check parent elements
          let parent = blockingEl.parentElement;
          let foundFixedParent = false;
          while (parent && parent !== document.body) {
            const parentClasses = parent.className || '';
            if ((parentClasses.includes('fixed') || parent.classList.contains('fixed')) &&
                (parentClasses.includes('z-50') || parentClasses.includes('z-40') || 
                 parent.classList.contains('z-50') || parent.classList.contains('z-40'))) {
              foundFixedParent = true;
              blockingEl = parent as HTMLElement;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (isOurNotification || foundFixedParent) {
            // Temporarily hide our notification
            blockingEl.style.display = 'none';
            blockingEl.style.pointerEvents = 'none';
            blockingEl.style.zIndex = '-1';
            blockingEl.style.opacity = '0';
            
            // Also hide all fixed elements with z-50 or z-40 that might be overlaying
            const allFixedElements = document.querySelectorAll('.fixed.z-50, .fixed.z-40, [class*="fixed"][class*="z-50"], [class*="fixed"][class*="z-40"]');
            const hiddenElements: Array<{ el: HTMLElement; display: string; pointerEvents: string; zIndex: string; opacity: string }> = [];
            
            allFixedElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const elRect = htmlEl.getBoundingClientRect();
              // Check if this element overlaps with popup
              if (elRect.left < rect.right && elRect.right > rect.left &&
                  elRect.top < rect.bottom && elRect.bottom > rect.top) {
                hiddenElements.push({
                  el: htmlEl,
                  display: htmlEl.style.display,
                  pointerEvents: htmlEl.style.pointerEvents,
                  zIndex: htmlEl.style.zIndex,
                  opacity: htmlEl.style.opacity,
                });
                htmlEl.style.display = 'none';
                htmlEl.style.pointerEvents = 'none';
                htmlEl.style.zIndex = '-1';
                htmlEl.style.opacity = '0';
              }
            });
            
            // Restore after 10 seconds (popup should be closed by then)
            setTimeout(() => {
              blockingEl.style.display = originalDisplay;
              blockingEl.style.pointerEvents = originalPointerEvents;
              blockingEl.style.zIndex = originalZIndex;
              blockingEl.style.opacity = originalOpacity;
              
              // Restore all hidden elements
              hiddenElements.forEach(({ el, display, pointerEvents, zIndex, opacity }) => {
                el.style.display = display;
                el.style.pointerEvents = pointerEvents;
                el.style.zIndex = zIndex;
                el.style.opacity = opacity;
              });
            }, 10000);
            
            addIssue({
              id: 'wallet-popup-blocked-fixed',
              title: '✅ Wallet Popup Blocking Elements Auto-Hidden',
              status: 'ok',
              message: `Automatically hid ${hiddenElements.length + 1} blocking element(s) to allow wallet popup interaction`,
              details: {
                blockingElement: blockingEl.tagName,
                blockingElementClass: blockingEl.className,
                hiddenElementsCount: hiddenElements.length + 1,
                action: 'auto_hidden',
              },
            });
          } else {
            addIssue({
              id: 'wallet-popup-blocked',
              title: '⚠️ Wallet Popup Blocked by Overlay',
              status: 'error',
              message: `Wallet popup is visible but blocked by another element at (${Math.round(centerX)}, ${Math.round(centerY)})`,
              details: {
                popupElement: popupElement.tagName,
                popupZIndex: zIndex,
                popupRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                blockingElement: elementAtCenter?.tagName || 'unknown',
                blockingElementClass: (elementAtCenter as Element)?.className || 'unknown',
                popupPointerEvents: pointerEvents,
                popupVisibility: visibility,
                popupDisplay: display,
                popupOpacity: opacity,
              },
            });
          }
        } else {
          removeIssue('wallet-popup-blocked');
          removeIssue('wallet-popup-blocked-fixed');
        }
        
        if (confirmButtonFound && !confirmButtonClickable) {
          addIssue({
            id: 'wallet-popup-button-not-clickable',
            title: '⚠️ Wallet Popup Button Not Clickable',
            status: 'error',
            message: 'Confirm button found in wallet popup but not clickable (pointer-events: none or display: none)',
            details: {
              popupElement: popupElement.tagName,
              popupZIndex: zIndex,
              popupPointerEvents: pointerEvents,
            },
          });
        } else if (confirmButtonFound && confirmButtonClickable) {
          removeIssue('wallet-popup-button-not-clickable');
        }
        
        // Log popup status
        const log: TransactionLog = {
          id: `popup-${Date.now()}`,
          type: 'wallet',
          message: `Wallet popup detected: visible=${isVisible}, z-index=${zIndex}, blocked=${isBlocked}, buttonClickable=${confirmButtonClickable}`,
          timestamp: new Date().toISOString(),
          data: {
            isVisible,
            zIndex,
            pointerEvents,
            visibility,
            display,
            opacity,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            isBlocked,
            confirmButtonFound,
            confirmButtonClickable,
          },
        };
        logsRef.current.push(log);
        if (logsRef.current.length > 100) logsRef.current.shift();
        setTransactionLogs([...logsRef.current]);
      } else {
        removeIssue('wallet-popup-blocked');
        removeIssue('wallet-popup-button-not-clickable');
      }
    };
    
    // Check immediately
    checkWalletPopup();
    
    // Check every 500ms
    popupCheckInterval = setInterval(checkWalletPopup, 500);
    
    // Also listen for DOM mutations to catch popup when it appears
    const observer = new MutationObserver(() => {
      checkWalletPopup();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    
    return () => {
      if (popupCheckInterval) clearInterval(popupCheckInterval);
      observer.disconnect();
    };
  }, []);
  
  // Intercept console.log for logging only (no issue detection)
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args: any[]) => {
      originalLog(...args);
      const logStr = args.join(' ');
      
      // Track matchmaking logs (for logging only)
      if (logStr.includes('[tryMatch]') || logStr.includes('[checkForMatch]') || logStr.includes('[joinQueue]') || logStr.includes('[leaveQueue]') || logStr.includes('[Matchmaking]')) {
        let logType: MatchmakingLog['type'] = 'error';
        let step: string | undefined;
        
        if (logStr.includes('[tryMatch]')) {
          logType = 'tryMatch';
          if (logStr.includes('Step 1')) step = 'Finding Players';
          else if (logStr.includes('Step 2')) step = 'Verifying Players';
          else if (logStr.includes('Step 3')) step = 'Updating Status';
          else if (logStr.includes('✅')) logType = 'matchFound';
        } else if (logStr.includes('[checkForMatch]')) {
          logType = 'checkForMatch';
        } else if (logStr.includes('[joinQueue]')) {
          logType = 'joinQueue';
        } else if (logStr.includes('[leaveQueue]')) {
          logType = 'leaveQueue';
        }
        
        const matchmakingLog: MatchmakingLog = {
          id: `match-${Date.now()}-${Math.random()}`,
          type: logType,
          step,
          message: logStr,
          timestamp: new Date().toISOString(),
          data: args.length > 1 ? args.slice(1) : undefined,
        };
        
        matchmakingLogsRef.current.push(matchmakingLog);
        if (matchmakingLogsRef.current.length > 200) matchmakingLogsRef.current.shift();
        setMatchmakingLogs([...matchmakingLogsRef.current]);
        
        // Also add to transaction logs for visibility
        const log: TransactionLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          type: 'matchmaking',
          message: logStr,
          timestamp: new Date().toISOString(),
          data: args.length > 1 ? args.slice(1) : undefined,
        };
        logsRef.current.push(log);
        if (logsRef.current.length > 100) logsRef.current.shift();
        setTransactionLogs([...logsRef.current]);
      }
      
      // Track writeContract calls (for logging only)
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
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      
      // Serialize error objects properly
      const serializedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return `Error(${arg.name}): ${arg.message}${arg.stack ? '\n' + arg.stack.split('\n').slice(0, 3).join('\n') : ''}`
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            const keys = Object.keys(arg)
            if (keys.length > 0) {
              const props = keys.slice(0, 10).map(key => {
                try {
                  const val = arg[key]
                  if (val instanceof Error) {
                    return `${key}: Error(${val.name}): ${val.message}`
                  }
                  if (typeof val === 'object' && val !== null) {
                    return `${key}: [Object]`
                  }
                  if (typeof val === 'bigint') {
                    return `${key}: ${val.toString()}`
                  }
                  return `${key}: ${String(val).slice(0, 100)}`
                } catch {
                  return `${key}: [unserializable]`
                }
              }).join(', ')
              return `{${props}}`
            }
            return '[Object]'
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      
      const errorStr = serializedArgs.join(' ');
      
      // Only wallet popup related errors are detected (handled by wallet popup monitoring)
      
      // Create structured error object for logging
      const structuredError = args.map(arg => {
        if (arg instanceof Error) {
          return {
            type: 'Error',
            name: arg.name,
            message: arg.message,
            stack: arg.stack?.split('\n').slice(0, 5),
          }
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            const result: any = { type: 'Object' }
            const keys = Object.keys(arg).slice(0, 10)
            for (const key of keys) {
              try {
                const val = arg[key]
                if (val instanceof Error) {
                  result[key] = { type: 'Error', name: val.name, message: val.message }
                } else if (typeof val === 'bigint') {
                  result[key] = val.toString()
                } else if (typeof val === 'object' && val !== null) {
                  result[key] = '[Object]'
                } else {
                  result[key] = String(val).slice(0, 200)
                }
              } catch {
                result[key] = '[unserializable]'
              }
            }
            return result
          } catch {
            return { type: 'Object', value: '[unserializable]' }
          }
        }
        return { type: typeof arg, value: String(arg) }
      })
      
      const log: TransactionLog = {
        id: `error-${Date.now()}-${Math.random()}`,
        type: 'error',
        message: errorStr,
        timestamp: new Date().toISOString(),
        error: structuredError,
      };
      logsRef.current.push(log);
      if (logsRef.current.length > 100) logsRef.current.shift();
      setTransactionLogs([...logsRef.current]);

      // Track matchmaking errors (for logging only)
      if (errorStr.includes('[tryMatch]') || errorStr.includes('[checkForMatch]') || errorStr.includes('[joinQueue]') || errorStr.includes('[leaveQueue]')) {
        let logType: MatchmakingLog['type'] = 'error';
        if (errorStr.includes('[tryMatch]')) logType = 'tryMatch';
        else if (errorStr.includes('[checkForMatch]')) logType = 'checkForMatch';
        else if (errorStr.includes('[joinQueue]')) logType = 'joinQueue';
        else if (errorStr.includes('[leaveQueue]')) logType = 'leaveQueue';
        
        const matchmakingLog: MatchmakingLog = {
          id: `match-error-${Date.now()}-${Math.random()}`,
          type: logType,
          message: errorStr,
          timestamp: new Date().toISOString(),
          error: structuredError,
        };
        
        matchmakingLogsRef.current.push(matchmakingLog);
        if (matchmakingLogsRef.current.length > 200) matchmakingLogsRef.current.shift();
        setMatchmakingLogs([...matchmakingLogsRef.current]);
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      // Only wallet popup related warnings are detected (handled by wallet popup monitoring)
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Monitor wallet connection state (for wallet popup issues only)
  useEffect(() => {
    // Only keep wallet popup related issues
    setIssues(prev => {
      return prev.filter(i => 
        i.id.includes('wallet-popup') || 
        i.id.includes('popup') ||
        i.id === 'wallet-popup-blocked' ||
        i.id === 'wallet-popup-blocked-fixed' ||
        i.id === 'wallet-popup-button-not-clickable'
      );
    });
  }, [isConnected, address, connector, connectorClient, chainId]);

  const addIssue = (issue: Omit<DebugIssue, 'timestamp'>) => {
    setIssues(prev => {
      const existing = prev.find(i => i.id === issue.id);
      if (existing) {
        return prev.map(i => i.id === issue.id ? { ...issue, timestamp: new Date().toISOString() } : i);
      }
      return [...prev, { ...issue, timestamp: new Date().toISOString() }];
    });
  };
  
  // Expose addIssue to window for wallet popup monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__debugPanelAddIssue = addIssue;
      return () => {
        delete (window as any).__debugPanelAddIssue;
      };
    }
  }, []);

  const removeIssue = (id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  };

  const clearIssues = () => {
    setIssues([]);
  };

  const clearLogs = () => {
    logsRef.current = [];
    matchmakingLogsRef.current = [];
    setTransactionLogs([]);
    setMatchmakingLogs([]);
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
WALLET POPUP DEBUG REPORT
Generated: ${new Date().toLocaleString()}
Wallet: ${address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
Connector: ${connector?.name || 'N/A'}
Chain ID: ${chainId}
Connector Client: ${connectorClient ? 'Available' : 'Missing'}
Total Issues: ${issues.length}
Errors: ${issues.filter(i => i.status === 'error').length}
Warnings: ${issues.filter(i => i.status === 'warning').length}

${text}

TRANSACTION LOGS (Last 20):
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
      case 'matchmaking': return 'text-green-400 border-green-500 bg-green-500/10';
    }
  };
  
  const getMatchmakingLogColor = (type: MatchmakingLog['type']) => {
    switch (type) {
      case 'tryMatch': return 'text-blue-400 border-blue-500 bg-blue-500/10';
      case 'checkForMatch': return 'text-cyan-400 border-cyan-500 bg-cyan-500/10';
      case 'joinQueue': return 'text-yellow-400 border-yellow-500 bg-yellow-500/10';
      case 'leaveQueue': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      case 'matchFound': return 'text-green-400 border-green-500 bg-green-500/20';
      case 'error': return 'text-red-400 border-red-500 bg-red-500/10';
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-4 right-4 z-[9998] w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg flex items-center justify-center transition-all cursor-pointer"
        title="Debug Panel - Wallet Popup Issues Only"
        type="button"
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
              <h3 className="text-white font-black">Wallet Popup Debug</h3>
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
              Wallet Popup Issues ({issues.length})
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
            <button
              onClick={() => setActiveTab('matchmaking')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'matchmaking' 
                  ? 'bg-purple-600 text-white border-b-2 border-white' 
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Matchmaking ({matchmakingLogs.length})
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4">
            {activeTab === 'issues' && (
              <div className="space-y-2">
            {issues.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-400 text-lg">✅</p>
                <p className="text-gray-400 text-sm mt-2">No wallet popup issues detected</p>
                <p className="text-gray-500 text-xs mt-2">Waiting for wallet popup to appear...</p>
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

            {activeTab === 'matchmaking' && (
              <div className="space-y-2">
                {matchmakingLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No matchmaking logs yet</p>
                    <p className="text-gray-500 text-xs mt-2">Waiting for matchmaking activity...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="opacity-60">Total Logs:</div>
                          <div className="text-lg font-bold text-purple-300">{matchmakingLogs.length}</div>
                        </div>
                        <div>
                          <div className="opacity-60">tryMatch Calls:</div>
                          <div className="text-lg font-bold text-blue-400">
                            {matchmakingLogs.filter(l => l.type === 'tryMatch').length}
                          </div>
                        </div>
                        <div>
                          <div className="opacity-60">Matches Found:</div>
                          <div className="text-lg font-bold text-green-400">
                            {matchmakingLogs.filter(l => l.type === 'matchFound').length}
                          </div>
                        </div>
                      </div>
                    </div>
                    {matchmakingLogs.slice().reverse().map((log) => (
                      <div
                        key={log.id}
                        className={`border-2 rounded-lg p-3 ${getMatchmakingLogColor(log.type)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold flex-shrink-0">[{log.type}]</span>
                          {log.step && (
                            <span className="text-xs opacity-60 flex-shrink-0">Step: {log.step}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs break-words font-mono">{log.message}</p>
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
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-purple-900/50 px-4 py-2 text-xs text-gray-400 border-t border-purple-700 flex-shrink-0">
            <p>💡 Tip: Check browser console (F12) for detailed logs</p>
            <p className="mt-1">🔍 Monitoring wallet popup every 500ms</p>
          </div>
        </div>
      )}
    </>
  );
}
