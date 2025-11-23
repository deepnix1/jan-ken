# 🔧 Frontend Sorun Giderme

## ⚠️ Sorun: Localhost'ta Bir Şey Görünmüyor

## 🔍 Kontrol Adımları

### 1. Frontend Çalışıyor mu?

**Terminal'de kontrol et:**
- `npm run dev` komutu çalışıyor mu?
- Hata mesajı var mı?
- "Ready" mesajı görünüyor mu?

### 2. Tarayıcı Kontrolü

1. **Doğru URL:** `http://localhost:3000` (http:// değil https://)
2. **Console'u aç:** F12 tuşuna bas
3. **Hata var mı?** Console'da kırmızı hata mesajları var mı?

### 3. Port Kontrolü

**Port 3000 kullanımda mı?**
```powershell
netstat -ano | findstr :3000
```

Eğer başka bir process kullanıyorsa:
- O process'i durdur
- Veya farklı port kullan: `npm run dev -- -p 3001`

### 4. Build Hataları

**Terminal'de build hatası var mı?**
- TypeScript hataları
- Import hataları
- Component hataları

---

## ✅ Hızlı Çözümler

### Çözüm 1: Frontend'i Yeniden Başlat

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app1

# Tüm node process'leri durdur
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Yeniden başlat
npm run dev
```

### Çözüm 2: Port Değiştir

```powershell
npm run dev -- -p 3001
```

Sonra tarayıcıda: `http://localhost:3001`

### Çözüm 3: Cache Temizle

```powershell
# .next klasörünü sil
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue

# node_modules temizle (opsiyonel)
# Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
# npm install

# Yeniden başlat
npm run dev
```

### Çözüm 4: Bağımlılıkları Kontrol Et

```powershell
npm install
npm run dev
```

---

## 🐛 Yaygın Hatalar

### Hata: "Module not found"
**Çözüm:** `npm install` çalıştır

### Hata: "Port already in use"
**Çözüm:** Port'u değiştir veya kullanan process'i durdur

### Hata: "Cannot find module"
**Çözüm:** `node_modules` klasörünü kontrol et, `npm install` çalıştır

### Hata: TypeScript hataları
**Çözüm:** Component dosyalarını kontrol et, import'ları düzelt

---

## 📋 Kontrol Listesi

- [ ] `npm run dev` komutu çalışıyor
- [ ] Terminal'de "Ready" mesajı var
- [ ] Port 3000 açık
- [ ] Tarayıcıda `http://localhost:3000` açıldı
- [ ] Console'da hata yok (F12)
- [ ] Sayfa yükleniyor

---

**Şimdi terminal'deki çıktıyı kontrol et ve hata var mı bak!**



