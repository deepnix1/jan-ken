# Vercel Deployment Guide - basejanken.com

## 🚀 Deployment Steps

### 1. Domain Information
- **Domain**: basejanken.com
- **Price**: $11.25 USD/year
- **Status**: Available ✅

### 2. Deploy to Vercel

#### Option A: Via Vercel CLI (Recommended)
```bash
cd jan-ken-app1
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: Via Vercel Dashboard
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository: `deepnix1/jan-ken`
4. Set Root Directory: `jan-ken-app1`
5. Framework Preset: Next.js
6. Build Command: `npm run build`
7. Output Directory: `.next`
8. Install Command: `npm install`
9. Add Environment Variable:
   - Key: `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - Value: `0x721aa7FBBf2924a8C63Dd2282a37CB3a1eF1B434`
10. Click "Deploy"

### 3. Add Custom Domain

After deployment:

1. Go to your project on Vercel Dashboard
2. Click "Settings" → "Domains"
3. Click "Add Domain"
4. Enter: `basejanken.com`
5. Vercel will show DNS configuration:
   - Add A record: `76.76.21.21` (or CNAME as shown)
   - Add CNAME record: `cname.vercel-dns.com` (if required)
6. Purchase domain through Vercel (if not already owned)
7. Wait for DNS propagation (5-30 minutes)

### 4. Environment Variables

Make sure these are set in Vercel Dashboard:
- `NEXT_PUBLIC_CONTRACT_ADDRESS=0x721aa7FBBf2924a8C63Dd2282a37CB3a1eF1B434`

### 5. Build Settings

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 20.x (or latest LTS)

## 📝 Post-Deployment Checklist

- [ ] Project deployed successfully
- [ ] Domain added and configured
- [ ] DNS records verified
- [ ] HTTPS certificate active
- [ ] Environment variables set
- [ ] Test wallet connection
- [ ] Test game functionality
- [ ] Test on mobile devices

## 🔗 Important Links

- **Contract Address**: 0x721aa7FBBf2924a8C63Dd2282a37CB3a1eF1B434
- **BaseScan**: https://sepolia.basescan.org/address/0x721aa7FBBf2924a8C63Dd2282a37CB3a1eF1B434
- **Vercel Dashboard**: https://vercel.com/dashboard

## ⚠️ Notes

- Domain purchase: $11.25/year
- DNS propagation can take up to 48 hours (usually 5-30 minutes)
- Make sure contract address is correct in environment variables
- Test thoroughly before going live


