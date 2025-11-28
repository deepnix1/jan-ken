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
  const [activeTab, setActiveTab] = useState<'issues' | 'transactions' | 'wallet' | 'contract' | 'matchmaking'>('matchmaking');
  const { address, isConnected, connector } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const chainId = useChainId();
  const logsRef = useRef<TransactionLog[]>([]);
  const matchmakingLogsRef = useRef<MatchmakingLog[]>([]);
  const writeContractCallsRef = useRef<Array<{ timestamp: string; params: any; result?: any; error?: any }>>([]);

  // Monitor wallet popup DOM elements
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let popupCheckInterval: NodeJS.Timeout | null = null;
    
    const checkWalletPopup = () => {
      // Check for Farcaster wallet popup elements
      // Farcaster wallet typically uses iframes or specific class names
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
            if (btnStyle.pointerEvents !== 'none' && btnStyle.display !== 'none') {
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
          // Look for fixed elements with z-50 or z-40, or elements with specific classes
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
  
  // Intercept console.log for transaction monitoring
  // CRITICAL: This must run FIRST, before any other code
  useEffect(() => {
    // Store original functions
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override immediately to catch all errors

    console.log = (...args: any[]) => {
      originalLog(...args);
      const logStr = args.join(' ');
      
      // Track matchmaking logs
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
        
        // CRITICAL: Detect fake match issues (same player matched with themselves)
        if (logStr.includes('Cannot match player with themselves') || 
            logStr.includes('Verified players have same address') ||
            logStr.includes('Duplicate address found in queue')) {
          addIssue({
            id: 'fake-match-detected',
            title: '⚠️ FAKE MATCH DETECTED',
            status: 'error',
            message: 'Same player address found in queue - preventing fake match',
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'duplicate_player',
              severity: 'critical',
            },
          });
        }
        
        // CRITICAL: Detect not enough players
        if (logStr.includes('Not enough players') || logStr.includes('found: 1')) {
          addIssue({
            id: 'not-enough-players',
            title: 'Waiting for Opponent',
            status: 'warning',
            message: 'Only 1 player in queue - need 1 more to match',
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'insufficient_players',
            },
          });
        }
        
        // CRITICAL: Detect mobile vs web differences
        if (logStr.includes('isMobile') || logStr.includes('userAgent')) {
          const isMobile = logStr.includes('isMobile: true') || /Mobile|Android|iPhone|iPad/.test(logStr);
          if (isMobile && (logStr.includes('No match found') || logStr.includes('⚠️'))) {
            addIssue({
              id: 'mobile-match-issue',
              title: 'Mobile Match Detection Issue',
              status: 'warning',
              message: 'Match not found on mobile - check mobile-specific logs',
              details: { 
                step, 
                data: args.length > 1 ? args.slice(1) : undefined,
                issue: 'mobile_detection',
                platform: 'mobile',
              },
            });
          }
        }
        
        // CRITICAL: Detect checkForMatch issues
        if (logStr.includes('[checkForMatch]') && (logStr.includes('⚠️') || logStr.includes('❌'))) {
          addIssue({
            id: `checkForMatch-issue-${Date.now()}`,
            title: 'CheckForMatch Issue',
            status: logStr.includes('❌') ? 'error' : 'warning',
            message: logStr,
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'checkForMatch_failure',
            },
          });
        }
        
        // CRITICAL: Detect last_seen update failures in logs
        if (logStr.includes('Could not update last_seen') || logStr.includes('CRITICAL: Could not update last_seen') || logStr.includes('CRITICAL ERROR updating last_seen')) {
          addIssue({
            id: 'last-seen-update-failed',
            title: '⚠️ CRITICAL: last_seen Update Failed',
            status: 'error',
            message: 'Player will be excluded from matching - app may be considered inactive',
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'last_seen_update_failure',
              severity: 'critical',
              impact: 'player_excluded_from_matching',
            },
          });
        }
        
        // CRITICAL: Detect inactive players (last_seen > 15 seconds) - stricter threshold
        if (logStr.includes('Found players with active last_seen') || logStr.includes('seconds_ago')) {
          // Try to extract seconds_ago from log data
          try {
            const logData = args.length > 1 ? args[1] : null;
            if (logData && typeof logData === 'object') {
              const players = (logData as any)?.players || [];
              for (const player of players) {
                // Check if player is inactive (threshold is now 15 seconds)
                if (player.seconds_ago && player.seconds_ago > 15) {
                  addIssue({
                    id: `inactive-player-${Date.now()}-${Math.random()}`,
                    title: '⚠️ CRITICAL: Inactive Player Detected in Queue',
                    status: 'error',
                    message: `Player with last_seen ${player.seconds_ago}s ago (threshold: 15s) - app may be closed`,
                    details: {
                      address: player.address,
                      fullAddress: player.fullAddress,
                      seconds_ago: player.seconds_ago,
                      threshold: 15,
                      severity: 'critical',
                      issue: 'inactive_player_in_queue',
                      last_seen: player.last_seen,
                    },
                  });
                }
                // Also check isActive flag
                if (player.isActive === false) {
                  addIssue({
                    id: `inactive-player-flag-${Date.now()}-${Math.random()}`,
                    title: '⚠️ CRITICAL: Player Marked as Inactive',
                    status: 'error',
                    message: `Player marked as inactive (isActive: false) - should not be matched`,
                    details: {
                      address: player.address,
                      fullAddress: player.fullAddress,
                      isActive: player.isActive,
                      seconds_ago: player.seconds_ago,
                      last_seen: player.last_seen,
                      severity: 'critical',
                    },
                  });
                }
              }
            }
          } catch (err) {
            // Ignore parsing errors
          }
        }
        
        // CRITICAL: Detect match created with inactive players
        if (logStr.includes('Match created successfully') && logStr.includes('last_seen_verification')) {
          try {
            const logData = args.length > 1 ? args[1] : null;
            if (logData && typeof logData === 'object') {
              const verification = (logData as any)?.last_seen_verification;
              if (verification && (verification.player1_active === false || verification.player2_active === false)) {
                addIssue({
                  id: 'match-created-with-inactive-player',
                  title: '⚠️ CRITICAL: Match Created with Inactive Player!',
                  status: 'error',
                  message: `Match was created but one or both players had inactive last_seen!`,
                  details: {
                    player1_active: verification.player1_active,
                    player2_active: verification.player2_active,
                    gameId: (logData as any)?.gameId,
                    player1: (logData as any)?.player1,
                    player2: (logData as any)?.player2,
                    severity: 'critical',
                    issue: 'match_created_with_inactive_player',
                  },
                });
              }
            }
          } catch (err) {
            // Ignore parsing errors
          }
        }
        
        // CRITICAL: Detect app hidden but player still in queue
        if (logStr.includes('App is hidden - not updating last_seen')) {
          addIssue({
            id: 'app-hidden-no-update',
            title: '⚠️ App Hidden - last_seen Not Updated',
            status: 'warning',
            message: 'App is hidden - last_seen will not be updated. Player will be excluded from matching soon.',
            details: {
              issue: 'app_hidden',
              impact: 'player_will_be_excluded',
            },
          });
        }
        
        // CRITICAL: Detect inactive last_seen in tryMatch logs
        if (logStr.includes('CRITICAL: Player1 has inactive last_seen') || logStr.includes('CRITICAL: Player2 has inactive last_seen') || logStr.includes('FINAL CHECK FAILED') || logStr.includes('GAME CREATION BLOCKED') || logStr.includes('ABSOLUTE FINAL CHECK FAILED')) {
          addIssue({
            id: 'inactive-player-trymatch',
            title: '⚠️ CRITICAL: Inactive Player in tryMatch',
            status: 'error',
            message: 'Player with inactive last_seen detected in tryMatch - matching prevented',
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'inactive_player_in_trymatch',
              severity: 'critical',
            },
          });
        }
        
        // CRITICAL: Detect game rejection in checkForMatch
        if (logStr.includes('REJECTING GAME') || logStr.includes('One or both players have inactive last_seen')) {
          addIssue({
            id: 'game-rejected-inactive-player',
            title: '⚠️ CRITICAL: Game Rejected - Inactive Player',
            status: 'error',
            message: 'Game was rejected because one or both players have inactive last_seen',
            details: { 
              step, 
              data: args.length > 1 ? args.slice(1) : undefined,
              issue: 'game_rejected_inactive_player',
              severity: 'critical',
            },
          });
        }
        
        // Create issues for important matchmaking events
        if (logStr.includes('[tryMatch] ⚠️') || logStr.includes('[tryMatch] ❌')) {
          addIssue({
            id: `matchmaking-${Date.now()}`,
            title: 'Matchmaking Issue',
            status: logStr.includes('❌') ? 'error' : 'warning',
            message: logStr,
            details: { step, data: args.length > 1 ? args.slice(1) : undefined },
          });
        } else if (logStr.includes('[tryMatch] ✅') || logStr.includes('MATCH CREATED SUCCESSFULLY')) {
          // CRITICAL: When match is created, log both players' last_seen values
          if (logStr.includes('Match created successfully') || logStr.includes('✅✅✅ Match created')) {
            try {
              const logData = args.length > 1 ? args[1] : null;
              if (logData && typeof logData === 'object') {
                const matchData = logData as any;
                addIssue({
                  id: 'match-created-with-last-seen',
                  title: 'Match Created - Check last_seen',
                  status: 'warning',
                  message: 'Match was created - verify both players had active last_seen',
                  details: {
                    gameId: matchData.gameId,
                    player1: matchData.player1,
                    player2: matchData.player2,
                    betLevel: matchData.betLevel,
                    issue: 'match_created_verification_needed',
                  },
                });
              }
            } catch (err) {
              // Ignore parsing errors
            }
          }
          removeIssue('not-enough-players');
          removeIssue('fake-match-detected');
          addIssue({
            id: 'match-found',
            title: 'Match Found!',
            status: 'ok',
            message: logStr,
            details: { step, data: args.length > 1 ? args.slice(1) : undefined },
          });
        }
      }
      
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
      
      // Serialize error objects properly BEFORE joining
      const serializedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return `Error(${arg.name}): ${arg.message}${arg.stack ? '\n' + arg.stack.split('\n').slice(0, 3).join('\n') : ''}`
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            // Try to extract meaningful properties
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
      
      // CRITICAL: Detect last_seen update failures in errors
      if (errorStr.includes('Could not update last_seen') || errorStr.includes('CRITICAL: Could not update last_seen') || errorStr.includes('CRITICAL ERROR updating last_seen')) {
        addIssue({
          id: 'last-seen-update-failed',
          title: '⚠️ CRITICAL: last_seen Update Failed',
          status: 'error',
          message: 'Player will be excluded from matching - app may be considered inactive',
          details: {
            error: errorStr,
            severity: 'critical',
            impact: 'player_excluded_from_matching',
          },
        });
      }
      
      // CRITICAL: Detect inactive players being matched (last_seen too old)
      if (errorStr.includes('last_seen') && (errorStr.includes('seconds_ago') || errorStr.includes('Found players'))) {
        // Extract seconds_ago from log if available
        const secondsAgoMatch = errorStr.match(/seconds_ago[:\s]+(\d+)/);
        if (secondsAgoMatch && parseInt(secondsAgoMatch[1]) > 30) {
          addIssue({
            id: `inactive-player-matched-${Date.now()}`,
            title: '⚠️ Inactive Player Being Matched',
            status: 'error',
            message: `Player with last_seen > 30 seconds ago (${secondsAgoMatch[1]}s) is being matched - app may be closed`,
            details: {
              seconds_ago: parseInt(secondsAgoMatch[1]),
              threshold: 30,
              severity: 'critical',
            },
          });
        }
      }
      
      // Also create a structured error object for details
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

      // Track matchmaking errors
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
          details: structuredError.length > 0 ? structuredError[0] : undefined,
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
        title="Debug Panel"
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
            <p className="mt-1">🔄 Auto-refreshing every 5 seconds</p>
          </div>
        </div>
      )}
    </>
  );
}
