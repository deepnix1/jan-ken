# Farcaster Mini App Resmi Yayınlama Rehberi

Farcaster'ın resmi dokümantasyonuna göre: https://miniapps.farcaster.xyz/docs/getting-started

## 🚀 Adım 1: Developer Mode'u Açın

1. **Farcaster'a Giriş Yapın**
   - Mobile veya desktop'ta Farcaster'a giriş yapın
   - Warpcast kullanıyorsanız: https://warpcast.com

2. **Developer Mode'u Aktifleştirin**
   - Bu linke gidin: https://farcaster.xyz/~/settings/developer-tools
   - "Developer Mode" toggle'ını açın
   - Desktop'ta sol tarafta "Developer" bölümü görünecek

3. **Developer Tools'a Erişin**
   - Desktop'ta sol menüde "Developer" sekmesi görünecek
   - Bu bölümden manifest oluşturabilir, preview yapabilir ve analytics görebilirsiniz

## 📝 Adım 2: App'i Publish Edin

Farcaster dokümantasyonuna göre, app'inizi publish etmek için manifest oluşturmanız gerekiyor.

### Manifest Oluşturma

1. **Developer Tools'a Gidin**
   - Desktop'ta sol menüden "Developer" → "Create Manifest"
   - Veya: https://farcaster.xyz/~/developer/manifests

2. **Manifest Bilgilerini Doldurun**

   ```json
   {
     "name": "Jan KeN!",
     "description": "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
     "url": "https://jan-ken.vercel.app",
     "icon": "https://jan-ken.vercel.app/new_logo.png",
     "screenshots": [],
     "categories": ["games", "entertainment"]
   }
   ```

   **Gerekli Alanlar:**
   - **name**: App adı ("Jan KeN!")
   - **description**: Açıklama
   - **url**: App URL'i (`https://jan-ken.vercel.app` veya `https://basejanken.com`)
   - **icon**: Icon URL'i (`https://jan-ken.vercel.app/new_logo.png`)

3. **Manifest'i Kaydedin**
   - "Create" veya "Save" butonuna tıklayın
   - Manifest oluşturulacak ve bir ID alacaksınız

## 🔗 Adım 3: App'i Shareable Yapın

Farcaster dokümantasyonuna göre, app'inizi feed'lerde paylaşılabilir yapmak için:

1. **Sharing Ayarları**
   - Developer Tools → "Sharing" veya "Embed" bölümüne gidin
   - App'inizi shareable yapın

2. **Universal Links** (Opsiyonel)
   - App'inizi universal link ile paylaşılabilir yapabilirsiniz
   - Dokümantasyon: https://miniapps.farcaster.xyz/docs/universal-links

## ✅ Adım 4: Manifest Kontrolü

Uygulamanızda `manifest.json` dosyasının doğru olduğundan emin olun:

**Dosya:** `jan-ken-app1/public/manifest.json`

```json
{
  "name": "JaN KeN!",
  "short_name": "JaN KeN!",
  "description": "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/new_logo.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["games", "entertainment"]
}
```

## 🎯 Adım 5: SDK Initialization Kontrolü

Uygulamanızda Farcaster SDK'nın doğru şekilde initialize edildiğinden emin olun:

**Dosya:** `jan-ken-app1/app/page.tsx`

```typescript
// SDK'yı import edin
import { sdk } from '@farcaster/miniapp-sdk';

// App yüklendiğinde ready() çağırın
useEffect(() => {
  const initApp = async () => {
    try {
      if (typeof window !== 'undefined' && sdk && typeof sdk.actions !== 'undefined') {
        await sdk.actions.ready();
        setAppReady(true);
      }
    } catch (error) {
      console.error('Error calling sdk.actions.ready():', error);
      setAppReady(true);
    }
  };
  initApp();
}, []);
```

**ÖNEMLİ:** `sdk.actions.ready()` çağrılmazsa, kullanıcılar sonsuz loading ekranı görür!

## 📱 Adım 6: Test Edin

1. **Preview Yapın**
   - Developer Tools → "Preview" bölümüne gidin
   - App URL'inizi girin: `https://jan-ken.vercel.app`
   - Preview'da test edin

2. **Manifest Audit**
   - Developer Tools → "Audit" bölümüne gidin
   - Manifest'inizi kontrol edin
   - Hataları düzeltin

3. **Analytics**
   - Developer Tools → "Analytics" bölümüne gidin
   - App kullanım istatistiklerini görün

## 🌐 Adım 7: Domain Migration (Opsiyonel)

Eğer `basejanken.com` domain'ini kullanmak istiyorsanız:

1. **Vercel'de Domain Ekleyin**
   - Vercel Dashboard → Settings → Domains
   - `basejanken.com` ekleyin
   - DNS ayarlarını yapın

2. **Manifest'i Güncelleyin**
   - Developer Tools → Manifest'inizi düzenleyin
   - URL'i `https://basejanken.com` olarak güncelleyin

3. **Domain Migration**
   - Dokümantasyon: https://miniapps.farcaster.xyz/docs/domain-migration

## 🔍 Adım 8: App Discovery & Search

App'inizin keşfedilebilir olması için:

1. **App Discovery**
   - Dokümantasyon: https://miniapps.farcaster.xyz/docs/app-discovery-search
   - App'inizi optimize edin

2. **Search Optimization**
   - App adı, açıklama ve kategorileri optimize edin
   - Keywords ekleyin

## 📋 Checklist

### Teknik Gereksinimler
- [x] **HTTPS**: App HTTPS üzerinden erişilebilir (`https://jan-ken.vercel.app`)
- [x] **Manifest.json**: `public/manifest.json` doğru formatta
- [x] **SDK Ready**: `sdk.actions.ready()` çağrılıyor
- [x] **Icon**: Icon erişilebilir (`/new_logo.png`)
- [x] **Mobile Responsive**: Mobil cihazlarda çalışıyor

### Farcaster Gereksinimleri
- [ ] **Developer Mode**: Developer mode açık
- [ ] **Manifest Created**: Farcaster'da manifest oluşturuldu
- [ ] **App Published**: App publish edildi
- [ ] **Shareable**: App shareable yapıldı
- [ ] **Preview Tested**: Preview'da test edildi
- [ ] **Audit Passed**: Manifest audit geçti

## 🐛 Sorun Giderme

### Developer Mode Görünmüyor
- Farcaster'a giriş yaptığınızdan emin olun
- Desktop'ta kontrol edin (mobile'da görünmeyebilir)
- Link: https://farcaster.xyz/~/settings/developer-tools

### Manifest Oluşturulamıyor
- URL'in HTTPS olduğundan emin olun
- Icon URL'inin erişilebilir olduğunu kontrol edin
- Browser console'da hata var mı bakın

### App Açılmıyor
- `sdk.actions.ready()` çağrılıyor mu kontrol edin
- Network tab'da failed request'ler var mı bakın
- Console'da hata var mı kontrol edin

## 📚 Kaynaklar

- [Farcaster Mini Apps Getting Started](https://miniapps.farcaster.xyz/docs/getting-started)
- [Publishing Your App](https://miniapps.farcaster.xyz/docs/publishing-your-app)
- [App Discovery & Search](https://miniapps.farcaster.xyz/docs/app-discovery-search)
- [Loading Your App](https://miniapps.farcaster.xyz/docs/loading-your-app)
- [Sharing Your App](https://miniapps.farcaster.xyz/docs/sharing-your-app)

## 🚀 Hızlı Başlangıç

1. ✅ Developer Mode'u açın: https://farcaster.xyz/~/settings/developer-tools
2. ✅ Manifest oluşturun: Developer Tools → Create Manifest
3. ✅ App URL'i ekleyin: `https://jan-ken.vercel.app`
4. ✅ Preview'da test edin
5. ✅ Publish edin
6. ✅ Shareable yapın

## 💡 İpuçları

- **Desktop Kullanın**: Developer tools desktop'ta daha iyi çalışır
- **Preview Önce**: Publish etmeden önce mutlaka preview'da test edin
- **Audit Yapın**: Manifest audit yaparak hataları bulun
- **Analytics İzleyin**: App kullanımını analytics'ten takip edin






