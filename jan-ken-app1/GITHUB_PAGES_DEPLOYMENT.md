# GitHub Pages Deployment Guide

Bu proje artık GitHub Pages üzerinde deploy ediliyor.

## Otomatik Deployment

Her `master` branch'e push yapıldığında, GitHub Actions otomatik olarak:
1. Projeyi build eder
2. Static export oluşturur
3. GitHub Pages'e deploy eder

## GitHub Pages URL

- **Production URL**: `https://deepnix1.github.io/jan-ken`

## GitHub Pages Ayarları

1. Repository Settings > Pages'a gidin
2. **Source**: "GitHub Actions" seçili olmalı
3. **Branch**: `master` (veya varsayılan branch)

## Environment Variables

GitHub Actions workflow'unda kullanılan environment variables:

- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Smart contract adresi
- `NEXT_PUBLIC_BASE_RPC_URL`: Base mainnet RPC URL
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC URL
- `NEXT_PUBLIC_APP_URL`: App URL (default: `https://deepnix1.github.io/jan-ken`)

Bu değişkenleri GitHub repository Settings > Secrets and variables > Actions'ta tanımlayabilirsiniz.

## Farcaster Manifest

⚠️ **ÖNEMLİ**: GitHub Pages'e geçtiğimiz için Farcaster manifest'i yeniden imzalamanız gerekiyor:

1. https://farcaster.xyz/~/developers/mini-apps/manifest adresine gidin
2. Domain: `deepnix1.github.io` girin
3. Manifest'i imzalayın
4. İmzalı `accountAssociation` objesini `public/.well-known/farcaster.json` dosyasına ekleyin

## Build Komutları

### Local Build Test

```bash
npm run build
```

Build çıktısı `out/` klasöründe oluşur.

### Production Build

GitHub Actions otomatik olarak build eder, ancak manuel test için:

```bash
NEXT_PUBLIC_APP_URL=https://deepnix1.github.io/jan-ken npm run build
```

## Sorun Giderme

### Build Hatası

- `output: 'export'` kullanıldığı için server-side özellikler çalışmaz
- Tüm API routes ve server components client-side'a taşınmalı

### 404 Hatası

- GitHub Pages'de routing için `404.html` dosyası gerekebilir
- Next.js static export otomatik olarak `404.html` oluşturur

### Farcaster Manifest Hatası

- Manifest domain'i GitHub Pages URL'i ile eşleşmeli
- Manifest'i yeniden imzalamanız gerekebilir

## Vercel'den Farklar

1. **Static Export**: Tüm sayfalar static HTML olarak export edilir
2. **No Server**: Server-side rendering yok, sadece client-side
3. **Base Path**: Repository adına göre base path ayarlanabilir
4. **Headers**: Security headers GitHub Pages seviyesinde ayarlanmalı

## Custom Domain

GitHub Pages'de custom domain kullanmak için:

1. Repository Settings > Pages > Custom domain
2. Domain'inizi girin
3. DNS ayarlarını yapın
4. Farcaster manifest'te domain'i güncelleyin

