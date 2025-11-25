# Farcaster Mini App Troubleshooting Guide

Bu dokümantasyon, Farcaster Mini App geliştirme sürecinde karşılaşabileceğiniz yaygın sorunları ve çözümlerini içerir.

## 📚 Resmi Dokümantasyon Kaynakları

### Ana Kaynaklar
- **Farcaster Mini App SDK**: https://miniapps.farcaster.xyz/docs/getting-started
- **Ethereum Wallet Guide**: https://miniapps.farcaster.xyz/docs/guides/wallets
- **Loading Guide**: https://miniapps.farcaster.xyz/docs/guides/loading
- **AI Agents Checklist**: https://miniapps.farcaster.xyz/docs/guides/agents-checklist

### Destek Kanalları
- **Email**: [email protected]
- **Tech Support Channel**: https://farcaster.xyz/~/channel/tech-support
- **Developer Tools**: https://farcaster.xyz/~/developers/mini-apps/manifest

---

## 🔧 Yaygın Sorunlar ve Çözümleri

### 1. Transaction Gönderme Sorunları

#### Sorun: Transaction gönderilmiyor, wallet popup görünmüyor

**Olası Nedenler:**
- Connector client oluşturulmamış
- Simulation tamamlanmamış
- Network yanlış
- Provider bağlantısı kopuk

**Çözümler:**

1. **Connector Client Kontrolü:**
```typescript
const { data: connectorClient } = useConnectorClient();

if (!connectorClient) {
  console.error('Connector client not available');
  // Disconnect and reconnect
  disconnect();
  setTimeout(() => connect({ connector: farcasterConnector }), 1000);
}
```

2. **Simulation Bekleme:**
```typescript
const { data: simulateData, status: simulateStatus } = useSimulateContract({
  // ... config
});

// Wait for simulation to complete
if (simulateStatus === 'pending') {
  return; // Wait for simulation
}

// Use simulateData.request for gas estimation
if (simulateData?.request) {
  writeContract(simulateData.request);
}
```

3. **Network Kontrolü:**
```typescript
const chainId = useChainId();
if (chainId !== 84532) { // Base Sepolia
  console.error('Wrong network');
  // Prompt user to switch network
}
```

#### Sorun: Transaction "pending" durumunda kalıyor

**Çözüm:**
- `useEffect` dependency array'ine `simulateStatus` ekleyin
- Simulation tamamlandığında transaction otomatik gönderilir

```typescript
useEffect(() => {
  // ... transaction sending logic
}, [isConnected, writeContract, betAmount, simulateData, simulateStatus]);
```

#### Sorun: "Transaction was rejected" hatası

**Olası Nedenler:**
- Kullanıcı wallet'ta transaction'ı reddetti
- Insufficient funds
- Network hatası

**Çözüm:**
```typescript
const { error: writeError } = useWriteContract({
  mutation: {
    onError: (error) => {
      if (error?.code === 4001) {
        // User rejected
        setTxError('Transaction was rejected. Please approve in your wallet.');
      } else if (error?.message?.includes('insufficient funds')) {
        setTxError('Insufficient funds. Please add more ETH.');
      }
    },
  },
});
```

---

### 2. Connector Client Sorunları

#### Sorun: "Connector client available: false"

**Çözüm:**
```typescript
// Auto-reconnect mechanism
useEffect(() => {
  if (isConnected && !connectorClient) {
    const timeout = setTimeout(() => {
      if (!connectorClient) {
        disconnect();
        setTimeout(() => {
          const farcasterConnector = connectors.find(c => 
            c.name === 'Farcaster Mini App'
          );
          if (farcasterConnector) {
            connect({ connector: farcasterConnector });
          }
        }, 1000);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }
}, [isConnected, connectorClient, connectors, connect, disconnect]);
```

---

### 3. SDK Ready() Sorunları

#### Sorun: "Ready not called" hatası

**Çözüm:**
```typescript
useEffect(() => {
  let mounted = true;
  let attempts = 0;
  const maxAttempts = 100; // 10 seconds
  
  const checkSDK = setInterval(() => {
    attempts++;
    const sdkAvailable = sdk && sdk.actions;
    const windowSDK = typeof window !== 'undefined' && 
                      (window as any).farcaster?.sdk;
    
    if (sdkAvailable || windowSDK) {
      clearInterval(checkSDK);
      if (mounted) {
        (sdkAvailable ? sdk : (window as any).farcaster.sdk).actions.ready();
        setAppReady(true);
      }
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(checkSDK);
      if (mounted) {
        setAppReady(true);
      }
    }
  }, 100);
  
  return () => {
    mounted = false;
    clearInterval(checkSDK);
  };
}, []);
```

---

### 4. Simulation Sorunları

#### Sorun: Simulation "pending" durumunda kalıyor

**Çözüm:**
```typescript
const { data: simulateData, status: simulateStatus } = useSimulateContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'joinQueue',
  args: [betAmount],
  value: betAmount,
  query: {
    enabled: isConnected && !!address && !!betAmount && !!connectorClient,
    retry: 3,
    retryDelay: 1000,
  },
});

// Wait for simulation in useEffect
useEffect(() => {
  if (simulateStatus === 'pending') {
    return; // Wait
  }
  // ... send transaction
}, [simulateStatus, simulateData]);
```

---

### 5. Transaction Scanning Sorunları

#### Sorun: Transaction "potentially malicious" olarak işaretleniyor

**Çözüm:**
- [Blockaid Tool](https://miniapps.farcaster.xyz/docs/guides/wallets#troubleshooting) kullanarak uygulamanızı doğrulayın
- Yeni contract'lar false positive verebilir
- Blockaid ile doğrulama yapın

---

### 6. Manifest Sorunları

#### Sorun: Mini App keşfedilemiyor

**Çözüm:**
1. Manifest dosyası `/.well-known/farcaster.json` yolunda olmalı
2. Tüm URL'ler HTTPS olmalı
3. Manifest doğrulama: https://farcaster.xyz/~/developers/mini-apps/manifest

```json
{
  "version": "1.0.0",
  "name": "Your App Name",
  "iconUrl": "https://yourdomain.com/icon.png",
  "splashImageUrl": "https://yourdomain.com/splash.png",
  "homeUrl": "https://yourdomain.com"
}
```

---

### 7. CORS Sorunları

#### Sorun: API istekleri CORS hatası veriyor

**Çözüm:**
- Server'da `Access-Control-Allow-Origin` header'ı ekleyin
- Mini App domain'inden gelen isteklere izin verin
- Vercel'de `vercel.json` ile CORS ayarlayın

---

### 8. BigInt Serialization Sorunları

#### Sorun: "JSON.stringify cannot serialize BigInt"

**Çözüm:**
```typescript
// Convert BigInt to string before logging
const variablesForLog = {
  ...variables,
  args: variables.args?.map((arg: any) => 
    typeof arg === 'bigint' ? arg.toString() : arg
  ),
  value: typeof variables.value === 'bigint' 
    ? variables.value.toString() 
    : variables.value,
};
```

---

## 🔍 Debugging İpuçları

### 1. Debug Panel Kullanımı
- Debug Panel'i açın (🐛 butonu)
- Console log'larını kontrol edin
- Connection status'ü izleyin
- Network bilgilerini kontrol edin

### 2. Logging Best Practices
```typescript
console.log('🔍 Connector client status:', {
  isConnected,
  connectorClientAvailable: !!connectorClient,
  address,
  chainId,
});

console.log('📊 Transaction status:', {
  status,
  isPending,
  hash,
  error: writeError?.message,
});
```

### 3. Provider Kontrolü
```typescript
const provider = await sdk.wallet.getEthereumProvider();
console.log('Provider state:', {
  chainId: await provider.request({ method: 'eth_chainId' }),
  accounts: await provider.request({ method: 'eth_accounts' }),
});
```

---

## 📖 Ek Kaynaklar

### Dokümantasyon
- **Wagmi v3 Docs**: https://wagmi.sh/react/getting-started
- **Viem Docs**: https://viem.sh/docs/getting-started
- **Farcaster Mini App Examples**: https://github.com/farcasterxyz/miniapps

### Topluluk
- **Farcaster Tech Support**: https://farcaster.xyz/~/channel/tech-support
- **Farcaster Developers**: https://farcaster.xyz/~/developers

### Araçlar
- **Blockaid Tool**: Transaction doğrulama için
- **Farcaster Developer Tools**: Manifest doğrulama için
- **Base Sepolia Explorer**: https://sepolia.basescan.org

---

## 🚨 Acil Durum Çözümleri

### Transaction hiç gönderilmiyor
1. Connector client kontrolü yapın
2. Network kontrolü yapın (Base Sepolia: 84532)
3. Simulation tamamlanmasını bekleyin
4. Fallback olarak simulation olmadan göndermeyi deneyin

### Wallet popup görünmüyor
1. Farcaster SDK ready() çağrıldı mı kontrol edin
2. Connector client oluşturuldu mu kontrol edin
3. Provider bağlantısını kontrol edin
4. Sayfayı yenileyin ve tekrar deneyin

### Simulation timeout
1. RPC endpoint'i kontrol edin
2. Network bağlantısını kontrol edin
3. Fallback olarak simulation olmadan göndermeyi deneyin

---

## 📝 Checklist

Transaction göndermeden önce kontrol edin:
- [ ] SDK ready() çağrıldı mı?
- [ ] Connector client oluşturuldu mu?
- [ ] Network doğru mu? (Base Sepolia: 84532)
- [ ] Address bağlı mı?
- [ ] Simulation tamamlandı mı?
- [ ] writeContract fonksiyonu mevcut mu?
- [ ] Bet amount geçerli mi?
- [ ] Contract address doğru mu?

---

## 💡 Best Practices

1. **Her zaman simulation kullanın** - Gas estimation için
2. **Error handling ekleyin** - Kullanıcıya net mesajlar verin
3. **Logging yapın** - Debug için yeterli log ekleyin
4. **Fallback mekanizmaları** - Simulation başarısız olursa fallback kullanın
5. **Auto-reconnect** - Connector client kaybolursa otomatik reconnect yapın
6. **User feedback** - Transaction durumunu kullanıcıya gösterin

---

## 🔗 İlgili Dosyalar

- `components/Matchmaking.tsx` - Transaction gönderme logic
- `app/page.tsx` - SDK ready() ve connector management
- `app/rootProvider.tsx` - Wagmi config ve connector setup
- `components/DebugPanel.tsx` - Debug logging

---

**Son Güncelleme**: 2025-11-23
**Versiyon**: 1.0.0



