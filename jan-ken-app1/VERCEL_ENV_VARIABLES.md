# Vercel Environment Variables

Vercel Dashboard → Settings → Environment Variables bölümüne aşağıdaki değişkenleri ekleyin:

## 📋 Kopyala-Yapıştır Listesi

### Mevcut Değişkenler (Zaten Varsa Güncelle)

```
NEXT_PUBLIC_CDP_API_KEY_ID=f0532979-ad56-48aa-907a-bfd4fb535ceb
NEXT_PUBLIC_CDP_API_KEY_SECRET=vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw==
NEXT_PUBLIC_CONTRACT_ADDRESS=0x877cb5a3BD613D764c0f4e61365A0B65A7f4F180
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_APP_URL=https://jan-ken.vercel.app
```

### Commit-Reveal Game Değişkenleri (YENİ EKLE)

```
NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818
CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818
```

### Supabase Değişkenleri (YENİ EKLE)

```
NEXT_PUBLIC_SUPABASE_URL=https://iophfhfnctqufqsmunyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0
```

### RPC Değişkenleri (Backend API için)

```
RPC_URL=https://sepolia.base.org
```

---

## 🔧 Vercel'de Nasıl Eklenir?

1. **Vercel Dashboard** → Projenizi seçin
2. **Settings** → **Environment Variables**
3. Her bir değişkeni tek tek ekleyin:
   - **Key**: Değişken adı (örn: `NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL`)
   - **Value**: Değer (örn: `0xb36b83A3a8367e3A9A336a9004993F0BD6278818`)
   - **Environment**: Production, Preview, Development (hepsini seçin)

## 📝 Tüm Değişkenler (Tek Tek Kopyala)

### 1. Contract - Commit Reveal
```
NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL
```
```
0xb36b83A3a8367e3A9A336a9004993F0BD6278818
```

### 2. Contract - Commit Reveal (Backend)
```
CONTRACT_ADDRESS_COMMIT_REVEAL
```
```
0xb36b83A3a8367e3A9A336a9004993F0BD6278818
```

### 3. Supabase URL
```
NEXT_PUBLIC_SUPABASE_URL
```
```
https://iophfhfnctqufqsmunyz.supabase.co
```

### 4. Supabase Anon Key
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcGhmaGZuY3RxdWZxc211bnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQyNzQsImV4cCI6MjA3OTU5MDI3NH0.VRRauQBI6dIj3q2PhZzyXjzlKlzPF2s3N7RKctfKlD0
```

### 5. RPC URL (Backend)
```
RPC_URL
```
```
https://sepolia.base.org
```

---

## ⚠️ Önemli Notlar

- **NEXT_PUBLIC_** ile başlayan değişkenler browser'da görünür (public)
- **SUPABASE_SERVICE_ROLE_KEY** gerekirse ekleyin (API routes için)
- **RELAYER_PRIVATE_KEY** sadece backend operations için gerekirse ekleyin
- Değişkenleri ekledikten sonra **redeploy** yapın

---

## ✅ Kontrol Listesi

- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL` eklendi
- [ ] `CONTRACT_ADDRESS_COMMIT_REVEAL` eklendi
- [ ] `NEXT_PUBLIC_SUPABASE_URL` eklendi
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` eklendi
- [ ] `RPC_URL` eklendi
- [ ] Tüm environment'lar seçildi (Production, Preview, Development)
- [ ] Redeploy yapıldı




