# 🔧 Environment Variables Kurulum Talimatları

## ⚡ Hızlı Kurulum

### PowerShell ile Otomatik Kurulum

```powershell
# Proje root'unda (jan-ken/)
.\setup-env.ps1
```

## 📝 Manuel Kurulum

### 1. Frontend Environment (.env.local)

**Dosya yolu:** `jan-ken-app/.env.local`

**İçerik:**
```env
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
```

**Oluşturma:**
```bash
cd jan-ken-app
# Windows
type nul > .env.local
# Linux/Mac
touch .env.local

# Sonra içeriği yukarıdaki gibi doldur
```

### 2. Contracts Environment (.env)

**Dosya yolu:** `contracts/.env`

**İçerik:**
```env
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="your_private_key_here"
ROCK_PAPER_SCISSORS_ADDRESS=""
```

**Oluşturma:**
```bash
cd contracts
copy env.example .env  # Windows
# veya
cp env.example .env    # Linux/Mac

# Sonra PRIVATE_KEY'i doldur
```

## ✅ Kontrol Listesi

- [ ] `jan-ken-app/.env.local` dosyası oluşturuldu
- [ ] CDP API Key bilgileri eklendi
- [ ] `contracts/.env` dosyası oluşturuldu
- [ ] PRIVATE_KEY eklendi (test wallet)
- [ ] `.gitignore` dosyaları kontrol edildi
- [ ] Dosyalar git'e commit edilmedi

## 🔒 Güvenlik Kontrolü

```bash
# .env dosyalarının git'te olmadığını kontrol et
git status | grep .env

# Eğer görünüyorsa:
git rm --cached jan-ken-app/.env.local
git rm --cached contracts/.env
```

## 🚀 Sonraki Adımlar

1. ✅ Environment dosyaları oluşturuldu
2. ⏭️ Base Sepolia ETH al
3. ⏭️ Contract deploy et
4. ⏭️ Contract address'i .env dosyalarına ekle
5. ⏭️ Frontend'i başlat: `cd jan-ken-app && npm run dev`

---

**Detaylı bilgi için:** `API_KEY_SETUP.md` dosyasına bak







