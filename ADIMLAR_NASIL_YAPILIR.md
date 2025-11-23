# 📍 Adım Adım: Hangi Dosyaya Gireceğim?

## 🎯 ÖZET: Hangi Klasörde Ne Yapılacak?

```
AGENT/
└── jan-ken/
    ├── contracts/          ← BURAYA GİR: .env dosyası oluştur
    └── jan-ken-app/        ← BURAYA GİR: Frontend için .env.local
```

---

## 📝 ADIM 1: Contracts .env Dosyası Oluştur

### Hangi Klasöre Gireceğim?
```
C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

### Nasıl Gireceğim?

**Terminal/PowerShell'de:**
```powershell
# Ana dizinden başla
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

### Ne Yapacağım?

**Seçenek 1: PowerShell ile Otomatik (ÖNERİLEN)**

```powershell
# contracts klasöründe
@"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
"@ | Out-File -FilePath .env -Encoding utf8
```

**Seçenek 2: Manuel Olarak**

1. `contracts` klasörüne git
2. Yeni dosya oluştur: `.env` (nokta ile başlamalı!)
3. İçine şunu yapıştır:

```env
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
```

**Seçenek 3: env.example'dan Kopyala**

```powershell
# contracts klasöründe
copy env.example .env
# Sonra .env dosyasını aç ve PRIVATE_KEY'i değiştir
```

### Kontrol Et

```powershell
# .env dosyasının oluştuğunu kontrol et
dir .env

# İçeriğini kontrol et
type .env
```

---

## 📝 ADIM 2: Frontend .env.local Dosyası Oluştur

### Hangi Klasöre Gireceğim?
```
C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app
```

### Nasıl Gireceğim?

```powershell
# Ana dizinden
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app
```

### Ne Yapacağım?

**PowerShell ile Otomatik:**

```powershell
# jan-ken-app klasöründe
@"
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**VEYA Manuel:**
1. `jan-ken-app` klasörüne git
2. Yeni dosya oluştur: `.env.local`
3. İçine yukarıdaki içeriği yapıştır

---

## 🚀 ADIM 3: Contract Deploy

### Hangi Klasöre Gireceğim?
```
C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

### Komutlar (Sırayla):

```powershell
# 1. contracts klasörüne git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# 2. Environment variables set et
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"

# 3. Compile et
forge build

# 4. Test et
forge test

# 5. Deploy et
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

---

## 📋 TAM YOL HARİTASI (Sırayla)

### 1️⃣ Contracts .env Oluştur

```powershell
# Terminal aç
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# .env dosyası oluştur
@"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
"@ | Out-File -FilePath .env -Encoding utf8

# Kontrol et
type .env
```

### 2️⃣ Frontend .env.local Oluştur

```powershell
# jan-ken-app klasörüne git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app

# .env.local dosyası oluştur
@"
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
"@ | Out-File -FilePath .env.local -Encoding utf8

# Kontrol et
type .env.local
```

### 3️⃣ Contract Deploy

```powershell
# contracts klasörüne geri dön
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# Environment variables
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"

# Build ve deploy
forge build
forge test
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

---

## 🎯 HIZLI REFERANS: Klasör Yapısı

```
C:\Users\deepn\Desktop\AGENT\
└── jan-ken\
    ├── contracts\                    ← BURAYA GİR: .env oluştur
    │   ├── .env                      ← BU DOSYAYI OLUŞTUR
    │   ├── src\
    │   │   └── RockPaperScissors.sol
    │   └── script\
    │       └── Deploy.s.sol
    │
    └── jan-ken-app\                  ← BURAYA GİR: .env.local oluştur
        ├── .env.local                ← BU DOSYAYI OLUŞTUR
        └── app\
```

---

## ✅ Kontrol Listesi

- [ ] `contracts\.env` dosyası oluşturuldu
- [ ] Private key eklendi
- [ ] `jan-ken-app\.env.local` dosyası oluşturuldu
- [ ] CDP API Key bilgileri eklendi
- [ ] `.gitignore` dosyaları kontrol edildi
- [ ] Contract deploy edildi
- [ ] Contract address kaydedildi

---

## 🆘 Sorun mu Var?

**Dosya bulunamadı hatası:**
```powershell
# Hangi klasörde olduğunu kontrol et
pwd
# veya
Get-Location

# Doğru klasöre git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

**Dosya oluşturulamıyor:**
- PowerShell'i **Yönetici olarak çalıştır**
- Veya manuel olarak klasörde sağ tık > Yeni > Metin Belgesi > `.env` olarak kaydet

---

**Şimdi adım adım yapabilirsin! 🚀**


