# Jan KeN! Deployment Rehberi

## 📋 Adım Adım Deployment

### 1. Proje Kurulumu

```bash
# Ana dizinde
cd C:\Users\deepn\Desktop\AGENT\jan-ken

# OnchainKit projesi oluştur
npm create onchain@latest
# İsim: jan-ken-app
# CDP API Key: https://portal.cdp.coinbase.com/projects/api-keys/client-key

cd jan-ken-app
npm install
```

### 2. Foundry Kurulumu

```bash
# contracts klasörüne git
cd contracts

# Foundry kur (Windows PowerShell)
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"

# Foundry versiyonunu kontrol et
forge --version

# Proje initialize et
forge init --no-git
```

### 3. Environment Setup

```bash
# .env dosyası oluştur
copy .env.example .env

# .env dosyasını düzenle:
# - PRIVATE_KEY: Test wallet private key
# - BASE_SEPOLIA_RPC_URL: https://sepolia.base.org
```

**ÖNEMLİ:** Base Sepolia ETH al:
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- https://www.alchemy.com/faucets/base-sepolia

### 4. Contract Deploy

```powershell
# PowerShell'de environment variables set et
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="your_private_key_here"

# Contract compile et
forge build

# Contract deploy et
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast --verify

# VEYA manuel deploy
forge create ./src/RockPaperScissors.sol:RockPaperScissors --rpc-url $env:BASE_SEPOLIA_RPC_URL --private-key $env:PRIVATE_KEY
```

**Deploy sonrası:**
1. Contract address'i kopyala
2. `.env` dosyasına ekle: `ROCK_PAPER_SCISSORS_ADDRESS="0x..."`
3. Frontend'de kullan

### 5. Contract Test

```bash
# Testleri çalıştır
forge test

# Verbose output ile
forge test -vvv
```

### 6. Frontend Setup

```bash
# Frontend dizinine git
cd ../jan-ken-app

# Gerekli dosyaları oluştur (sonraki adımda)
```

### 7. Contract Address'i Frontend'e Ekle

`jan-ken-app/app/calls.ts` dosyasını oluştur ve contract address'i ekle.

---

## 🔍 Hata Kontrolü

### Hata: Node.js Versiyonu
```bash
node --version  # 22.11.0+ olmalı
```

### Hata: Foundry Bulunamadı
```powershell
# PATH'e ekle
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
```

### Hata: Insufficient Funds
- Base Sepolia faucet'ten ETH al
- Wallet'ta yeterli ETH olduğundan emin ol

### Hata: Contract Deploy Hatası
- Private key doğru mu?
- RPC URL çalışıyor mu?
- Yeterli ETH var mı?

---

## ✅ Deployment Checklist

- [ ] Node.js 22.11.0+ yüklü
- [ ] Foundry kurulu
- [ ] Base Sepolia ETH alındı
- [ ] .env dosyası oluşturuldu
- [ ] Contract compile edildi
- [ ] Testler geçti
- [ ] Contract deploy edildi
- [ ] Contract address kaydedildi
- [ ] Frontend'e address eklendi

---

## 📞 Sonraki Adımlar

1. Frontend geliştirme
2. Eşleştirme sistemi
3. UI/UX iyileştirmeleri
4. Test
5. Mainnet deployment




