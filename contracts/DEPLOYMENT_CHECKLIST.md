# Deployment Checklist - Updated Contract

## ✅ Pre-Deployment

- [ ] Contract code reviewed
- [ ] All security measures verified
- [ ] Compiler version set to 0.8.20
- [ ] Optimization enabled (200 runs)
- [ ] Base Sepolia network selected
- [ ] Sufficient ETH for gas fees
- [ ] MetaMask connected to Base Sepolia

## ✅ Deployment Steps

- [ ] Open Remix IDE
- [ ] Create new file: `RockPaperScissors.sol`
- [ ] Copy contract code from `contracts/src/RockPaperScissors.sol`
- [ ] Compile contract (no errors)
- [ ] Select environment: `Injected Provider - MetaMask`
- [ ] Deploy contract
- [ ] Copy contract address
- [ ] Save contract address securely

## ✅ Post-Deployment

- [ ] Update `jan-ken-app1/lib/contract.ts` with new address
- [ ] Update `.env` files with new address
- [ ] Verify contract on BaseScan
- [ ] Test `joinQueue` function
- [ ] Test `makeChoice` function
- [ ] Test `pause` function (owner only)
- [ ] Test `unpause` function (owner only)
- [ ] Test cooldown mechanism
- [ ] Test emergency withdrawal (if needed)

## ✅ Frontend Update

After deployment, update:

1. **Contract Address**:
   ```typescript
   // jan-ken-app1/lib/contract.ts
   export const CONTRACT_ADDRESS = '0xYourNewContractAddress';
   ```

2. **Environment Variables**:
   ```env
   # jan-ken-app1/.env.local
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourNewContractAddress
   ```

3. **Restart Frontend**:
   ```bash
   cd jan-ken-app1
   npm run dev
   ```

## 🔒 Security Verification

After deployment, verify:

- [ ] Owner address is correct
- [ ] Emergency withdraw address set (if needed)
- [ ] Contract is not paused
- [ ] All bet levels work correctly
- [ ] Tax collection works (5%)
- [ ] Cooldown mechanism works
- [ ] Queue limits work (max 100)

## 📝 Important Reminders

1. **Save Contract Address**: Write it down immediately
2. **Save Transaction Hash**: For verification
3. **Test Small First**: Test with smallest bet level first
4. **Verify Contract**: Verify on BaseScan for transparency
5. **Update Frontend**: Don't forget to update frontend address

## 🚨 Emergency Procedures

If something goes wrong:

1. **Pause Contract**: Call `pause()` function as owner
2. **Emergency Withdraw**: Use `emergencyWithdraw()` if needed
3. **Check Events**: Review contract events on BaseScan
4. **Contact Support**: If issues persist

## 📊 Contract Verification

To verify on BaseScan:

1. Go to: https://sepolia.basescan.org
2. Search contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Enter:
   - Compiler: 0.8.20
   - License: MIT
   - Optimization: Yes (200 runs)
   - Paste full contract code
6. Submit verification

