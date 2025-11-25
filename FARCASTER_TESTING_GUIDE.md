# Farcaster Mini App Testing Guide

## 🎯 Farcaster Ortamında Test Etme

### Yöntem 1: Warpcast ile Test (Önerilen)

Warpcast, Farcaster'ın resmi client'ıdır ve Mini Apps'i destekler.

#### Adımlar:

1. **Warpcast Hesabı Oluşturun**
   - iOS: App Store'dan "Warpcast" uygulamasını indirin
   - Android: Google Play'den "Warpcast" uygulamasını indirin
   - Web: https://warpcast.com adresinden hesap oluşturun

2. **Mini App URL'ini Ekleyin**
   - Warpcast'ta bir channel oluşturun veya mevcut bir channel'a gidin
   - Channel ayarlarından "Mini Apps" bölümüne gidin
   - Mini App URL'inizi ekleyin: `https://basejanken.com` (veya Vercel URL'iniz)

3. **Test Edin**
   - Channel'da Mini App'i açın
   - Wallet bağlantısını test edin
   - Oyunu oynayın

### Yöntem 2: Farcaster Hub'a Kaydetme

Farcaster Hub'a Mini App'inizi kaydederek tüm Farcaster client'larında görünür hale getirebilirsiniz.

#### Adımlar:

1. **Farcaster Hub'a Erişim**
   - Farcaster Hub API'sine erişim gerekiyor
   - Genellikle Farcaster team ile iletişime geçmeniz gerekir

2. **Mini App Metadata**
   ```json
   {
     "name": "Jan KeN!",
     "description": "Rock Paper Scissors game on Base Network",
     "url": "https://basejanken.com",
     "icon": "https://basejanken.com/new_logo.png"
   }
   ```

### Yöntem 3: Local Development (Geliştirme)

Local'de test etmek için:

1. **Local Server Başlatın**
   ```bash
   cd jan-ken-app1
   npm run dev
   ```

2. **ngrok veya benzeri tool kullanın**
   ```bash
   # ngrok ile local server'ı public yapın
   ngrok http 3000
   ```

3. **Public URL'i Warpcast'a ekleyin**
   - ngrok'un verdiği URL'i kullanın (örn: `https://abc123.ngrok.io`)

### Yöntem 4: Vercel Preview URL ile Test

Vercel her commit için preview URL oluşturur:

1. **Vercel Dashboard'a gidin**
   - Projenize gidin
   - "Deployments" sekmesine tıklayın
   - Her deployment'ın yanında preview URL var

2. **Preview URL'i Warpcast'a ekleyin**
   - Preview URL'i kopyalayın
   - Warpcast channel ayarlarına ekleyin

## 📱 Farcaster Client'ları

### Desteklenen Client'lar:

1. **Warpcast** (Resmi)
   - iOS, Android, Web
   - Mini Apps tam destek
   - URL: https://warpcast.com

2. **Farcord**
   - Desktop client
   - Mini Apps destekli
   - URL: https://farcord.com

3. **Supercast**
   - Web client
   - Mini Apps destekli

## 🔧 Mini App Gereksinimleri

### Manifest.json Kontrolü

`public/manifest.json` dosyanız şu bilgileri içermeli:

```json
{
  "name": "Jan KeN!",
  "description": "Rock Paper Scissors game on Base Network",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/new_logo.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### SDK Initialization

Uygulamanızda Farcaster SDK'nın doğru şekilde initialize edildiğinden emin olun:

```typescript
// app/page.tsx içinde
useEffect(() => {
  const initApp = async () => {
    if (sdk && typeof sdk.actions !== 'undefined') {
      await sdk.actions.ready();
    }
  };
  initApp();
}, []);
```

## 🧪 Test Senaryoları

### 1. Wallet Connection Test
- [ ] Farcaster wallet ile bağlanabiliyor mu?
- [ ] Wallet adresi görüntüleniyor mu?
- [ ] Disconnect çalışıyor mu?

### 2. Game Flow Test
- [ ] Bet seçimi çalışıyor mu?
- [ ] Matchmaking çalışıyor mu?
- [ ] Game board görüntüleniyor mu?
- [ ] Choice yapılabiliyor mu?
- [ ] Sonuçlar doğru gösteriliyor mu?

### 3. Contract Interaction Test
- [ ] Transaction'lar gönderiliyor mu?
- [ ] Contract events dinleniyor mu?
- [ ] ETH transferleri çalışıyor mu?

## 🐛 Sorun Giderme

### Wallet Bağlanmıyor

1. **Farcaster SDK Kontrolü**
   ```javascript
   console.log('SDK available:', typeof sdk !== 'undefined');
   console.log('SDK actions:', sdk?.actions);
   ```

2. **Network Kontrolü**
   - Base Sepolia network'ünde olduğunuzdan emin olun
   - Farcaster wallet'ınızda Base Sepolia ekli mi kontrol edin

3. **Console Logs**
   - Browser console'da hata var mı kontrol edin
   - Network tab'da failed request'ler var mı bakın

### Mini App Açılmıyor

1. **URL Kontrolü**
   - HTTPS kullanıyor musunuz? (Farcaster HTTPS gerektirir)
   - CORS ayarları doğru mu?

2. **Manifest Kontrolü**
   - `manifest.json` doğru formatta mı?
   - Icon URL'leri çalışıyor mu?

### Transaction Hataları

1. **Gas Limit**
   - Transaction'lar için yeterli gas var mı?
   - Base Sepolia'da test ETH'niz var mı?

2. **Contract Address**
   - Contract address doğru mu?
   - Environment variable doğru set edilmiş mi?

## 📚 Kaynaklar

- [Farcaster Mini Apps Documentation](https://docs.farcaster.xyz/learn/what-are-apps/mini-apps)
- [Warpcast Documentation](https://warpcast.com)
- [Base Network Documentation](https://docs.base.org)

## 🚀 Production Deployment

Production'a geçmeden önce:

1. ✅ Contract Mainnet'e deploy edildi mi?
2. ✅ Frontend production URL'i hazır mı?
3. ✅ Environment variables doğru mu?
4. ✅ Manifest.json güncel mi?
5. ✅ Tüm testler geçti mi?

## 💡 İpuçları

- **Test Mode**: İlk testler için Base Sepolia kullanın
- **Multiple Wallets**: Farklı wallet'larla test edin
- **Network Speed**: Farklı network hızlarında test edin
- **Mobile vs Desktop**: Hem mobile hem desktop'ta test edin



