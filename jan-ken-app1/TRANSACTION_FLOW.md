# Blockchain Transaction Akışı - Detaylı Açıklama

## 📋 Genel Bakış

Uygulamamız blockchain'deki transaction'ları **Wagmi** ve **Viem** kütüphaneleri kullanarak görüyor ve onaylıyor. İşte tüm süreç:

---

## 🔄 Transaction Yaşam Döngüsü

### 1️⃣ **Transaction Gönderme (Sending)**

```typescript
// Matchmaking.tsx - joinQueue transaction'ı
writeContract({
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: CONTRACT_ABI,
  functionName: 'joinQueue',
  args: [betAmount],
  value: betAmount, // ETH gönderimi
});
```

**Ne oluyor?**
- `writeContract` hook'u transaction'ı hazırlar
- Wallet popup'ı açılır (kullanıcı onaylar)
- Transaction blockchain'e gönderilir
- **Transaction hash** döner (henüz onaylanmadı)

---

### 2️⃣ **Transaction Hash Alma**

```typescript
const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
```

**Hash nedir?**
- Transaction'ın benzersiz kimliği
- Örnek: `0x1234abcd...`
- Hash alındığında transaction blockchain'e gönderilmiş demektir
- Ama henüz **onaylanmamıştır** (pending state)

**Kod:**
```typescript
useEffect(() => {
  if (hash) {
    setTxHash(hash);
    console.log('✅ Transaction hash received:', hash);
    // Hash var ama henüz onaylanmadı!
  }
}, [hash]);
```

---

### 3️⃣ **Transaction Onayını Bekleme (Waiting for Confirmation)**

```typescript
// useWaitForTransactionReceipt - Transaction receipt'i bekler
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
  hash, // Hash'i veriyoruz
  timeout: 15000, // 15 saniye timeout
  confirmations: 1, // 1 onay yeterli (Base Sepolia testnet)
  query: {
    retry: 1, // 1 kez tekrar dene
    retryDelay: 1000, // 1 saniye bekle
    enabled: !!hash, // Sadece hash varsa çalış
  },
});
```

**Ne oluyor?**
1. **RPC Provider** (Base Sepolia RPC) ile bağlantı kurulur
2. Transaction hash'i RPC'ye sorgulanır
3. RPC, transaction'ın durumunu kontrol eder:
   - `pending` → Henüz onaylanmadı
   - `confirmed` → Onaylandı (1 block confirmation)
   - `failed` → Başarısız oldu

**RPC Provider Nedir?**
```typescript
// rootProvider.tsx
transports: {
  [baseSepolia.id]: http('https://sepolia.base.org', {
    timeout: 60000, // 60 saniye timeout
    retryCount: 5, // 5 kez tekrar dene
    retryDelay: 2000, // 2 saniye bekle
  }),
}
```

Bu RPC endpoint'i:
- Base Sepolia blockchain'ine bağlanır
- Transaction'ları sorgular
- Block'ları okur
- Event'leri dinler

---

### 4️⃣ **Transaction Receipt Alma**

**Receipt nedir?**
- Transaction'ın blockchain'de **onaylandığını** gösteren belge
- İçinde şunlar var:
  - Transaction hash
  - Block number (hangi block'ta onaylandı)
  - Gas used (ne kadar gas kullanıldı)
  - Status (success/failed)
  - Logs (event'ler)

**Kod:**
```typescript
useEffect(() => {
  if (isSuccess && hash) {
    console.log('Transaction confirmed:', hash);
    // Artık transaction onaylandı!
    // Receipt alındı, işlem başarılı
  }
}, [isSuccess, hash]);
```

---

### 5️⃣ **Event Dinleme (Event Listening)**

Blockchain'deki **event'leri** dinliyoruz:

```typescript
// Matchmaking.tsx - GameCreated event'ini dinle
useWatchContractEvent({
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: CONTRACT_ABI,
  eventName: 'GameCreated',
  enabled: isConnected,
  onLogs(logs) {
    // Event geldi!
    const gameLog = logs.find((log: any) => {
      const player1 = log.args.player1?.toLowerCase();
      const player2 = log.args.player2?.toLowerCase();
      const currentAddress = address?.toLowerCase();
      return player1 === currentAddress || player2 === currentAddress;
    });
    
    if (gameLog) {
      console.log('Match found! GameCreated event received:', gameLog);
      onMatchFound(gameId);
    }
  },
});
```

**Event nedir?**
- Smart contract'tan yayınlanan log'lar
- Örnek: `GameCreated(player1, player2, gameId)`
- Event'ler blockchain'de **kalıcı** olarak saklanır
- RPC provider ile **gerçek zamanlı** dinlenir

**Nasıl çalışır?**
1. RPC provider, yeni block'ları tarar
2. Block içindeki log'lara bakar
3. `GameCreated` event'ini bulursa `onLogs` callback'ini çağırır
4. Uygulama event'i işler

---

## 🔍 Blockchain'den Veri Okuma

### Contract State Okuma

```typescript
// GameBoard.tsx - getMyGame fonksiyonunu çağır
const { data: gameData } = useReadContract({
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: CONTRACT_ABI,
  functionName: 'getMyGame',
  args: [address],
  query: {
    enabled: !!address,
    refetchInterval: 2000, // Her 2 saniyede bir yenile
  },
});
```

**Ne oluyor?**
1. RPC provider'a `eth_call` yapılır
2. Contract'ın `getMyGame` fonksiyonu çağrılır (read-only)
3. Sonuç döner (transaction göndermeden!)
4. Her 2 saniyede bir otomatik yenilenir (polling)

---

## 🛠️ Teknik Detaylar

### RPC Provider Mimarisi

```
┌─────────────┐
│   Browser   │
│  (React App) │
└──────┬──────┘
       │
       │ HTTP/WebSocket
       │
┌──────▼──────────────────┐
│   Wagmi Config         │
│   - RPC Transport      │
│   - Connectors         │
│   - Query Client       │
└──────┬──────────────────┘
       │
       │ JSON-RPC
       │
┌──────▼──────────────────┐
│  Base Sepolia RPC      │
│  https://sepolia.base.org│
└──────┬──────────────────┘
       │
       │ Blockchain Protocol
       │
┌──────▼──────────────────┐
│  Base Sepolia Network  │
│  (Blockchain)          │
└─────────────────────────┘
```

### Transaction States

```
1. IDLE
   ↓ writeContract() çağrılır
2. PENDING (Wallet'da onay bekliyor)
   ↓ Kullanıcı onaylar
3. SENDING (Blockchain'e gönderiliyor)
   ↓ Hash alınır
4. CONFIRMING (Blockchain'de onay bekliyor)
   ↓ useWaitForTransactionReceipt
5. CONFIRMED (Receipt alındı)
   ↓ isSuccess = true
6. SUCCESS ✅
```

---

## 📊 Örnek Transaction Akışı

### Senaryo: joinQueue Transaction'ı

1. **Kullanıcı miktar seçer** → `handleBetSelect(betAmount)`

2. **Transaction hazırlanır:**
   ```typescript
   writeContract({
     address: '0x721AA7FBBF2924A8C63DD2282A37CB3A1EF1B434',
     functionName: 'joinQueue',
     args: [1774000000000000n], // 0.001774 ETH
     value: 1774000000000000n,
   });
   ```

3. **Wallet popup açılır** → Kullanıcı onaylar

4. **Transaction gönderilir:**
   - Wagmi → Wallet → Blockchain
   - Hash döner: `0xabc123...`

5. **Hash alınır:**
   ```typescript
   useEffect(() => {
     if (hash) {
       console.log('Hash:', hash);
       // UI: "Sending transaction..."
     }
   }, [hash]);
   ```

6. **Receipt beklenir:**
   ```typescript
   useWaitForTransactionReceipt({
     hash: '0xabc123...',
     confirmations: 1,
   });
   ```

7. **RPC sorgulanır:**
   - Her 1 saniyede bir: `eth_getTransactionReceipt('0xabc123...')`
   - RPC yanıtı: `{ status: 'success', blockNumber: 12345 }`

8. **Receipt alınır:**
   ```typescript
   if (isSuccess) {
     console.log('Transaction confirmed!');
     // UI: "Transaction confirmed!"
   }
   ```

9. **Event dinlenir:**
   - RPC yeni block'ları tarar
   - `GameCreated` event'i bulunursa → Match bulundu!

---

## 🔐 Güvenlik ve Hata Yönetimi

### Transaction Simulation

```typescript
// Önce simulate ediyoruz (dry-run)
const { data: simulateData, error: simulateError } = useSimulateContract({
  address: CONTRACT_ADDRESS,
  functionName: 'joinQueue',
  args: [betAmount],
  value: betAmount,
});
```

**Neden?**
- Transaction göndermeden önce test eder
- Hataları önceden yakalar (insufficient funds, etc.)
- Gas hesaplaması yapar

### Hata Yönetimi

```typescript
// writeError - Transaction gönderilirken hata
if (writeError) {
  if (errorMsg.includes('rejected')) {
    // Kullanıcı reddetti
  } else if (errorMsg.includes('insufficient funds')) {
    // Yetersiz bakiye
  }
}

// isReceiptError - Receipt alınırken hata
if (isReceiptError) {
  // Transaction timeout oldu veya başarısız
}
```

---

## 🌐 RPC Provider Detayları

### Base Sepolia RPC Endpoint

```
URL: https://sepolia.base.org
Method: HTTP POST
Protocol: JSON-RPC 2.0
```

### Kullanılan RPC Metodları

1. **`eth_sendTransaction`** - Transaction gönder
2. **`eth_getTransactionReceipt`** - Receipt al
3. **`eth_call`** - Contract state oku
4. **`eth_getLogs`** - Event log'ları al
5. **`eth_blockNumber`** - Son block numarası

### Timeout ve Retry

```typescript
http('https://sepolia.base.org', {
  timeout: 60000, // 60 saniye timeout
  retryCount: 5, // 5 kez tekrar dene
  retryDelay: 2000, // Her deneme arasında 2 saniye bekle
})
```

**Neden?**
- Network gecikmeleri
- RPC server yükü
- Geçici bağlantı sorunları

---

## 📝 Özet

1. **Transaction Gönderme:** `writeContract()` → Wallet onayı → Hash alınır
2. **Onay Bekleme:** `useWaitForTransactionReceipt()` → RPC sorgulanır → Receipt alınır
3. **Event Dinleme:** `useWatchContractEvent()` → RPC yeni block'ları tarar → Event yakalanır
4. **State Okuma:** `useReadContract()` → RPC'ye `eth_call` → Sonuç döner

**Tüm bunlar RPC Provider (Base Sepolia) üzerinden gerçekleşir!**





