# 🔧 Detaylı Troubleshooting Rehberi

## ⚠️ Sorun: Localhost'ta Frontend Görünmüyor

## 🔍 Adım Adım Diagnostik

### 1. Frontend Process Kontrolü

```powershell
# Node process'ler çalışıyor mu?
Get-Process -Name node -ErrorAction SilentlyContinue

# Port 3000 kullanımda mı?
netstat -ano | findstr :3000
```

**Beklenen:**
- Node process'ler çalışıyor olmalı
- Port 3000 LISTENING durumunda olmalı

### 2. Terminal Çıktısını Kontrol Et

**Frontend başlatıldığında terminal'de şunlar görünmeli:**
```
▲ Next.js 15.3.4
- Local:        http://localhost:3000
- Ready in Xs
```

**Eğer hata varsa:**
- Kırmızı hata mesajları
- Compilation errors
- Module not found errors

### 3. Build Klasörü Kontrolü

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app1
Test-Path ".next"
```

**Eğer `.next` klasörü yoksa:**
- Build başarısız olmuş
- `npm run dev` komutunu tekrar çalıştır

### 4. Tarayıcı Kontrolü

1. **Doğru URL:** `http://localhost:3000` (http:// değil https://)
2. **Farklı tarayıcı dene:** Chrome, Firefox, Edge
3. **Incognito/Private mode dene**
4. **Cache temizle:** Ctrl+Shift+Delete

### 5. Console Hataları

**Tarayıcıda F12 → Console:**
- Kırmızı hata mesajları var mı?
- Network sekmesinde failed requests var mı?
- 404 errors var mı?

---

## 🛠️ Çözümler

### Çözüm 1: Frontend'i Tamamen Yeniden Başlat

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app1

# Tüm node process'leri durdur
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# .next klasörünü sil
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue

# Yeniden başlat
npm run dev
```

### Çözüm 2: Bağımlılıkları Yeniden Yükle

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app1

# node_modules temizle
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue

# Yeniden yükle
npm install

# Başlat
npm run dev
```

### Çözüm 3: Port Değiştir

```powershell
# Farklı port kullan
npm run dev -- -p 3001
```

Sonra tarayıcıda: `http://localhost:3001`

### Çözüm 4: Build Hatalarını Kontrol Et

```powershell
# Build yap (hata görmek için)
npm run build
```

Build hatalarını görürsün, onları düzelt.

---

## 📋 Kontrol Listesi

### Frontend Durumu
- [ ] `npm run dev` komutu çalışıyor
- [ ] Terminal'de "Ready" mesajı var
- [ ] Port 3000 açık (netstat ile kontrol)
- [ ] Node process'ler çalışıyor

### Tarayıcı
- [ ] Doğru URL: `http://localhost:3000`
- [ ] Farklı tarayıcı denendi
- [ ] Console açıldı (F12)
- [ ] Network sekmesi kontrol edildi

### Build
- [ ] `.next` klasörü var
- [ ] Build başarılı
- [ ] TypeScript hataları yok
- [ ] Import hataları yok

---

## 🆘 Hala Çalışmıyorsa

### Terminal Çıktısını Paylaş

Terminal'deki tam çıktıyı paylaş:
- Hata mesajları
- Warning'ler
- Build durumu

### Tarayıcı Console'unu Paylaş

F12 → Console sekmesindeki hataları paylaş

---

**Şimdi yukarıdaki adımları tek tek dene ve sonuçları paylaş!**





