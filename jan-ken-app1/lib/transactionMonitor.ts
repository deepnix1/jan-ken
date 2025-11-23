/**
 * Transaction Monitoring and Auto-Recovery System
 * 
 * This module provides comprehensive monitoring, debugging, and automatic recovery
 * for blockchain transactions in the Jan KeN! game.
 */

import { type Hash, type Address } from 'viem';

export interface TransactionState {
  id: string;
  functionName: string;
  address: Address;
  args: any[];
  value?: bigint;
  status: 'idle' | 'pending' | 'sending' | 'sent' | 'confirming' | 'confirmed' | 'failed' | 'timeout';
  hash: Hash | null;
  startTime: number;
  lastUpdate: number;
  error: string | null;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface MonitorConfig {
  maxRetries?: number;
  retryDelay?: number;
  pendingTimeout?: number;
  sendingTimeout?: number;
  confirmationTimeout?: number;
  enableAutoRetry?: boolean;
  enableHealthCheck?: boolean;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  maxRetries: 3,
  retryDelay: 2000,
  pendingTimeout: 30000, // 30 seconds
  sendingTimeout: 60000, // 60 seconds
  confirmationTimeout: 120000, // 120 seconds
  enableAutoRetry: true,
  enableHealthCheck: true,
  logLevel: 'info',
};

class TransactionMonitor {
  private transactions: Map<string, TransactionState> = new Map();
  private config: Required<MonitorConfig>;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private rpcHealthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  private connectorHealthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  constructor(config: MonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startHealthCheck();
  }

  /**
   * Start monitoring a new transaction
   */
  startTransaction(
    id: string,
    functionName: string,
    address: Address,
    args: any[],
    value?: bigint,
    metadata: Record<string, any> = {}
  ): TransactionState {
    const state: TransactionState = {
      id,
      functionName,
      address,
      args,
      value,
      status: 'idle',
      hash: null,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      error: null,
      retryCount: 0,
      metadata,
    };

    this.transactions.set(id, state);
    this.log('info', `[${id}] Transaction started: ${functionName}`, state);
    return state;
  }

  /**
   * Update transaction status
   */
  updateTransaction(
    id: string,
    updates: Partial<Pick<TransactionState, 'status' | 'hash' | 'error' | 'metadata' | 'retryCount'>>
  ): TransactionState | null {
    const state = this.transactions.get(id);
    if (!state) {
      this.log('warn', `[${id}] Transaction not found for update`);
      return null;
    }

    const previousStatus = state.status;
    Object.assign(state, updates, { lastUpdate: Date.now() });
    this.transactions.set(id, state);

    if (updates.status && updates.status !== previousStatus) {
      this.log('info', `[${id}] Status changed: ${previousStatus} → ${updates.status}`, updates);
    }

    // Check for stuck transactions
    this.checkStuckTransaction(id, state);

    return state;
  }

  /**
   * Get transaction state
   */
  getTransaction(id: string): TransactionState | null {
    return this.transactions.get(id) || null;
  }

  /**
   * Check if transaction is stuck and needs recovery
   */
  private checkStuckTransaction(id: string, state: TransactionState): void {
    const now = Date.now();
    const elapsed = now - state.lastUpdate;

    // Check for stuck in pending (wallet approval)
    if (state.status === 'pending' && elapsed > this.config.pendingTimeout) {
      this.log('warn', `[${id}] Transaction stuck in pending for ${elapsed}ms`, state);
      this.handleStuckTransaction(id, state, 'pending');
      return;
    }

    // Check for stuck in sending (no hash received)
    if (state.status === 'sending' && elapsed > this.config.sendingTimeout) {
      this.log('warn', `[${id}] Transaction stuck in sending for ${elapsed}ms`, state);
      this.handleStuckTransaction(id, state, 'sending');
      return;
    }

    // Check for stuck in confirming (no receipt)
    if (state.status === 'confirming' && state.hash && elapsed > this.config.confirmationTimeout) {
      this.log('warn', `[${id}] Transaction stuck in confirming for ${elapsed}ms`, state);
      this.handleStuckTransaction(id, state, 'confirming');
      return;
    }
  }

  /**
   * Handle stuck transaction with auto-recovery
   */
  private handleStuckTransaction(
    id: string,
    state: TransactionState,
    reason: 'pending' | 'sending' | 'confirming'
  ): void {
    if (!this.config.enableAutoRetry) {
      this.updateTransaction(id, {
        status: 'timeout',
        error: `Transaction stuck in ${reason} state`,
      });
      return;
    }

    if (state.retryCount >= this.config.maxRetries) {
      this.log('error', `[${id}] Max retries reached, marking as failed`, state);
      this.updateTransaction(id, {
        status: 'failed',
        error: `Transaction failed after ${state.retryCount} retries`,
      });
      return;
    }

    // Auto-retry logic
    this.log('info', `[${id}] Attempting auto-recovery (retry ${state.retryCount + 1}/${this.config.maxRetries})`, {
      reason,
      elapsed: Date.now() - state.startTime,
    });

    // Reset state for retry
    this.updateTransaction(id, {
      status: 'idle',
      error: null,
      retryCount: state.retryCount + 1,
      metadata: {
        ...state.metadata,
        lastRetryReason: reason,
        lastRetryTime: Date.now(),
      },
    });

    // Emit retry event (components can listen to this)
    this.emitRetryEvent(id, state);
  }

  /**
   * Emit retry event for components to handle
   */
  private emitRetryEvent(id: string, state: TransactionState): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('transaction-retry', {
          detail: { id, state },
        })
      );
    }
  }

  /**
   * Start health check for RPC and connectors
   */
  private startHealthCheck(): void {
    if (!this.config.enableHealthCheck) return;

    this.healthCheckInterval = setInterval(() => {
      this.checkRpcHealth();
      this.checkConnectorHealth();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check RPC provider health
   */
  private async checkRpcHealth(): Promise<void> {
    try {
      const response = await fetch('https://sepolia.base.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.rpcHealthStatus = 'healthy';
      } else {
        this.rpcHealthStatus = 'degraded';
        this.log('warn', 'RPC health check: degraded response');
      }
    } catch (error) {
      this.rpcHealthStatus = 'unhealthy';
      this.log('error', 'RPC health check failed', error);
    }
  }

  /**
   * Check wallet connector health
   */
  private checkConnectorHealth(): void {
    if (typeof window === 'undefined') return;

    try {
      const ethereum = (window as any).ethereum;
      const farcaster = (window as any).farcaster;

      if (ethereum || farcaster?.sdk) {
        this.connectorHealthStatus = 'healthy';
      } else {
        this.connectorHealthStatus = 'degraded';
        this.log('warn', 'Connector health check: no provider found');
      }
    } catch (error) {
      this.connectorHealthStatus = 'unhealthy';
      this.log('error', 'Connector health check failed', error);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    rpc: 'healthy' | 'degraded' | 'unhealthy';
    connector: 'healthy' | 'degraded' | 'unhealthy';
  } {
    return {
      rpc: this.rpcHealthStatus,
      connector: this.connectorHealthStatus,
    };
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): TransactionState[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => !['confirmed', 'failed', 'timeout'].includes(tx.status)
    );
  }

  /**
   * Get transaction statistics
   */
  getStats(): {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    averageTime: number;
  } {
    const transactions = Array.from(this.transactions.values());
    const active = transactions.filter(
      (tx) => !['confirmed', 'failed', 'timeout'].includes(tx.status)
    );
    const completed = transactions.filter((tx) =>
      ['confirmed', 'failed', 'timeout'].includes(tx.status)
    );

    const byStatus: Record<string, number> = {};
    transactions.forEach((tx) => {
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
    });

    const averageTime =
      completed.length > 0
        ? completed.reduce((sum, tx) => sum + (tx.lastUpdate - tx.startTime), 0) / completed.length
        : 0;

    return {
      total: transactions.length,
      active: active.length,
      byStatus,
      averageTime,
    };
  }

  /**
   * Logging utility
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, data?: any): void {
    const levels = ['none', 'error', 'warn', 'info', 'debug'];
    const currentLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[TransactionMonitor:${timestamp}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'info':
          console.info(prefix, message, data || '');
          break;
        case 'debug':
          console.debug(prefix, message, data || '');
          break;
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.transactions.clear();
  }
}

// Singleton instance
let monitorInstance: TransactionMonitor | null = null;

export function getTransactionMonitor(config?: MonitorConfig): TransactionMonitor {
  if (!monitorInstance) {
    monitorInstance = new TransactionMonitor(config);
  }
  return monitorInstance;
}

// Export types and utilities
export { TransactionMonitor };

