/**
 * React Hook for Transaction Monitoring
 * 
 * Provides easy access to transaction monitoring functionality in React components.
 */

import { useEffect, useCallback, useRef } from 'react';
import { getTransactionMonitor, type TransactionState, type MonitorConfig } from '@/lib/transactionMonitor';
import { type Hash, type Address } from 'viem';

export interface UseTransactionMonitorOptions extends MonitorConfig {
  onRetry?: (id: string, state: TransactionState) => void;
  onStuck?: (id: string, state: TransactionState, reason: string) => void;
  onStatusChange?: (id: string, state: TransactionState) => void;
}

export function useTransactionMonitor(options: UseTransactionMonitorOptions = {}) {
  const monitor = getTransactionMonitor(options);
  const callbacksRef = useRef({
    onRetry: options.onRetry,
    onStuck: options.onStuck,
    onStatusChange: options.onStatusChange,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onRetry: options.onRetry,
      onStuck: options.onStuck,
      onStatusChange: options.onStatusChange,
    };
  }, [options.onRetry, options.onStuck, options.onStatusChange]);

  // Listen for retry events
  useEffect(() => {
    const handleRetry = (event: CustomEvent<{ id: string; state: TransactionState }>) => {
      const { id, state } = event.detail;
      callbacksRef.current.onRetry?.(id, state);
    };

    window.addEventListener('transaction-retry', handleRetry as EventListener);
    return () => {
      window.removeEventListener('transaction-retry', handleRetry as EventListener);
    };
  }, []);

  // Start transaction monitoring
  const startTransaction = useCallback(
    (
      id: string,
      functionName: string,
      address: Address,
      args: any[],
      value?: bigint,
      metadata?: Record<string, any>
    ) => {
      return monitor.startTransaction(id, functionName, address, args, value, metadata);
    },
    [monitor]
  );

  // Update transaction
  const updateTransaction = useCallback(
    (
      id: string,
      updates: Partial<Pick<TransactionState, 'status' | 'hash' | 'error' | 'metadata' | 'retryCount'>>
    ) => {
      const state = monitor.updateTransaction(id, updates);
      if (state && callbacksRef.current.onStatusChange) {
        callbacksRef.current.onStatusChange(id, state);
      }
      return state;
    },
    [monitor]
  );

  // Get transaction
  const getTransaction = useCallback(
    (id: string) => {
      return monitor.getTransaction(id);
    },
    [monitor]
  );

  // Get health status
  const getHealthStatus = useCallback(() => {
    return monitor.getHealthStatus();
  }, [monitor]);

  // Get active transactions
  const getActiveTransactions = useCallback(() => {
    return monitor.getActiveTransactions();
  }, [monitor]);

  // Get stats
  const getStats = useCallback(() => {
    return monitor.getStats();
  }, [monitor]);

  return {
    startTransaction,
    updateTransaction,
    getTransaction,
    getHealthStatus,
    getActiveTransactions,
    getStats,
  };
}

