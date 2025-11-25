# 🔧 OnchainKit Projesi Manuel Oluşturma

## ⚠️ Durum

OnchainKit projesi otomatik oluşturulurken interaktif prompt'a takıldı. Manuel olarak oluşturman gerekiyor.

## 📝 Adım Adım

### 1. Yeni PowerShell Penceresi Aç

**ÖNEMLİ:** Mevcut terminal'i kapat ve yeni bir PowerShell penceresi aç.

### 2. Proje Dizinine Git

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken
```

### 3. OnchainKit Projesi Oluştur

```powershell
npm create onchain@latest jan-ken-app
```

### 4. Prompt'lara Cevap Ver

Sırayla şunları soracak:

1. **Project name:** `jan-ken-app` (zaten belirtildi, Enter'a bas)
2. **Framework:** `Next.js` seç (varsayılan, Enter'a bas)
3. **CDP API Key ID:** `f0532979-ad56-48aa-907a-bfd4fb535ceb` yapıştır, Enter
4. **CDP API Key Secret:** `vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw==` yapıştır, Enter

### 5. Proje Oluşturulduktan Sonra

```powershell
cd jan-ken-app
npm install
```

### 6. .env.local Dosyasını Kontrol Et

```powershell
type .env.local
```

CDP API Key bilgilerinin doğru olduğundan emin ol.

---

## ✅ Kontrol

Proje başarıyla oluşturulduysa:

```powershell
# package.json var mı?
Test-Path package.json

# .env.local var mı?
Test-Path .env.local

# node_modules var mı? (npm install sonrası)
Test-Path node_modules
```

---

## 🚀 Sonrası

OnchainKit projesi oluşturulduktan SONRA bana haber ver, frontend dosyalarını ekleyeceğim.

---

**Şimdi yukarıdaki adımları takip et ve OnchainKit projesini oluştur!**




