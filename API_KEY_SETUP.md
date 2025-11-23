# 🔑 CDP API Key Kurulumu

CDP API Key bilgileriniz kaydedildi. Güvenli bir şekilde kullanmak için aşağıdaki adımları takip edin.

## ✅ API Key Bilgileri

- **API Key ID:** `f0532979-ad56-48aa-907a-bfd4fb535ceb`
- **API Key Secret:** `vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw==`

## 🚀 Hızlı Kurulum

### Otomatik Kurulum (PowerShell)

```powershell
# Proje root'unda (jan-ken/)
.\setup-env.ps1
```

Bu script:
- ✅ Frontend `.env.local` dosyasını oluşturur
- ✅ Contracts `.env` dosyasını oluşturur
- ✅ `.gitignore` dosyalarını kontrol eder

### Manuel Kurulum

#### 1. Frontend Environment Dosyası

`jan-ken-app/.env.local` dosyası oluştur:

```env
# CDP API Key
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="

# Contract Address (deploy sonrası doldurulacak)
NEXT_PUBLIC_CONTRACT_ADDRESS=""

# Base Network RPC URLs
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
```

#### 2. Contracts Environment Dosyası

`contracts/.env` dosyası oluştur (env.example'dan kopyala):

```env
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="your_private_key_here"  # Test wallet private key
ROCK_PAPER_SCISSORS_ADDRESS=""  # Deploy sonrası doldurulacak
```

## 🔒 Güvenlik Kontrolleri

### .gitignore Kontrolü

Frontend `.gitignore` dosyasında şunlar olmalı:

```gitignore
# Environment variables
.env.local
.env*.local
```

Contracts `.gitignore` dosyasında şunlar olmalı:

```gitignore
.env
```

### Kontrol Komutları

```bash
# .env.local dosyasının git'te olmadığını kontrol et
git status | grep .env.local

# Eğer görünüyorsa, .gitignore'a ekle
echo ".env.local" >> jan-ken-app/.gitignore
```

## 📝 OnchainKit'te Kullanım

OnchainKit, CDP API Key'i otomatik olarak `.env.local` dosyasından okuyacak. Ekstra bir şey yapmana gerek yok!

```typescript
// OnchainKit otomatik olarak şunları kullanır:
// NEXT_PUBLIC_CDP_API_KEY_ID
// NEXT_PUBLIC_CDP_API_KEY_SECRET
```

## ⚠️ Önemli Güvenlik Notları

1. **ASLA commit etme:**
   - `.env.local` dosyasını GitHub'a yükleme
   - `.env` dosyasını GitHub'a yükleme
   - API Key'leri public repository'lerde paylaşma

2. **Production'da:**
   - Environment variables kullan (Vercel, Netlify, vb.)
   - API Key'leri platform'un environment variables sistemine ekle

3. **Key rotation:**
   - Eğer key sızdırıldıysa, hemen yeni key oluştur
   - Eski key'i devre dışı bırak

## 🧪 Test

Frontend'i başlattığında API Key'in çalışıp çalışmadığını kontrol et:

```bash
cd jan-ken-app
npm run dev
```

Tarayıcıda `http://localhost:3000` açılmalı ve hata olmamalı.

## 🆘 Sorun Giderme

### Hata: "CDP API Key not found"

**Çözüm:**
1. `.env.local` dosyasının `jan-ken-app/` klasöründe olduğundan emin ol
2. Dosya adının tam olarak `.env.local` olduğundan emin ol
3. Environment variables'ın `NEXT_PUBLIC_` ile başladığından emin ol
4. Frontend'i yeniden başlat: `npm run dev`

### Hata: "Invalid API Key"

**Çözüm:**
1. API Key ID ve Secret'ın doğru kopyalandığından emin ol
2. Tırnak işaretlerinin doğru olduğundan emin ol
3. Coinbase Developer Portal'da key'in aktif olduğunu kontrol et

## 📞 Yardım

- [OnchainKit Docs](https://onchainkit.xyz)
- [Coinbase Developer Portal](https://portal.cdp.coinbase.com)
- [Base Docs](https://docs.base.org)

---

**✅ API Key kurulumu tamamlandı! Artık projeyi geliştirmeye başlayabilirsin.**


