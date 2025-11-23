import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to receive and store debug logs
 * POST /api/logs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logs, address, chainId, userAgent, timestamp } = body;

    // Log to server console (visible in Vercel logs)
    console.log('=== DEBUG LOGS RECEIVED ===');
    console.log('Timestamp:', new Date(timestamp || Date.now()).toISOString());
    console.log('Address:', address);
    console.log('Chain ID:', chainId);
    console.log('User Agent:', userAgent);
    console.log('Total Logs:', logs?.length || 0);
    console.log('--- LOGS START ---');
    
    // Print each log
    if (logs && Array.isArray(logs)) {
      logs.forEach((log: any, index: number) => {
        const logTime = log.timestamp 
          ? new Date(log.timestamp).toISOString() 
          : 'N/A';
        console.log(`[${index + 1}] [${log.level?.toUpperCase() || 'LOG'}] ${logTime}`);
        console.log(`  Message: ${log.message || 'N/A'}`);
        if (log.data) {
          try {
            console.log(`  Data:`, JSON.stringify(log.data, null, 2));
          } catch (e) {
            console.log(`  Data: [Could not serialize]`);
          }
        }
        console.log('---');
      });
    }
    
    console.log('--- LOGS END ---');
    console.log('=== END DEBUG LOGS ===');

    // Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Logs received',
      logCount: logs?.length || 0,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error receiving logs:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process logs' 
    }, { status: 500 });
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Logs API is running',
    timestamp: new Date().toISOString(),
  });
}

