# Farcaster Mini App Manifest Setup Guide

Bu dokümantasyon, Farcaster Mini App manifest'inin nasıl kurulacağını ve imzalanacağını açıklar.

## 📋 Gereksinimler

1. **Domain**: Production domain'iniz hazır olmalı (örn: `https://your-app.vercel.app`)
2. **Farcaster Developer Account**: Manifest'i imzalamak için gerekli

## 🔧 Kurulum Adımları

### 1. Manifest Dosyasını Güncelle

`public/.well-known/farcaster.json` dosyasını açın ve domain bilgilerinizi güncelleyin:

```json
{
  "accountAssociation": {
    "header": "PLACEHOLDER_HEADER",
    "payload": "PLACEHOLDER_PAYLOAD",
    "signature": "PLACEHOLDER_SIGNATURE"
  },
  "frame": {
    "version": "1",
    "name": "JaN KeN!",
    "iconUrl": "https://YOUR_DOMAIN.com/new_logo.png",
    "homeUrl": "https://YOUR_DOMAIN.com",
    "imageUrl": "https://YOUR_DOMAIN.com/new_logo.png",
    "buttonTitle": "Play JaN KeN!",
    "splashImageUrl": "https://YOUR_DOMAIN.com/new_logo.png",
    "splashBackgroundColor": "#000000"
  }
}
```

**Önemli:** `YOUR_DOMAIN` yerine gerçek domain'inizi yazın (örn: `https://jan-ken.vercel.app`)

### 2. Manifest'i İmzala

1. **Farcaster Developer Portal'a gidin:**
   - https://farcaster.xyz/~/developers/mini-apps/manifest

2. **Domain'inizi girin:**
   - Örn: `your-app.vercel.app` (subdomain dahil)

3. **Manifest'i imzalayın:**
   - Portal size `accountAssociation` objesini verecek
   - Bu objeyi kopyalayın

4. **İmzalı manifest'i güncelleyin:**
   - `public/.well-known/farcaster.json` dosyasındaki `accountAssociation` objesini güncelleyin
   - İmzalı `header`, `payload`, ve `signature` değerlerini yapıştırın

### 3. Manifest'i Deploy Edin

```bash
# Build ve deploy
npm run build
# Vercel'e deploy edin veya hosting provider'ınıza yükleyin
```

### 4. Manifest'i Doğrula

Deploy sonrası manifest'in erişilebilir olduğunu kontrol edin:

```bash
curl https://YOUR_DOMAIN.com/.well-known/farcaster.json
```

**Beklenen çıktı:**
- HTTP 200 status code
- Valid JSON format
- `accountAssociation` objesi imzalı olmalı
- `frame` objesi tüm gerekli alanları içermeli

## ✅ Checklist

- [ ] `public/.well-known/farcaster.json` dosyası oluşturuldu
- [ ] Domain bilgileri güncellendi (`YOUR_DOMAIN` placeholder'ları değiştirildi)
- [ ] Manifest Farcaster Developer Portal'da imzalandı
- [ ] İmzalı `accountAssociation` objesi manifest dosyasına eklendi
- [ ] Manifest deploy edildi
- [ ] Manifest erişilebilir (`curl` testi başarılı)
- [ ] `fc:miniapp` meta tag'i `layout.tsx`'e eklendi (✅ Yapıldı)
- [ ] `sdk.actions.ready()` çağrılıyor (✅ Yapıldı)

## 🔍 Troubleshooting

### Manifest 404 Hatası

**Sorun:** `/.well-known/farcaster.json` 404 döndürüyor

**Çözüm:**
- Next.js'te `public` klasöründeki dosyalar otomatik olarak serve edilir
- Dosya yolu: `public/.well-known/farcaster.json`
- Build sonrası `.next` klasöründe kontrol edin

### Manifest İmzalama Hatası

**Sorun:** Farcaster Developer Portal manifest'i imzalayamıyor

**Çözüm:**
- Domain'in tam olarak doğru olduğundan emin olun (subdomain dahil)
- Manifest JSON formatının geçerli olduğundan emin olun
- `version` alanının `"1"` olduğundan emin olun (NOT `"next"`)

### Embed Preview Görünmüyor

**Sorun:** Farcaster'da link paylaşıldığında embed preview görünmüyor

**Çözüm:**
- `layout.tsx`'de `fc:miniapp` meta tag'inin olduğundan emin olun
- Meta tag'deki `imageUrl`'in erişilebilir olduğundan emin olun
- Image'ın 3:2 aspect ratio'da olduğundan emin olun

## 📚 Referanslar

- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz/docs/getting-started)
- [Manifest Signing Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)
- [AI Agent Checklist](https://miniapps.farcaster.xyz/docs/guides/agents-checklist)



