# Wallet Popup Fix - Commit Reveal Game

## 🔧 Sorun

Wallet popup'ı çıkmıyor çünkü `writeContract` utility fonksiyonu bazen wallet popup'ını tetiklemiyor.

## ✅ Çözüm

İki yöntem var:

### 1. React Hook Kullanımı (ÖNERİLEN)

React component'lerinde `useCommitReveal` hook'unu kullanın:

```typescript
'use client';

import { useCommitReveal } from '@/hooks/useCommitReveal';
import { parseEther } from 'viem';
import { generateCommit, generateSecret } from '@/lib/matchCommitReveal';

export function MyComponent() {
  const {
    createMatch,
    joinMatch,
    commitMove,
    revealMove,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useCommitReveal();

  const handleCreateMatch = async () => {
    const betAmount = parseEther('0.001');
    await createMatch(betAmount);
    // Wallet popup otomatik çıkacak!
  };

  const handleCommit = async (matchId: bigint, move: number) => {
    const secret = generateSecret();
    const commitHash = generateCommit(move, secret);
    
    // Secret'ı sakla
    localStorage.setItem(`match_${matchId}_secret`, secret);
    
    await commitMove(matchId, commitHash);
    // Wallet popup otomatik çıkacak!
  };

  return (
    <div>
      <button onClick={handleCreateMatch} disabled={isPending}>
        {isPending ? 'Waiting for wallet...' : 'Create Match'}
      </button>
      
      {hash && <p>Transaction: {hash}</p>}
      {isSuccess && <p>✅ Transaction confirmed!</p>}
      {error && <p>❌ Error: {error.message}</p>}
    </div>
  );
}
```

### 2. Utility Fonksiyonları (Güncellendi)

Utility fonksiyonları artık `getConnectorClient` kullanıyor ve wallet popup'ını tetiklemeli:

```typescript
import { createMatch, joinMatch, sendCommitTx, sendRevealTx } from '@/lib/matchCommitReveal';

// Bu fonksiyonlar artık connector client kontrolü yapıyor
const hash = await createMatch(parseEther('0.001'));
```

## 📝 Değişiklikler

1. ✅ `matchCommitReveal.ts` - Tüm transaction fonksiyonlarına `getConnectorClient` eklendi
2. ✅ `useCommitReveal.ts` - Yeni React hook oluşturuldu (wallet popup garantili)

## 🎯 Kullanım Önerisi

**React Component'lerde:** `useCommitReveal` hook'unu kullanın
**Utility fonksiyonlar:** Sadece non-React context'lerde kullanın

## 🔍 Debug

Eğer hala wallet popup çıkmıyorsa:

1. Console'da şu logları kontrol edin:
   - `[createMatch] 📝 Preparing transaction...`
   - `[createMatch] 🔌 Connector client: true/false`

2. Wallet bağlı mı kontrol edin:
```typescript
import { useAccount } from 'wagmi';

const { isConnected, address } = useAccount();
console.log('Connected:', isConnected, 'Address:', address);
```

3. Connector client hazır mı kontrol edin:
```typescript
import { useConnectorClient } from 'wagmi';

const { data: connectorClient } = useConnectorClient();
console.log('Connector client:', !!connectorClient);
```

