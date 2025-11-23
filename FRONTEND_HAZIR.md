# ✅ Frontend Hazır!

## 🎉 Tamamlananlar

1. ✅ OnchainKit projesi oluşturuldu (`jan-ken-app1`)
2. ✅ Bağımlılıklar yüklendi (`npm install`)
3. ✅ `.env.local` dosyası oluşturuldu (CDP API Key'ler eklendi)
4. ✅ Frontend component'leri oluşturuldu:
   - ✅ `BetSelector.tsx` - Bahis seviyesi seçimi
   - ✅ `Matchmaking.tsx` - Eşleştirme ekranı
   - ✅ `GameBoard.tsx` - Oyun tahtası (40 saniyelik timer)
   - ✅ `Result.tsx` - Sonuç ekranı
5. ✅ Contract entegrasyonu (`lib/contract.ts`)
6. ✅ Ana sayfa güncellendi (`app/page.tsx`)
7. ✅ Base Sepolia network yapılandırıldı

## 📋 Sonraki Adımlar

### 1. Contract Deploy (GEREKLİ)

**Foundry kurulumu:**
```powershell
# Foundry kur (Windows)
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
foundryup
```

**Contract deploy:**
```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# Environment variables
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"

# Deploy
forge build
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

### 2. Contract Address'i Ekle

Deploy sonrası çıkan address'i:

**`jan-ken-app1/.env.local` dosyasına ekle:**
```env
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..." # Deploy sonrası çıkan address
```

### 3. Frontend'i Başlat

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app1
npm run dev
```

Tarayıcıda `http://localhost:3000` açılacak.

## 🎮 Oyun Akışı

1. **Wallet Bağla** - MetaMask veya başka bir wallet
2. **Bahis Seç** - $5, $10, $50, veya $100
3. **Eşleşme** - Aynı bahis seviyesindeki oyuncu aranıyor
4. **Oyun** - 40 saniye içinde taş, kağıt veya makas seç
5. **Sonuç** - Kazanan tüm bahisi alır

## 📁 Oluşturulan Dosyalar

```
jan-ken-app1/
├── app/
│   ├── page.tsx              ✅ Oyun ana sayfası
│   ├── layout.tsx            ✅ Metadata güncellendi
│   └── rootProvider.tsx      ✅ Base Sepolia yapılandırıldı
├── components/
│   ├── BetSelector.tsx       ✅ Bahis seçici
│   ├── Matchmaking.tsx       ✅ Eşleştirme
│   ├── GameBoard.tsx         ✅ Oyun tahtası
│   └── Result.tsx            ✅ Sonuç ekranı
├── lib/
│   └── contract.ts           ✅ Contract ABI ve address
└── .env.local                ✅ CDP API Key'ler
```

## ⚠️ Önemli Notlar

1. **Contract Address:** Deploy sonrası `.env.local` dosyasına eklenmeli
2. **Base Sepolia:** Test için Base Sepolia network kullanılıyor
3. **Wallet:** Base Sepolia network'üne bağlı olmalı
4. **ETH:** Base Sepolia ETH gerekli (faucet'ten al)

## 🐛 Olası Sorunlar

### Hata: "Contract address not found"
**Çözüm:** `.env.local` dosyasında `NEXT_PUBLIC_CONTRACT_ADDRESS` değerini kontrol et

### Hata: "Network mismatch"
**Çözüm:** Wallet'ı Base Sepolia network'üne bağla

### Hata: "Insufficient funds"
**Çözüm:** Base Sepolia faucet'ten ETH al

---

**Frontend hazır! Şimdi contract deploy et ve test et! 🚀**


