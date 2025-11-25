# ⚡ Jan KeN! - Hızlı Başlangıç

## 🚀 5 Dakikada Başla

### 1. Proje Oluştur

```bash
cd C:\Users\deepn\Desktop\AGENT
mkdir jan-ken && cd jan-ken
npm create onchain@latest
# İsim: jan-ken-app
cd jan-ken-app && npm install
```

### 2. Foundry Kur (Windows)

```powershell
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
foundryup
```

### 3. Contracts Setup

```bash
cd ..
mkdir contracts && cd contracts
forge init --no-git
# Contract dosyaları zaten hazır (jan-ken/contracts/ klasöründen kopyala)
```

### 4. Environment

```bash
# env.example'ı .env olarak kopyala
copy env.example .env
# .env dosyasını düzenle: PRIVATE_KEY ve RPC_URL'leri ekle
```

### 5. Base Sepolia ETH Al

- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Wallet adresini gir, ETH al

### 6. Deploy

```powershell
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="your_key"
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

### 7. Frontend

```bash
cd ../jan-ken-app
npm run dev
```

---

## 📚 Detaylı Rehberler

- **ADIM_ADIM_REHBER.md** - Tüm adımlar detaylı
- **COMMANDS.md** - Tüm komutlar
- **DEPLOYMENT_GUIDE.md** - Deployment rehberi
- **README.md** - Genel bilgiler

---

## ⚠️ Önemli Notlar

1. Node.js 22.11.0+ gerekli
2. Private key'i asla commit etme
3. Test için Base Sepolia kullan
4. Mainnet'e geçmeden önce test et

---

## 🆘 Hızlı Yardım

**Node.js hatası?**
```bash
node --version  # 22.11.0+ olmalı
nvm install --lts  # Güncelle
```

**Foundry bulunamadı?**
```powershell
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
```

**ETH yok?**
- Base Sepolia faucet'ten al
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

---

**İyi şanslar! 🍀**




