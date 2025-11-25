# Frontend Setup - Jan KeN!

## 📁 Frontend Dosya Yapısı

```
jan-ken-app/
├── app/
│   ├── page.tsx              # Ana sayfa
│   ├── game/
│   │   └── [id]/
│   │       └── page.tsx      # Oyun sayfası
│   └── layout.tsx
├── components/
│   ├── BetSelector.tsx       # Bahis seviyesi seçimi
│   ├── GameBoard.tsx         # Oyun tahtası
│   ├── Timer.tsx             # 40 saniyelik timer
│   ├── Matchmaking.tsx       # Eşleştirme ekranı
│   └── Result.tsx            # Sonuç ekranı
├── lib/
│   ├── contract.ts           # Contract ABI ve address
│   └── utils.ts              # Yardımcı fonksiyonlar
└── calls.ts                  # Contract calls
```

## 🔧 Kurulum Adımları

### 1. OnchainKit Projesi Oluşturuldu

```bash
cd jan-ken-app
npm install
```

### 2. Gerekli Dosyaları Oluştur

Aşağıdaki dosyaları oluştur (kodlar sonraki adımda):

- `app/calls.ts` - Contract interaction calls
- `lib/contract.ts` - Contract ABI ve address
- `components/BetSelector.tsx` - Bahis seçici
- `components/GameBoard.tsx` - Oyun ekranı
- `components/Timer.tsx` - Timer component
- `components/Matchmaking.tsx` - Eşleştirme ekranı
- `components/Result.tsx` - Sonuç ekranı

### 3. Contract Address'i Ekle

Deploy sonrası contract address'i `lib/contract.ts` dosyasına ekle.

### 4. ABI Ekle

Contract'ı compile ettikten sonra ABI'yi al:

```bash
cd contracts
cat out/RockPaperScissors.sol/RockPaperScissors.json | jq .abi > ../jan-ken-app/lib/abi.json
```

---

## 📝 Dosya İçerikleri (Sonraki Adımda Oluşturulacak)

### calls.ts

```typescript
import { contractAddress, contractAbi } from '@/lib/contract';

export const calls = {
  joinQueue: (betAmount: bigint) => ({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'joinQueue',
    args: [betAmount],
    value: betAmount,
  }),
  makeChoice: (choice: number) => ({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'makeChoice',
    args: [choice],
  }),
  timeoutGame: () => ({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'timeoutGame',
    args: [],
  }),
};
```

### contract.ts

```typescript
export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export const contractAbi = [
  // ABI buraya eklenecek (compile sonrası)
] as const;
```

---

## 🎨 UI/UX Özellikleri

1. **Bahis Seçimi:**
   - 4 buton: $5, $10, $50, $100
   - ETH cinsinden gösterim
   - Wallet balance kontrolü

2. **Eşleştirme:**
   - Loading animasyonu
   - "Eşleşme aranıyor..." mesajı
   - Bekleme süresi gösterimi

3. **Oyun Ekranı:**
   - 3 seçenek: 🪨 Taş, 📄 Kağıt, ✂️ Makas
   - 40 saniyelik geri sayım
   - Seçim yapıldığında disable
   - Karşı oyuncu seçimini bekle

4. **Sonuç Ekranı:**
   - Kazanan/kaybeden gösterimi
   - Ödül miktarı
   - Yeni oyun butonu

---

## 🔄 State Management

- React hooks kullan (useState, useEffect)
- Contract events dinle
- Polling ile oyun durumunu kontrol et

---

## 📱 Responsive Design

- Mobile-first yaklaşım
- Desktop'ta daha geniş layout
- Touch-friendly butonlar

---

## 🚀 Next Steps

1. Contract deploy edildikten sonra
2. ABI'yi al ve ekle
3. Component'leri oluştur
4. Test et
5. Deploy




