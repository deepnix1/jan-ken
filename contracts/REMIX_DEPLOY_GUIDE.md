# Remix IDE Deployment Guide - Updated Contract

## 📋 Deployment Steps

### 1. Prepare Contract File

1. Open Remix IDE: https://remix.ethereum.org
2. Create a new file: `RockPaperScissors.sol`
3. Copy the entire content from `contracts/src/RockPaperScissors.sol`
4. Paste into Remix

### 2. Compile Contract

1. Go to **Solidity Compiler** tab (left sidebar)
2. Select compiler version: **0.8.20** (or latest 0.8.x)
3. Click **Compile RockPaperScissors.sol**
4. Check for errors (should compile successfully)

### 3. Deploy to Base Sepolia

1. Go to **Deploy & Run Transactions** tab
2. Select **Environment**: `Injected Provider - MetaMask`
3. Make sure MetaMask is connected to **Base Sepolia** network
   - Network: Base Sepolia
   - Chain ID: 84532
   - RPC URL: https://sepolia.base.org

### 4. Deploy Contract

1. Select contract: **RockPaperScissors**
2. Click **Deploy** button
3. Confirm transaction in MetaMask
4. Wait for deployment confirmation

### 5. Get Contract Address

1. After deployment, copy the contract address
2. Update your `.env` files:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS="0xYourNewContractAddress"
   ROCK_PAPER_SCISSORS_ADDRESS="0xYourNewContractAddress"
   ```

### 6. Verify Contract (Optional but Recommended)

1. Go to BaseScan: https://sepolia.basescan.org
2. Search for your contract address
3. Click **Contract** tab
4. Click **Verify and Publish**
5. Fill in:
   - Compiler Version: 0.8.20
   - License: MIT
   - Optimization: Yes (200 runs)
   - Paste contract code
6. Click **Verify and Publish**

## ⚠️ Important Notes

### Before Deployment

- ✅ Make sure you have enough Base Sepolia ETH for gas
- ✅ Verify you're on Base Sepolia network (not mainnet!)
- ✅ Save your contract address immediately after deployment
- ✅ Test the contract with small amounts first

### After Deployment

- ✅ Update frontend contract address in `jan-ken-app1/lib/contract.ts`
- ✅ Test all functions (joinQueue, makeChoice, etc.)
- ✅ Verify contract on BaseScan
- ✅ Test emergency functions (pause/unpause) if needed

## 🔒 Security Features in New Contract

The updated contract includes:

1. **Circuit Breaker**: `pause()` / `unpause()` functions
2. **DoS Protection**: Max queue length (100 players)
3. **Cooldown**: 5 seconds between games
4. **Game Limits**: Max 1000 games per address
5. **Emergency Withdrawal**: Owner can withdraw in emergencies
6. **Enhanced Validation**: More input and state checks

## 📝 Contract Functions

### Public Functions
- `joinQueue(uint256 betLevel)` - Join matchmaking
- `makeChoice(uint8 choice)` - Make your choice (1=Rock, 2=Paper, 3=Scissors)
- `timeoutGame()` - Handle timeout
- `getMyGame(address player)` - Get game status
- `getWaitingPlayersCount(uint256 betLevel)` - Get queue length
- `getContractBalance()` - Get contract balance
- `getOwnerAddress()` - Get owner address
- `getPlayerCooldownStatus(address player)` - Get cooldown status

### Owner Functions
- `setOwner(address newOwner)` - Change owner
- `pause()` - Pause contract
- `unpause()` - Unpause contract
- `emergencyWithdraw(uint256 amount, address to)` - Emergency withdrawal
- `setEmergencyWithdrawAddress(address newAddress)` - Set emergency address
- `resetPlayerCooldown(address player)` - Reset player cooldown

## 🧪 Testing After Deployment

1. **Test joinQueue**: Send exact bet amount
2. **Test makeChoice**: Make choice within 20 seconds
3. **Test pause/unpause**: As owner, test circuit breaker
4. **Test cooldown**: Try joining queue twice quickly
5. **Test emergency functions**: Verify owner-only access

## 📞 Support

If you encounter issues:
1. Check Remix console for errors
2. Verify network is Base Sepolia
3. Ensure you have enough ETH for gas
4. Check contract address is correct in frontend

Last Updated: 2024


