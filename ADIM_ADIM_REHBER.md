# 🎯 Jan KeN! - Adım Adım Yol Haritası

Bu rehber, "Jan KeN!" uygulamasını sıfırdan geliştirmek için gereken tüm adımları içerir.

---

## 📋 GENEL BAKIŞ

**Uygulama:** Jan KeN! - Base ağında taş-kağıt-makas oyunu  
**Teknolojiler:** Solidity, Foundry, Next.js, OnchainKit, Base Network  
**Süre:** ~4-6 saat (ilk kez)

---

## 🚀 ADIM 1: HAZIRLIK (15 dakika)

### 1.1 Gereksinimleri Kontrol Et

```bash
# Node.js versiyonu (22.11.0+ olmalı)
node --version

# npm versiyonu
npm --version

# Git kurulu mu?
git --version
```

**Eğer Node.js yoksa veya eski versiyondaysa:**
- https://nodejs.org adresinden LTS versiyonu indir
- Veya `nvm` kullan: `nvm install --lts && nvm use --lts`

### 1.2 CDP API Key Al

1. https://portal.cdp.coinbase.com adresine git
2. Hesap oluştur/giriş yap
3. "Projects" > "Create Project"
4. "API Keys" > "Create Client Key"
5. Key'i kopyala (sonra kullanılacak)

### 1.3 Test Wallet Oluştur

1. MetaMask veya başka bir wallet kur
2. Yeni bir test wallet oluştur
3. Private key'i güvenli bir yerde sakla (ASLA paylaşma!)

**ÖNEMLİ:** Bu wallet sadece test için kullanılacak, gerçek para koyma!

---

## 🔨 ADIM 2: PROJE KURULUMU (30 dakika)

### 2.1 Dizin Oluştur

```bash
# Ana dizinde
cd C:\Users\deepn\Desktop\AGENT
mkdir jan-ken
cd jan-ken
```

### 2.2 OnchainKit Projesi Oluştur

```bash
npm create onchain@latest
```

**Prompt'lara cevap ver:**
- **Project name:** `jan-ken-app`
- **Framework:** `Next.js` (varsayılan)
- **CDP API Key:** Yukarıda aldığın key'i yapıştır
- **Package manager:** `npm` (veya tercih ettiğin)

### 2.3 Proje Dizinine Geç ve Bağımlılıkları Yükle

```bash
cd jan-ken-app
npm install
```

**Hata Kontrolü:**
- ❌ `npm ERR! engine Unsupported platform` → Node.js versiyonunu güncelle
- ❌ `npm ERR! peer dep missing` → `npm install` tekrar çalıştır
- ✅ Başarılı → Devam et

### 2.4 İlk Test

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` açılmalı. Eğer açılırsa, kurulum başarılı! ✅

**Ctrl+C ile durdur.**

---

## ⚒️ ADIM 3: FOUNDRY KURULUMU (20 dakika)

### 3.1 Contracts Klasörü Oluştur

```bash
# Proje root'unda (jan-ken/)
cd ..
mkdir contracts
cd contracts
```

### 3.2 Foundry Kur (Windows)

**PowerShell'de çalıştır:**

```powershell
# Foundry indir ve kur
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"

# Foundry'yi güncelle
foundryup
```

**Alternatif (Git Bash veya WSL):**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 3.3 Foundry Versiyonunu Kontrol Et

```bash
forge --version
cast --version
```

**Hata Kontrolü:**
- ❌ `forge: command not found` → PATH'e ekle veya terminali yeniden başlat
- ✅ Versiyon gösteriliyor → Başarılı!

### 3.4 Foundry Projesi İnitialize Et

```bash
# contracts klasöründe
forge init --no-git
```

**Hata Kontrolü:**
- ❌ Git hatası → `--no-git` flag'i kullanıldığından emin ol
- ✅ `src/`, `test/`, `script/` klasörleri oluştu → Başarılı!

### 3.5 Mevcut Contract Dosyalarını Kopyala

Contract dosyaları zaten oluşturuldu:
- `contracts/src/RockPaperScissors.sol` ✅
- `contracts/script/Deploy.s.sol` ✅
- `contracts/test/RockPaperScissors.t.sol` ✅

Eğer bu dosyalar yoksa, `jan-ken/contracts/` klasöründen kopyala.

---

## 💎 ADIM 4: ENVIRONMENT SETUP (15 dakika)

### 4.1 .env Dosyası Oluştur

```bash
# contracts klasöründe
# env.example dosyasını .env olarak kopyala
copy env.example .env  # Windows
# veya
cp env.example .env    # Linux/Mac
```

### 4.2 .env Dosyasını Düzenle

`.env` dosyasını aç ve şunları doldur:

```env
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="your_private_key_here"  # Test wallet private key
ROCK_PAPER_SCISSORS_ADDRESS=""  # Deploy sonrası doldurulacak
```

**ÖNEMLİ:** 
- Private key'i test wallet'ından al
- Asla gerçek wallet private key'ini kullanma!
- `.env` dosyasını `.gitignore`'a ekle

### 4.3 Base Sepolia ETH Al

Test için ücretsiz ETH al:

1. **Coinbase Faucet:**
   - https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Wallet adresini gir
   - ETH al (genellikle 0.1 ETH)

2. **Alchemy Faucet:**
   - https://www.alchemy.com/faucets/base-sepolia
   - Wallet adresini gir
   - ETH al

**Kontrol:**
- MetaMask'te Base Sepolia network'ü ekle
- Wallet'ta ETH görünüyor mu? ✅

---

## 🧪 ADIM 5: CONTRACT TEST (20 dakika)

### 5.1 Contract Compile Et

```bash
# contracts klasöründe
forge build
```

**Hata Kontrolü:**
- ❌ Compilation errors → Contract kodunu kontrol et
- ❌ Missing dependencies → `forge install` komutlarını çalıştır
- ✅ `out/` klasörü oluştu → Başarılı!

### 5.2 Testleri Çalıştır

```bash
forge test
```

**Hata Kontrolü:**
- ❌ Test failures → Test dosyasını kontrol et
- ✅ Tüm testler geçti → Başarılı!

**Verbose output için:**
```bash
forge test -vvv
```

---

## 🚀 ADIM 6: CONTRACT DEPLOY (30 dakika)

### 6.1 Environment Variables Set Et (PowerShell)

```powershell
# PowerShell'de
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="your_private_key_here"
```

**ÖNEMLİ:** Her yeni terminal açılışında tekrar set etmen gerekir!

### 6.2 Deploy Script ile Deploy

```bash
# contracts klasöründe
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

**VEYA manuel deploy:**

```bash
forge create ./src/RockPaperScissors.sol:RockPaperScissors \
  --rpc-url $env:BASE_SEPOLIA_RPC_URL \
  --private-key $env:PRIVATE_KEY
```

### 6.3 Deploy Sonuçlarını Kaydet

Deploy başarılı olduğunda şunu göreceksin:

```
Deployed to: 0x1234567890abcdef...
```

**Yapılacaklar:**
1. Contract address'i kopyala
2. `.env` dosyasına ekle: `ROCK_PAPER_SCISSORS_ADDRESS="0x..."`
3. Frontend'de kullanılacak

### 6.4 Contract'ı Kontrol Et

```bash
# Contract balance kontrolü
cast balance <CONTRACT_ADDRESS> --rpc-url $env:BASE_SEPOLIA_RPC_URL

# Contract'tan veri oku (örnek)
cast call <CONTRACT_ADDRESS> "getContractBalance()(uint256)" --rpc-url $env:BASE_SEPOLIA_RPC_URL
```

**Hata Kontrolü:**
- ❌ `insufficient funds` → Base Sepolia ETH al
- ❌ `execution reverted` → Constructor parametrelerini kontrol et
- ✅ Başarılı → Devam et!

---

## 🎨 ADIM 7: FRONTEND GELİŞTİRME (2-3 saat)

### 7.1 Contract ABI'yi Al

```bash
# contracts klasöründe
# jq kurulu olmalı (yoksa manuel olarak JSON'dan ABI'yi kopyala)
cat out/RockPaperScissors.sol/RockPaperScissors.json | jq .abi > ../jan-ken-app/lib/abi.json
```

**jq yoksa:**
1. `out/RockPaperScissors.sol/RockPaperScissors.json` dosyasını aç
2. `abi` kısmını kopyala
3. `jan-ken-app/lib/abi.json` dosyasına yapıştır

### 7.2 Frontend Dosyalarını Oluştur

Aşağıdaki dosyaları oluştur (kodlar `frontend-setup.md`'de):

1. `jan-ken-app/lib/contract.ts` - Contract address ve ABI
2. `jan-ken-app/app/calls.ts` - Contract calls
3. `jan-ken-app/components/BetSelector.tsx` - Bahis seçici
4. `jan-ken-app/components/GameBoard.tsx` - Oyun ekranı
5. `jan-ken-app/components/Timer.tsx` - Timer
6. `jan-ken-app/components/Matchmaking.tsx` - Eşleştirme
7. `jan-ken-app/components/Result.tsx` - Sonuç

### 7.3 Ana Sayfayı Güncelle

`jan-ken-app/app/page.tsx` dosyasını düzenle ve oyun arayüzünü ekle.

### 7.4 Test Et

```bash
cd jan-ken-app
npm run dev
```

Tarayıcıda test et:
- Wallet bağlantısı çalışıyor mu?
- Bahis seçimi çalışıyor mu?
- Contract interaction çalışıyor mu?

---

## 🔄 ADIM 8: EŞLEŞTİRME SİSTEMİ (1-2 saat)

### 8.1 Seçenekler

**Seçenek 1: Smart Contract İçinde (Basit)**
- Contract'ta bekleme listesi
- İki oyuncu geldiğinde otomatik eşleşme
- ✅ Zaten implement edildi!

**Seçenek 2: Off-chain Backend (Önerilen)**
- Backend API oluştur
- WebSocket ile real-time eşleştirme
- Daha esnek ve gas-efficient

### 8.2 Frontend'de Eşleştirme UI

- Loading animasyonu
- "Eşleşme aranıyor..." mesajı
- Bekleme süresi gösterimi

---

## ✅ ADIM 9: TEST (1 saat)

### 9.1 Local Test

```bash
# Contract testleri
cd contracts
forge test

# Frontend test
cd ../jan-ken-app
npm run dev
```

### 9.2 Testnet Test

1. **İki farklı wallet ile test:**
   - Wallet 1: Bahis yatır
   - Wallet 2: Aynı bahis seviyesinde bahis yatır
   - Eşleşme oluyor mu? ✅
   - Oyun başlıyor mu? ✅

2. **Oyun testi:**
   - Seçim yapılıyor mu? ✅
   - Timer çalışıyor mu? ✅
   - Sonuç doğru mu? ✅

3. **Ödeme testi:**
   - Kazanan para alıyor mu? ✅
   - Kaybeden para kaybediyor mu? ✅

### 9.3 Hata Senaryoları

- Süre dolduğunda ne oluyor?
- Berabere durumunda ne oluyor?
- Bir oyuncu seçim yapmazsa ne oluyor?

---

## 🚢 ADIM 10: DEPLOYMENT (30 dakika)

### 10.1 Mainnet Deploy (DİKKATLİ!)

**ÖNEMLİ:** Mainnet'e geçmeden önce:
- ✅ Tüm testler geçti
- ✅ Contract audit edildi (mümkünse)
- ✅ Güvenlik kontrolleri yapıldı
- ✅ Yeterli ETH var (gas için)

```bash
# contracts klasöründe
$env:BASE_RPC_URL="https://mainnet.base.org"
$env:PRIVATE_KEY="mainnet_private_key"  # DİKKAT: Gerçek wallet!

forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_RPC_URL --broadcast
```

### 10.2 Frontend Deploy

**Vercel (Önerilen):**
```bash
cd jan-ken-app
npm install -g vercel
vercel
```

**Environment Variables:**
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Mainnet contract address

---

## 🎉 TAMAMLANDI!

Artık "Jan KeN!" uygulaman hazır! 🎊

### Sonraki İyileştirmeler

1. **UI/UX:**
   - Animasyonlar
   - Ses efektleri
   - Daha iyi görsel tasarım

2. **Özellikler:**
   - İstatistikler
   - Liderlik tablosu
   - Turnuva modu

3. **Güvenlik:**
   - Contract audit
   - Bug bounty programı

---

## 🐛 Sorun mu Yaşıyorsun?

1. **Hata mesajını kontrol et**
2. **COMMANDS.md dosyasına bak**
3. **GitHub Issues'da ara**
4. **Base Discord'da sor**

---

**İyi şanslar! 🍀**





