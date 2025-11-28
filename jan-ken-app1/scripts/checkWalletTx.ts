/**
 * Quick script to check wallet transactions
 * Run with: npx tsx scripts/checkWalletTx.ts
 */

import { getWalletTransactions, getWalletBalance, monitorWalletTransaction } from '../lib/walletMonitor';

const WALLET_ADDRESS = '0x24e741834c689B57e777D2403175fEF5559980d8' as `0x${string}`;

async function checkTransactions() {
  console.log('🔍 Checking wallet transactions...');
  console.log('Wallet:', WALLET_ADDRESS);
  console.log('');

  // Get balance
  const balance = await getWalletBalance(WALLET_ADDRESS);
  console.log('💰 Balance:', balance.balanceEth, 'ETH');
  console.log('');

  // Get recent transactions
  const result = await getWalletTransactions(WALLET_ADDRESS, 10);
  
  if (result.success && result.transactions) {
    console.log(`✅ Found ${result.transactions.length} recent transactions:`);
    console.log('');
    
    result.transactions.forEach((tx, index) => {
      console.log(`--- Transaction ${index + 1} ---`);
      console.log('Hash:', tx.hash);
      console.log('Status:', tx.status === 'success' ? '✅ SUCCESS' : '❌ REVERTED');
      console.log('Block:', tx.blockNumber.toString());
      console.log('Value:', (Number(tx.value) / 1e18).toFixed(6), 'ETH');
      console.log('Gas Used:', tx.gasUsed.toString());
      console.log('To:', tx.to || 'Contract Creation');
      console.log('Is Contract Call:', tx.isContractCall ? '✅ YES' : '❌ NO');
      if (tx.isContractCall) {
        console.log('Contract Address:', tx.contractAddress);
      }
      console.log('Timestamp:', new Date(tx.timestamp).toLocaleString());
      console.log('BaseScan:', `https://sepolia.basescan.org/tx/${tx.hash}`);
      console.log('');
    });

    // Check latest transaction
    if (result.transactions.length > 0) {
      const latest = result.transactions[0];
      console.log('📊 Latest Transaction Summary:');
      console.log('  Hash:', latest.hash);
      console.log('  Status:', latest.status === 'success' ? '✅ SUCCESS' : '❌ REVERTED');
      console.log('  Contract Call:', latest.isContractCall ? '✅ YES - Sent to contract!' : '❌ NO');
      console.log('  Value:', (Number(latest.value) / 1e18).toFixed(6), 'ETH');
      console.log('');
      
      if (latest.isContractCall) {
        console.log('🎉 SUCCESS! Transaction was sent to the contract!');
      } else {
        console.log('⚠️ WARNING: Transaction was NOT sent to the contract');
      }
    }
  } else {
    console.log('❌ Failed to get transactions:', result.message);
    if (result.error) {
      console.log('Error:', result.error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkTransactions()
    .then(() => {
      console.log('✅ Check complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkTransactions };





