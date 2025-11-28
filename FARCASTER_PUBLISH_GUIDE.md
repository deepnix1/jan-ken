# Farcaster Mini App Yayınlama Rehberi

## 🚀 Farcaster'a Mini App Yükleme

### Yöntem 1: Warpcast Channel Oluşturma (En Kolay)

Warpcast, Farcaster'ın resmi client'ıdır ve Mini Apps'i destekler.

#### Adım 1: Warpcast Hesabı Oluşturun

1. **Warpcast'a Kaydolun**
   - Web: https://warpcast.com
   - iOS: App Store'dan "Warpcast" indirin
   - Android: Google Play'den "Warpcast" indirin

2. **Hesap Oluşturun**
   - Email veya Farcaster ID ile kayıt olun
   - Wallet'ınızı bağlayın (Farcaster wallet)

#### Adım 2: Channel Oluşturun

1. **Warpcast'ta Channel Oluştur**
   - Sol menüden "Channels" → "Create Channel"
   - Channel adı: `jan-ken` veya `janken-game`
   - Açıklama: "Rock Paper Scissors game on Base Network"

2. **Channel Ayarları**
   - Channel'ınızı açın
   - Settings (⚙️) → "Mini Apps" bölümüne gidin

#### Adım 3: Mini App URL'ini Ekleyin

1. **Mini App URL'i**
   - Production URL: `https://basejanken.com`
   - Veya Vercel URL: `https://jan-ken-app1-xxxxx.vercel.app`

2. **Warpcast Channel Ayarları**
   ```
   Channel Settings → Mini Apps → Add Mini App
   URL: https://basejanken.com
   Name: Jan KeN!
   Description: Rock Paper Scissors game on Base Network
   Icon: https://basejanken.com/new_logo.png
   ```

3. **Kaydedin**
   - "Save" butonuna tıklayın
   - Mini App artık channel'ınızda görünecek

#### Adım 4: Test Edin

1. **Channel'ınızı Açın**
   - Warpcast'ta channel'ınıza gidin
   - Mini App'i açın
   - Test edin

### Yöntem 2: Farcaster Registry'ye Kayıt (Resmi Yöntem)

Farcaster'ın resmi Mini App registry'sine kayıt için:

#### Adım 1: Mini App Metadata Hazırlayın

```json
{
  "name": "Jan KeN!",
  "description": "Rock Paper Scissors game on Base Network. Play against other players and win ETH!",
  "url": "https://basejanken.com",
  "icon": "https://basejanken.com/new_logo.png",
  "screenshots": [],
  "categories": ["games", "entertainment"],
  "developer": {
    "name": "Your Name",
    "url": "https://yourwebsite.com"
  }
}
```

#### Adım 2: Farcaster Hub'a Başvuru

1. **Farcaster Discord'a Katılın**
   - Farcaster Discord: https://discord.gg/farcaster
   - #mini-apps kanalına gidin

2. **Başvuru Yapın**
   - Mini App bilgilerinizi paylaşın
   - URL, açıklama, screenshot'lar ekleyin
   - Farcaster team onayı bekleyin

3. **Alternatif: Farcaster Forum**
   - https://warpcast.com/~/developers
   - Mini App başvurusu yapın

#### Adım 3: Onay Sonrası

- Farcaster team onayladıktan sonra
- Mini App'iniz tüm Farcaster client'larında görünür olacak

### Yöntem 3: Direct Link Paylaşımı

Resmi kayıt olmadan da Mini App'inizi paylaşabilirsiniz:

1. **URL Paylaşın**
   - `https://basejanken.com` URL'ini paylaşın
   - Farcaster client'ları otomatik olarak Mini App olarak açabilir

2. **Cast'lerde Paylaşın**
   - Warpcast'ta bir cast yapın
   - URL'i ekleyin
   - Kullanıcılar tıklayınca Mini App açılır

## 📋 Yayınlama Öncesi Checklist

### Teknik Gereksinimler

- [x] **HTTPS**: Uygulama HTTPS üzerinden erişilebilir mi?
- [x] **Manifest.json**: `public/manifest.json` doğru mu?
- [x] **Icon**: Logo/icon erişilebilir mi?
- [x] **Mobile Responsive**: Mobil cihazlarda çalışıyor mu?
- [x] **Wallet Integration**: Farcaster wallet bağlantısı çalışıyor mu?
- [x] **Contract Deployed**: Smart contract deploy edildi mi?
- [x] **Environment Variables**: Production environment variables set edildi mi?

### İçerik Gereksinimleri

- [ ] **App Name**: "Jan KeN!" veya "JaN KeN!"
- [ ] **Description**: Açıklama metni hazır mı?
- [ ] **Screenshots**: Uygulama screenshot'ları var mı?
- [ ] **Privacy Policy**: Gerekirse privacy policy sayfası
- [ ] **Terms of Service**: Gerekirse ToS sayfası

### Test Checklist

- [ ] **Wallet Connection**: Farcaster wallet ile bağlanıyor mu?
- [ ] **Game Flow**: Oyun akışı sorunsuz mu?
- [ ] **Contract Interaction**: Transaction'lar çalışıyor mu?
- [ ] **Error Handling**: Hata durumları handle ediliyor mu?
- [ ] **Mobile Testing**: Mobil cihazlarda test edildi mi?

## 🔧 Production Deployment

### Vercel Deployment

1. **Domain Ayarları**
   - Vercel Dashboard → Settings → Domains
   - `basejanken.com` domain'ini ekleyin
   - DNS ayarlarını yapın

2. **Environment Variables**
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x721aa7FBBf2924a8C63Dd2282a37CB3a1eF1B434
   ```

3. **Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Contract Deployment

1. **Base Mainnet'e Deploy**
   - Remix IDE veya Hardhat ile
   - Contract'ı Base Mainnet'e deploy edin
   - Contract address'i güncelleyin

2. **Contract Verification**
   - BaseScan'de contract'ı verify edin
   - ABI'yi güncelleyin

## 📱 Warpcast Channel Oluşturma (Detaylı)

### Adım 1: Channel Oluştur

1. Warpcast'ta sol menüden "Channels" tıklayın
2. "Create Channel" butonuna tıklayın
3. Channel bilgilerini doldurun:
   - **Name**: `jan-ken` (küçük harf, tire ile)
   - **Description**: "Rock Paper Scissors game on Base Network"
   - **Category**: Games

### Adım 2: Mini App Ekle

1. Channel'ınızı açın
2. Settings (⚙️) ikonuna tıklayın
3. "Mini Apps" sekmesine gidin
4. "Add Mini App" butonuna tıklayın
5. Bilgileri doldurun:
   ```
   URL: https://basejanken.com
   Name: Jan KeN!
   Description: Rock Paper Scissors game on Base Network
   Icon URL: https://basejanken.com/new_logo.png
   ```

### Adım 3: Yayınla

1. "Save" butonuna tıklayın
2. Channel'ınızda Mini App görünecek
3. Kullanıcılar channel'a gidip Mini App'i açabilir

## 🌐 Farcaster Client'ları

Mini App'iniz şu client'larda çalışacak:

1. **Warpcast** (Resmi)
   - iOS, Android, Web
   - URL: https://warpcast.com

2. **Farcord**
   - Desktop client
   - URL: https://farcord.com

3. **Supercast**
   - Web client

4. **Diğer Farcaster Client'ları**
   - Farcaster protokolünü destekleyen tüm client'lar

## 📊 Analytics ve Monitoring

### Vercel Analytics

1. **Vercel Dashboard**
   - Analytics sekmesinden trafiği izleyin
   - Deployment loglarını kontrol edin

2. **Custom Analytics** (Opsiyonel)
   - Google Analytics ekleyebilirsiniz
   - Veya custom analytics çözümü

### Contract Monitoring

1. **BaseScan**
   - Contract transaction'larını izleyin
   - Event'leri takip edin

2. **Alerts**
   - Önemli event'ler için alert kurun

## 🎯 Marketing ve Yayınlama

### Farcaster'da Tanıtım

1. **Cast Yapın**
   - Warpcast'ta Mini App'inizi tanıtan cast'ler yapın
   - Screenshot'lar ekleyin
   - URL'i paylaşın

2. **Channel'ınızı Paylaşın**
   - Channel'ınızı takip etmeleri için davet edin
   - Mini App'i test etmelerini isteyin

3. **Community Engagement**
   - Farcaster community'de aktif olun
   - Feedback alın
   - İyileştirmeler yapın

## 🐛 Sorun Giderme

### Mini App Açılmıyor

1. **HTTPS Kontrolü**
   - URL HTTPS ile başlıyor mu?
   - SSL sertifikası geçerli mi?

2. **CORS Ayarları**
   - CORS headers doğru mu?
   - `next.config.js`'de headers kontrol edin

3. **Manifest.json**
   - `manifest.json` erişilebilir mi?
   - Format doğru mu?

### Wallet Bağlanmıyor

1. **SDK Kontrolü**
   - Farcaster SDK doğru yükleniyor mu?
   - `sdk.actions.ready()` çağrılıyor mu?

2. **Network Kontrolü**
   - Base Sepolia/Mainnet network'ü doğru mu?
   - Wallet'da network ekli mi?

## 📚 Kaynaklar

- [Farcaster Mini Apps Docs](https://docs.farcaster.xyz/learn/what-are-apps/mini-apps)
- [Warpcast Documentation](https://warpcast.com)
- [Farcaster Discord](https://discord.gg/farcaster)
- [Base Network Docs](https://docs.base.org)

## ✅ Sonraki Adımlar

1. ✅ Vercel'e deploy edin
2. ✅ Domain'i bağlayın (basejanken.com)
3. ✅ Warpcast channel oluşturun
4. ✅ Mini App'i channel'a ekleyin
5. ✅ Test edin
6. ✅ Community'de paylaşın
7. ✅ Feedback toplayın
8. ✅ İyileştirmeler yapın






