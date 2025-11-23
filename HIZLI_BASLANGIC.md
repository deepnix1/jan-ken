# ⚡ Hızlı Başlangıç - Tek Tek Komutlar

## 🎯 Tek Seferde Her Şeyi Yap

Aşağıdaki komutları **sırayla** PowerShell'de çalıştır:

---

## 📝 ADIM 1: Contracts .env Dosyası

```powershell
# 1. contracts klasörüne git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# 2. .env dosyası oluştur
@"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
"@ | Out-File -FilePath .env -Encoding utf8

# 3. Kontrol et (dosyanın oluştuğunu gör)
type .env
```

**✅ Başarılı olduysa:** `.env` dosyası görünmeli

---

## 📝 ADIM 2: Frontend .env.local Dosyası

```powershell
# 1. jan-ken-app klasörüne git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app

# 2. .env.local dosyası oluştur
@"
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
"@ | Out-File -FilePath .env.local -Encoding utf8

# 3. Kontrol et
type .env.local
```

**✅ Başarılı olduysa:** `.env.local` dosyası görünmeli

---

## 🚀 ADIM 3: Contract Deploy

```powershell
# 1. contracts klasörüne geri dön
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# 2. Environment variables set et
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"

# 3. Compile et
forge build

# 4. Test et (opsiyonel ama önerilir)
forge test

# 5. Deploy et
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

**✅ Başarılı olduysa:** Contract address gösterilecek, kopyala!

---

## 📋 Deploy Sonrası

### Contract Address'i Kaydet

Deploy sonrası çıkan address'i kopyala ve:

**1. contracts/.env dosyasına ekle:**
```powershell
# contracts klasöründe
# .env dosyasını aç ve şunu ekle:
ROCK_PAPER_SCISSORS_ADDRESS="0x..." # Deploy sonrası çıkan address
```

**2. jan-ken-app/.env.local dosyasına ekle:**
```powershell
# jan-ken-app klasöründe
# .env.local dosyasını aç ve şunu güncelle:
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..." # Aynı address
```

---

## 🎯 Özet: Hangi Klasörde Ne Var?

| Klasör | Dosya | Ne İçin? |
|--------|-------|----------|
| `contracts/` | `.env` | Private key, RPC URL'leri |
| `jan-ken-app/` | `.env.local` | CDP API Key, Contract address |

---

## ✅ Kontrol Komutları

```powershell
# .env dosyalarının oluştuğunu kontrol et
Test-Path C:\Users\deepn\Desktop\AGENT\jan-ken\contracts\.env
Test-Path C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app\.env.local

# Her ikisi de True dönmeli
```

---

**Şimdi yukarıdaki komutları sırayla çalıştır! 🚀**


