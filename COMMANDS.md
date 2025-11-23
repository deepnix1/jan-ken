# Jan KeN! - Komut Rehberi

## 🚀 Hızlı Başlangıç Komutları

### 1. Proje Oluşturma

```bash
# Ana dizinde
cd C:\Users\deepn\Desktop\AGENT
mkdir jan-ken
cd jan-ken

# OnchainKit projesi oluştur
npm create onchain@latest
# İsim: jan-ken-app
# Framework: Next.js
# CDP API Key: https://portal.cdp.coinbase.com/projects/api-keys/client-key

cd jan-ken-app
npm install
```

### 2. Foundry Kurulumu (Windows)

```powershell
# PowerShell'de çalıştır
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"

# Versiyon kontrolü
forge --version
cast --version
```

### 3. Contracts Klasörü Oluşturma

```bash
# Proje root'unda (jan-ken/)
mkdir contracts
cd contracts
forge init --no-git
```

### 4. Environment Variables (PowerShell)

```powershell
# .env dosyası oluştur (contracts klasöründe)
# env.example dosyasını .env olarak kopyala ve düzenle

# Environment variables set et
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="your_private_key_here"
```

### 5. Contract Compile ve Test

```bash
cd contracts

# Compile
forge build

# Test
forge test

# Verbose test
forge test -vvv
```

### 6. Contract Deploy (Base Sepolia)

```powershell
# PowerShell'de
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="your_private_key_here"

# Deploy script ile
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast

# VEYA manuel deploy
forge create ./src/RockPaperScissors.sol:RockPaperScissors --rpc-url $env:BASE_SEPOLIA_RPC_URL --private-key $env:PRIVATE_KEY
```

### 7. Contract Address Kontrolü

```bash
# Deploy sonrası çıkan address'i kopyala
# .env dosyasına ekle: ROCK_PAPER_SCISSORS_ADDRESS="0x..."

# Contract'ı kontrol et
cast call <CONTRACT_ADDRESS> "getContractBalance()(uint256)" --rpc-url $env:BASE_SEPOLIA_RPC_URL
```

### 8. Frontend Development

```bash
# Frontend dizinine git
cd ../jan-ken-app

# Development server başlat
npm run dev

# Build
npm run build

# Production
npm start
```

---

## 🔧 Yardımcı Komutlar

### Foundry Komutları

```bash
# Contract'ı temizle ve yeniden compile et
forge clean
forge build

# Test coverage
forge coverage

# Gas raporu
forge test --gas-report

# Contract'ı verify et (Base Sepolia)
forge verify-contract <CONTRACT_ADDRESS> src/RockPaperScissors.sol:RockPaperScissors --chain-id 84532 --etherscan-api-key <API_KEY>
```

### Cast Komutları (Contract Interaction)

```bash
# Contract balance kontrolü
cast balance <CONTRACT_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Contract'tan veri oku
cast call <CONTRACT_ADDRESS> "getMyGame(address)(tuple)" <PLAYER_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Transaction gönder (örnek: joinQueue)
cast send <CONTRACT_ADDRESS> "joinQueue(uint256)" <BET_AMOUNT> --value <BET_AMOUNT> --private-key $env:PRIVATE_KEY --rpc-url $env:BASE_SEPOLIA_RPC_URL
```

### Node.js Kontrolleri

```bash
# Node versiyonu
node --version  # 22.11.0+ olmalı

# npm versiyonu
npm --version

# Bağımlılıkları güncelle
npm update

# Bağımlılıkları kontrol et
npm audit
```

---

## 🐛 Hata Giderme Komutları

### Foundry Hataları

```bash
# Foundry cache temizle
forge clean

# Dependencies yeniden yükle
forge install

# Foundry update
foundryup
```

### Node.js Hataları

```bash
# node_modules temizle
rm -rf node_modules package-lock.json
npm install

# Cache temizle
npm cache clean --force
```

### Contract Deploy Hataları

```bash
# Gas limit artır
forge create ... --gas-limit 3000000

# Nonce kontrolü
cast nonce <YOUR_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Balance kontrolü
cast balance <YOUR_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL
```

---

## 📋 Deployment Checklist Komutları

```bash
# 1. Node.js versiyonu kontrol
node --version

# 2. Foundry versiyonu kontrol
forge --version

# 3. Contract compile
cd contracts && forge build

# 4. Test çalıştır
forge test

# 5. Balance kontrolü
cast balance <YOUR_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# 6. Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast

# 7. Contract address'i kaydet
# (Manuel olarak .env dosyasına ekle)

# 8. Frontend build
cd ../jan-ken-app && npm run build
```

---

## 🔐 Güvenlik Komutları

```bash
# .env dosyasını kontrol et (private key içermemeli)
cat .env | grep -v PRIVATE_KEY

# Git'te .env dosyası olmamalı
git status | grep .env

# .gitignore kontrolü
cat .gitignore | grep .env
```

---

## 📊 Monitoring Komutları

```bash
# Contract events izle
cast logs --from-block 0 --address <CONTRACT_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Transaction hash'ten bilgi al
cast tx <TX_HASH> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Block bilgisi
cast block latest --rpc-url $env:BASE_SEPOLIA_RPC_URL
```

---

## 💡 İpuçları

1. **PowerShell'de environment variables kalıcı değil**, her terminal açılışında tekrar set et
2. **Private key'i asla commit etme** - `.gitignore` kontrolü yap
3. **Testnet'te test et** - Mainnet'e geçmeden önce
4. **Gas limit'i kontrol et** - Büyük işlemlerde yetersiz olabilir
5. **Contract address'i kaydet** - Her deploy'da değişir

---

## 📞 Yardım

- Foundry Docs: https://book.getfoundry.sh
- Base Docs: https://docs.base.org
- OnchainKit Docs: https://onchainkit.xyz


