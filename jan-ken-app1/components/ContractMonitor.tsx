/**
 * Contract Monitor Component
 * 
 * Real-time contract monitoring and testing UI
 */

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  runContractTests,
  verifyTransaction,
  monitorTransaction,
  type ContractTestResult,
  type ContractStatus,
} from '@/lib/contractTest';
import { CONTRACT_ADDRESS } from '@/lib/contract';

export function ContractMonitor() {
  const { address, isConnected } = useAccount();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    rpc: ContractTestResult;
    address: ContractTestResult;
    paused: ContractTestResult;
    balance: ContractTestResult;
    owner: ContractTestResult;
    status: ContractStatus;
  } | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [txResult, setTxResult] = useState<ContractTestResult | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runContractTests();
      setTestResults(results);
    } catch (error: any) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const verifyTx = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      alert('Please enter a valid transaction hash');
      return;
    }

    setIsMonitoring(true);
    try {
      const result = await verifyTransaction(txHash as `0x${string}`, 'joinQueue');
      setTxResult(result);
    } catch (error: any) {
      setTxResult({
        success: false,
        message: 'Error verifying transaction',
        error: error?.message || String(error),
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  const monitorTx = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      alert('Please enter a valid transaction hash');
      return;
    }

    setIsMonitoring(true);
    try {
      const result = await monitorTransaction(txHash as `0x${string}`);
      setTxResult(result);
    } catch (error: any) {
      setTxResult({
        success: false,
        message: 'Error monitoring transaction',
        error: error?.message || String(error),
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  // Auto-run tests on mount
  useEffect(() => {
    runTests();
    // Refresh every 30 seconds
    const interval = setInterval(runTests, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto bg-black/90 backdrop-blur-lg border-2 border-cyan-400/50 rounded-lg p-4 shadow-[0_0_30px_rgba(34,211,238,0.4)] z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-cyan-400">Contract Monitor</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-3 py-1 bg-cyan-500/20 border border-cyan-400 rounded text-cyan-400 text-sm hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {isRunning ? 'Testing...' : 'Refresh'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-2 mb-4">
          <div className={`p-2 rounded ${testResults.rpc.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={testResults.rpc.success ? 'text-green-400' : 'text-red-400'}>
                {testResults.rpc.success ? '✅' : '❌'}
              </span>{' '}
              RPC: {testResults.rpc.message}
            </div>
          </div>

          <div className={`p-2 rounded ${testResults.address.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={testResults.address.success ? 'text-green-400' : 'text-red-400'}>
                {testResults.address.success ? '✅' : '❌'}
              </span>{' '}
              Contract: {testResults.address.success ? 'Valid' : 'Invalid'}
            </div>
            <div className="text-xs text-gray-400 mt-1 break-all">{CONTRACT_ADDRESS}</div>
          </div>

          <div className={`p-2 rounded ${!testResults.paused.data?.paused ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={!testResults.paused.data?.paused ? 'text-green-400' : 'text-yellow-400'}>
                {!testResults.paused.data?.paused ? '✅' : '⚠️'}
              </span>{' '}
              Status: {testResults.paused.data?.paused ? 'PAUSED' : 'ACTIVE'}
            </div>
          </div>

          <div className={`p-2 rounded ${testResults.balance.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={testResults.balance.success ? 'text-green-400' : 'text-red-400'}>
                {testResults.balance.success ? '✅' : '❌'}
              </span>{' '}
              Balance: {testResults.balance.data?.balanceEth} ETH
            </div>
          </div>

          <div className={`p-2 rounded ${testResults.owner.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={testResults.owner.success ? 'text-green-400' : 'text-red-400'}>
                {testResults.owner.success ? '✅' : '❌'}
              </span>{' '}
              Owner: {testResults.owner.data?.owner?.slice(0, 10)}...
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-cyan-400/30 pt-4 mt-4">
        <h4 className="text-sm font-bold text-cyan-400 mb-2">Verify Transaction</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="flex-1 px-2 py-1 bg-black/50 border border-cyan-400/50 rounded text-cyan-400 text-xs font-mono"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={verifyTx}
            disabled={isMonitoring || !txHash}
            className="flex-1 px-2 py-1 bg-cyan-500/20 border border-cyan-400 rounded text-cyan-400 text-xs hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {isMonitoring ? 'Checking...' : 'Verify'}
          </button>
          <button
            onClick={monitorTx}
            disabled={isMonitoring || !txHash}
            className="flex-1 px-2 py-1 bg-blue-500/20 border border-blue-400 rounded text-blue-400 text-xs hover:bg-blue-500/30 disabled:opacity-50"
          >
            {isMonitoring ? 'Monitoring...' : 'Monitor'}
          </button>
        </div>

        {txResult && (
          <div className={`mt-2 p-2 rounded ${txResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs font-mono">
              <span className={txResult.success ? 'text-green-400' : 'text-red-400'}>
                {txResult.success ? '✅' : '❌'}
              </span>{' '}
              {txResult.message}
            </div>
            {txResult.error && (
              <div className="text-xs text-red-400 mt-1">{txResult.error}</div>
            )}
            {txResult.data && (
              <div className="text-xs text-gray-400 mt-1">
                {JSON.stringify(txResult.data, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>

      {isConnected && address && (
        <div className="border-t border-cyan-400/30 pt-4 mt-4">
          <div className="text-xs text-gray-400">
            Wallet: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
      )}
    </div>
  );
}

