# 🚀 New Architecture Contract - RockPaperScissorsV2

## 📋 Overview

Yeni mimariye göre güncellenmiş contract. Artık sadece sonuçları blockchain'e yazıyor.

## 🏗️ Architecture

### 1. Off-Chain Matchmaking (Supabase)
- ✅ Hızlı eşleştirme
- ✅ Queue yönetimi
- ✅ Player matching

### 2. Off-Chain Commit-Reveal (Supabase)
- ✅ Adil oyun
- ✅ Hash-based commits
- ✅ Salt verification

### 3. On-Chain Results (Blockchain)
- ✅ Sonuç yazma
- ✅ Ödül dağıtımı
- ✅ İstatistikler

## 📝 Contract Functions

### Public Functions

#### `depositFunds()`
Oyuncu para yatırır (eşleştirmeden önce)
- Tax %5 otomatik hesaplanır ve owner'a gönderilir
- Kalan miktar oyuncu bakiyesine eklenir

#### `withdrawFunds(uint256 amount)`
Oyuncu parasını çeker (eşleştirme iptal edilirse)
- `amount = 0` → Tüm bakiyeyi çeker

#### `finalizeGame(...)`
Oyun sonucunu blockchain'e yazar ve ödülleri dağıtır
- Parametreler:
  - `gameId`: Oyun ID'si (Supabase'den)
  - `player1`, `player2`: Oyuncu adresleri
  - `player1Choice`, `player2Choice`: Seçimler (1=Rock, 2=Paper, 3=Scissors)
  - `betAmount`: Her oyuncunun yatırdığı miktar (tax çıkarılmış)

#### View Functions
- `getPlayerBalance(address)`: Oyuncu bakiyesi
- `getGameResult(string)`: Oyun sonucu
- `getPlayerStats(address)`: İstatistikler (wins, losses, draws)
- `getContractBalance()`: Contract bakiyesi

### Owner Functions
- `setOwner(address)`: Owner değiştir
- `pause()`: Contract'ı durdur
- `unpause()`: Contract'ı devam ettir
- `emergencyWithdraw(uint256, address)`: Acil durum çekme

## 🔄 New Flow

### Old Flow (V1)
```
1. joinQueue() → Blockchain'de eşleştirme
2. makeChoice() → Blockchain'de hamle
3. Otomatik sonuç
```

### New Flow (V2)
```
1. depositFunds() → Para yatır (blockchain)
2. joinQueue() → Supabase'de eşleştirme (off-chain)
3. commitChoice() → Supabase'de commit (off-chain)
4. revealChoice() → Supabase'de reveal (off-chain)
5. finalizeGame() → Sonucu blockchain'e yaz (on-chain)
```

## 💰 Tax System

- Tax: %5 (500 basis points)
- Tax otomatik olarak `depositFunds()` sırasında owner'a gönderilir
- Kalan miktar oyuncu bakiyesine eklenir

## 🔒 Security Features

- ✅ ReentrancyGuard
- ✅ Circuit Breaker (pause/unpause)
- ✅ Input Validation
- ✅ Address Validation
- ✅ Balance Checks
- ✅ Gas Limits on Transfers

## 📊 Events

- `FundsDeposited(address, uint256)`
- `FundsWithdrawn(address, uint256)`
- `GameFinalized(string, address, address, address, uint256)`
- `TaxCollected(address, uint256)`

## 🧪 Testing

After deployment, test:

1. **Deposit:**
   ```solidity
   depositFunds{value: 0.0015 ether}()
   ```

2. **Finalize Game:**
   ```solidity
   finalizeGame(
     "game-123",
     player1,
     player2,
     1, // Rock
     2, // Paper
     0.001425 ether // betAmount (after tax)
   )
   ```

3. **Withdraw:**
   ```solidity
   withdrawFunds(0) // Withdraw all
   ```

## 📝 Deployment

1. Deploy `RockPaperScissorsV2.sol` to Base Sepolia
2. Update `NEXT_PUBLIC_CONTRACT_ADDRESS_V2` in `.env.local`
3. Update frontend to use new contract

## ⚠️ Migration Notes

- Old contract (V1) still exists for reference
- New contract (V2) is simpler and more efficient
- No queue management in contract (handled by Supabase)
- No choice handling in contract (handled by Supabase)
- Only results are written on-chain




