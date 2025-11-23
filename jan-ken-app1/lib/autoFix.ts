/**
 * Auto-fix system - Applies fixes detected from log analysis
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

export interface Fix {
  file: string;
  description: string;
  code: string;
}

/**
 * Apply fixes to code files
 */
export async function applyFixes(fixes: Fix[]): Promise<{ success: boolean; applied: number; errors: string[] }> {
  const errors: string[] = [];
  let applied = 0;

  for (const fix of fixes) {
    try {
      const filePath = join(process.cwd(), fix.file);
      console.log(`📝 Applying fix to ${fix.file}...`);
      
      // Read current file
      let content = await readFile(filePath, 'utf-8');
      let modified = false;
      
      // Apply fix based on description
      if (fix.description.includes('connector client') || fix.description.includes('Connector client missing')) {
        // Add connector client check before writeContract
        if (!content.includes('CRITICAL: Check connector client before proceeding')) {
          // Find the useEffect that sends transaction
          const checkPattern = /if \(!isConnected \|\| !address \|\| !writeContract \|\| hasJoinedQueue\) return;/;
          if (checkPattern.test(content)) {
            const checkCode = `
          // CRITICAL: Check connector client before proceeding
          if (!connectorClient) {
            console.error('❌ Cannot send transaction: connector client not available');
            setTxError('Wallet connection issue. Please disconnect and reconnect your wallet.');
            setHasJoinedQueue(false);
            setTxStartTime(null);
            return;
          }`;
            
            content = content.replace(
              checkPattern,
              `if (!isConnected || !address || !writeContract || hasJoinedQueue) return;${checkCode}`
            );
            modified = true;
          }
        }
      }
      
      if (fix.description.includes('simulation timeout') || fix.description.includes('Simulation timeout')) {
        // Add simulation timeout logic
        if (!content.includes('SIMULATION_TIMEOUT')) {
          const timeoutCode = `
          // Add simulation timeout check (5 seconds)
          const SIMULATION_TIMEOUT = 5000;
          if (simulateStatus === 'pending') {
            const timeoutStart = Date.now();
            const checkTimeout = setInterval(() => {
              if (Date.now() - timeoutStart > SIMULATION_TIMEOUT && simulateStatus === 'pending') {
                console.warn('⚠️ Simulation timeout, proceeding with direct transaction');
                clearInterval(checkTimeout);
              }
            }, 1000);
            // Will be cleaned up by useEffect cleanup
          }`;
          
          // Insert before writeContract call in the useEffect
          const useEffectPattern = /useEffect\(\(\) => \{[\s\S]*?const sendTransaction = async \(\) => \{/;
          if (useEffectPattern.test(content)) {
            content = content.replace(
              useEffectPattern,
              (match) => match + timeoutCode
            );
            modified = true;
          }
        }
      }
      
      // Write updated file if modified
      if (modified) {
        await writeFile(filePath, content, 'utf-8');
        console.log(`✅ Fixed ${fix.file}`);
        applied++;
      } else {
        console.log(`ℹ️  ${fix.file} - Fix already applied or not needed`);
      }
      
    } catch (error: any) {
      const errorMsg = `Error fixing ${fix.file}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  // Commit and push changes if any fixes were applied
  if (applied > 0) {
    try {
      console.log('📦 Committing fixes...');
      execSync('git add -A', { cwd: process.cwd(), stdio: 'inherit' });
      execSync(`git commit -m "Auto-fix: Apply fixes from log analysis - ${applied} fixes applied"`, 
        { cwd: process.cwd(), stdio: 'inherit' });
      execSync('git push origin master', { cwd: process.cwd(), stdio: 'inherit' });
      console.log('✅ Fixes committed and pushed');
    } catch (error: any) {
      const errorMsg = `Error committing fixes: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  return {
    success: errors.length === 0,
    applied,
    errors,
  };
}

