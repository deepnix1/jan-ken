# FID (Farcaster ID) Nasıl Bulunur?

FID (Farcaster ID), Farcaster'da kullanıcıların benzersiz kimlik numarasıdır. İşte FID'nizi bulmanın birkaç yolu:

## 🔍 Yöntem 1: Warpcast (Farcaster Client) Üzerinden

1. **Warpcast uygulamasını açın** (mobil veya web)
2. **Profil sayfanıza gidin**
3. **Profil bilgilerinizde FID görünecektir**
   - Genellikle `@username` altında veya profil ayarlarında
   - Format: `FID: 28379` gibi bir sayı

## 🌐 Yöntem 2: Farcaster Web Sitesi

1. **https://warpcast.com** adresine gidin
2. **Profil sayfanıza gidin** (sağ üst köşeden)
3. **Profil bilgilerinizde FID görünecektir**

## 🔧 Yöntem 3: Farcaster API Kullanarak

Eğer username'iniz varsa, FID'yi API'den alabilirsiniz:

```bash
# Username ile FID bulma
curl "https://api.warpcast.com/v2/user-by-username?username=YOUR_USERNAME"

# Response'da fid alanı olacak
```

## 📱 Yöntem 4: Farcaster SDK ile (Kod İçinde)

Eğer uygulamanızda Farcaster SDK kullanıyorsanız:

```typescript
import { sdk } from '@farcaster/miniapp-sdk';

// SDK'dan kullanıcı bilgilerini al
const user = await sdk.context;
console.log('FID:', user?.fid);
```

## 🔍 Yöntem 5: Manifest Header'ından (Mevcut Durum)

Manifest dosyanızdaki `accountAssociation.header` değerini decode ederek FID'yi görebilirsiniz:

```javascript
// Base64 decode
const header = "eyJmaWQiOjI4Mzc3OSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDI0ZTc0MTgzNGM2ODlCNTdlNzc3RDI0MDMxNzVmRUY1NTU5OTgwZDgifQ";
const decoded = JSON.parse(atob(header));
console.log('FID:', decoded.fid); // 28379
```

**Not:** Manifest dosyanızda zaten FID var: **28379**

## 📋 Mevcut Manifest'inizdeki FID

Manifest dosyanızı kontrol ettiğimde, header'da FID zaten mevcut:
- **FID: 28379**

Bu FID, manifest'inizi imzalarken kullanılan FID'dir.

## ❓ Neden FID Gerekiyor?

FID genellikle şu durumlarda gereklidir:
- Manifest imzalama
- Farcaster API çağrıları
- Kullanıcı doğrulama
- Farcaster entegrasyonları

## 🔗 Yararlı Linkler

- **Farcaster Developer Docs**: https://docs.farcaster.xyz/
- **Warpcast**: https://warpcast.com
- **Farcaster API**: https://api.warpcast.com


