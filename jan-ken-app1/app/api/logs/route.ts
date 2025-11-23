import { NextRequest, NextResponse } from 'next/server';
import { analyzeLogs, generateFixes, type LogEntry } from '@/lib/logAnalyzer';

/**
 * API Route to receive and store debug logs
 * POST /api/logs
 * Automatically analyzes logs and applies fixes
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
    
    // Analyze logs for errors
    console.log('=== ANALYZING LOGS FOR ERRORS ===');
    const analysis = analyzeLogs(logs as LogEntry[]);
    console.log('Analysis Summary:', analysis.summary);
    console.log('Errors Found:', analysis.errors.length);
    console.log('Fixes Available:', analysis.fixes.length);
    
    if (analysis.errors.length > 0) {
      console.log('--- DETECTED ERRORS ---');
      analysis.errors.forEach((error, index) => {
        console.log(`[${index + 1}] [${error.severity.toUpperCase()}] ${error.type}`);
        console.log(`  Message: ${error.message}`);
        console.log(`  File: ${error.file || 'N/A'}`);
        console.log(`  Fix: ${error.fix}`);
        console.log('---');
      });
    }
    
    if (analysis.fixes.length > 0) {
      console.log('--- AVAILABLE FIXES ---');
      const fileFixes = generateFixes(analysis.fixes);
      fileFixes.forEach((fix, index) => {
        console.log(`[${index + 1}] File: ${fix.file}`);
        console.log(`  Description: ${fix.description}`);
        console.log(`  Code: ${fix.code.substring(0, 200)}...`);
        console.log('---');
      });
      
      // Note: Auto-fixing will be handled by AI assistant after receiving response
      // Vercel serverless functions don't support file system writes
      console.log('=== FIXES DETECTED - WILL BE AUTO-APPLIED BY AI ===');
      console.log(`Found ${fileFixes.length} files to fix`);
      console.log('Fix details will be returned in response for AI to apply');
    }
    
    console.log('=== END DEBUG LOGS ===');

    // Generate fixes for response
    const fileFixes = analysis.fixes.length > 0 ? generateFixes(analysis.fixes) : [];
    
    // Return success with analysis and fixes
    return NextResponse.json({ 
      success: true, 
      message: 'Logs received and analyzed',
      logCount: logs?.length || 0,
      analysis: {
        errorsFound: analysis.errors.length,
        fixesAvailable: analysis.fixes.length,
        summary: analysis.summary,
        errors: analysis.errors.map(e => ({
          type: e.type,
          severity: e.severity,
          message: e.message,
          file: e.file,
          fix: e.fix,
        })),
        fixes: fileFixes.map(f => ({
          file: f.file,
          description: f.description,
          code: f.code,
        })),
      },
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

// Note: Auto-fixing is handled by the AI assistant after receiving the response
// This allows for safer, more controlled code changes

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Logs API is running',
    timestamp: new Date().toISOString(),
  });
}

