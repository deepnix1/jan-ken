/**
 * Log Analyzer - Automatically detects and fixes errors from debug logs
 */

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

export interface DetectedError {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  fix: string;
  file?: string;
  line?: number;
  code?: string;
}

export interface AnalysisResult {
  errors: DetectedError[];
  fixes: DetectedError[];
  summary: string;
}

/**
 * Analyze logs and detect common errors
 */
export function analyzeLogs(logs: LogEntry[]): AnalysisResult {
  const errors: DetectedError[] = [];
  const fixes: DetectedError[] = [];

  // Pattern 1: Connector client not available
  const connectorClientErrors = logs.filter(log => 
    log.message.includes('Connector client available: false') ||
    log.message.includes('connector client not available') ||
    log.message.includes('CRITICAL: Connector client is not available')
  );

  if (connectorClientErrors.length > 0) {
    errors.push({
      type: 'connector_client_missing',
      severity: 'critical',
      message: 'Wagmi connector client is not available - transactions cannot be sent',
      fix: 'Ensure connector client is created before sending transactions. Add retry logic with delay.',
      file: 'components/Matchmaking.tsx',
    });
    fixes.push({
      type: 'connector_client_missing',
      severity: 'critical',
      message: 'Connector client missing - add wait/retry mechanism',
      fix: 'Add useEffect to wait for connectorClient before sending transaction',
      file: 'components/Matchmaking.tsx',
      code: `
// Wait for connector client before sending
useEffect(() => {
  if (!connectorClient && isConnected && address) {
    console.log('⏳ Waiting for connector client...');
    const timeout = setTimeout(() => {
      if (!connectorClient) {
        console.error('❌ Connector client timeout');
        setTxError('Wallet connection issue. Please reconnect.');
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }
}, [connectorClient, isConnected, address]);
`,
    });
  }

  // Pattern 2: Simulation errors
  const simulationErrors = logs.filter(log =>
    log.message.includes('Simulation error') ||
    log.message.includes('simulateStatus') && log.message.includes('error') ||
    log.message.includes('simulation failed')
  );

  if (simulationErrors.length > 0) {
    errors.push({
      type: 'simulation_error',
      severity: 'warning',
      message: 'Contract simulation is failing - may prevent gas estimation',
      fix: 'Add fallback to send transaction without simulation if simulation fails',
      file: 'components/Matchmaking.tsx',
    });
  }

  // Pattern 3: Transaction stuck in idle
  const idleErrors = logs.filter(log =>
    log.message.includes('status": "idle"') &&
    log.message.includes('isPending": false') &&
    log.message.includes('hash": "none"')
  );

  if (idleErrors.length > 3) {
    errors.push({
      type: 'transaction_stuck_idle',
      severity: 'critical',
      message: 'Transaction stuck in idle state - wallet popup may not appear',
      fix: 'Add explicit check for connector client and provider before writeContract call',
      file: 'components/Matchmaking.tsx',
    });
    fixes.push({
      type: 'transaction_stuck_idle',
      severity: 'critical',
      message: 'Transaction stuck - add connector client check',
      fix: 'Ensure connectorClient is available and provider is ready before calling writeContract',
      file: 'components/Matchmaking.tsx',
      code: `
// CRITICAL: Check connector client before writeContract
if (!connectorClient) {
  console.error('❌ Cannot send transaction: connector client not available');
  setTxError('Wallet connection issue. Please disconnect and reconnect.');
  return;
}

// Verify provider is ready
const provider = await sdk.wallet.getEthereumProvider();
if (!provider) {
  console.error('❌ Cannot send transaction: provider not available');
  setTxError('Wallet provider not ready. Please try again.');
  return;
}
`,
    });
  }

  // Pattern 4: BigInt serialization errors
  const bigIntErrors = logs.filter(log =>
    log.message.includes('JSON.stringify cannot serialize BigInt') ||
    log.message.includes('BigInt serialization')
  );

  if (bigIntErrors.length > 0) {
    errors.push({
      type: 'bigint_serialization',
      severity: 'warning',
      message: 'BigInt serialization errors in logging',
      fix: 'Already fixed in DebugPanel, but check other logging locations',
      file: 'components/Matchmaking.tsx',
    });
  }

  // Pattern 5: Network mismatch
  const networkErrors = logs.filter(log =>
    log.message.includes('Wrong network') ||
    log.message.includes('Chain ID') && log.message.includes('84532') && log.message.includes('Wrong')
  );

  if (networkErrors.length > 0) {
    errors.push({
      type: 'network_mismatch',
      severity: 'critical',
      message: 'User is on wrong network (not Base Sepolia)',
      fix: 'Add network switch prompt or better error message',
      file: 'components/Matchmaking.tsx',
    });
  }

  // Pattern 6: Transaction rejected
  const rejectedErrors = logs.filter(log =>
    log.message.includes('rejected') ||
    log.message.includes('USER REJECTED') ||
    log.message.includes('ACTION_REJECTED')
  );

  if (rejectedErrors.length > 0) {
    errors.push({
      type: 'transaction_rejected',
      severity: 'info',
      message: 'User rejected transaction - this is expected behavior',
      fix: 'No fix needed - user action',
    });
  }

  // Pattern 7: Simulation pending too long
  const simulationPending = logs.filter(log =>
    log.message.includes('Simulation is still pending') ||
    log.message.includes('simulateStatus') && log.message.includes('pending')
  );

  if (simulationPending.length > 5) {
    errors.push({
      type: 'simulation_timeout',
      severity: 'warning',
      message: 'Simulation taking too long - may block transactions',
      fix: 'Add timeout for simulation and proceed with direct transaction',
      file: 'components/Matchmaking.tsx',
    });
    fixes.push({
      type: 'simulation_timeout',
      severity: 'warning',
      message: 'Simulation timeout - add fallback',
      fix: 'Add timeout for simulation, proceed with direct transaction if timeout',
      file: 'components/Matchmaking.tsx',
      code: `
// Add simulation timeout
const SIMULATION_TIMEOUT = 5000; // 5 seconds

if (simulateStatus === 'pending') {
  const timeout = setTimeout(() => {
    if (simulateStatus === 'pending') {
      console.warn('⚠️ Simulation timeout, proceeding with direct transaction');
      // Proceed with direct transaction
    }
  }, SIMULATION_TIMEOUT);
  return () => clearTimeout(timeout);
}
`,
    });
  }

  // Generate summary
  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const summary = `Found ${errors.length} issues: ${criticalCount} critical, ${warningCount} warnings, ${errors.length - criticalCount - warningCount} info. ${fixes.length} fixes available.`;

  return {
    errors,
    fixes,
    summary,
  };
}

/**
 * Generate fix code based on detected errors
 */
export function generateFixes(fixes: DetectedError[]): { file: string; code: string; description: string }[] {
  const fileFixes: { [key: string]: { code: string[]; descriptions: string[] } } = {};

  fixes.forEach(fix => {
    if (!fix.file || !fix.code) return;

    if (!fileFixes[fix.file]) {
      fileFixes[fix.file] = { code: [], descriptions: [] };
    }

    fileFixes[fix.file].code.push(fix.code);
    fileFixes[fix.file].descriptions.push(fix.message);
  });

  return Object.entries(fileFixes).map(([file, { code, descriptions }]) => ({
    file,
    code: code.join('\n\n'),
    description: descriptions.join('; '),
  }));
}

