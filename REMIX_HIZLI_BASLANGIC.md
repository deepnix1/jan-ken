# ⚡ Remix IDE - Hızlı Başlangıç

## 🚀 5 Dakikada Deploy

### 1. Remix IDE'yi Aç
👉 https://remix.ethereum.org

### 2. Contract Dosyasını Oluştur
- Sol panelde "+" butonuna tıkla
- "New File" seç
- Dosya adı: `RockPaperScissors.sol`
- `RockPaperScissors_Remix.sol` dosyasındaki kodu kopyala-yapıştır

### 3. Compile Et
- Sol panelde "Solidity Compiler" (⚙️)
- Compiler: `0.8.20`
- "Compile RockPaperScissors.sol" tıkla

### 4. MetaMask Hazırla
- Base Sepolia network ekle (Chain ID: 84532)
- Base Sepolia ETH al: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- MetaMask'ta Base Sepolia'yı seç

### 5. Deploy Et
- "Deploy & Run Transactions" (🚀)
- Environment: `Injected Provider - MetaMask`
- Contract: `RockPaperScissors`
- "Deploy" tıkla
- MetaMask'ta onayla

### 6. Address'i Kaydet
- Deploy sonrası contract address'i kopyala
- `jan-ken-app1/.env.local` dosyasına ekle:
  ```
  NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."
  ```

---

## 📋 Contract Kodu

Contract kodu: `contracts/RockPaperScissors_Remix.sol` dosyasında

---

## ✅ Başarı Kontrolü

Deploy sonrası Remix'te:
- ✅ Contract address görünüyor
- ✅ BET_LEVEL_1, BET_LEVEL_2 fonksiyonları görünüyor
- ✅ getMyGame fonksiyonu görünüyor

---

**Detaylı rehber: `REMIX_IDE_DEPLOY.md`**


