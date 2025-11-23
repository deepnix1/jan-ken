# 🔧 Remix Gas Estimation Hatası - Adım Adım Çözüm

## ⚠️ Hata
```
Gas estimation errored
missing revert data
```

## ✅ Çözüm Adımları

### 1. Remix'te Contract'ı Temizle

1. **Mevcut contract dosyasını sil**
2. **Yeni dosya oluştur: `RockPaperScissors.sol`**
3. **Aşağıdaki temiz kodu kopyala-yapıştır**

### 2. Compile Kontrolü

1. **"Solidity Compiler" sekmesine git** (⚙️)
2. **Compiler versiyonu: `0.8.20` seç**
3. **"Compile RockPaperScissors.sol" tıkla**
4. **✅ Başarılı olmalı (yeşil tik)**

### 3. Network Kontrolü

1. **MetaMask'ı aç**
2. **Base Sepolia network'ünü seç** (Chain ID: 84532)
3. **Balance kontrolü:**
   - En az **0.01 ETH** olmalı
   - Eğer yoksa: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### 4. Remix Deploy Ayarları

1. **"Deploy & Run Transactions" sekmesine git** (🚀)
2. **Environment: `Injected Provider - MetaMask` seç**
3. **Account kontrolü:**
   - Wallet adresin görünüyor mu? ✅
   - Balance yeterli mi? ✅
4. **Contract: `RockPaperScissors` seç**
5. **"Deploy" butonuna tıkla**

### 5. Eğer Hala Hata Varsa

**Seçenek A: Gas Limit Artır**
- Remix'te "Deploy" butonunun yanında "Advanced" seçeneği var mı?
- Gas limit'i manuel olarak artır (örn: 5000000)

**Seçenek B: Farklı Network Dene**
- Önce Sepolia testnet'e deploy et (test için)
- Sonra Base Sepolia'ya geç

**Seçenek C: Contract'ı Basitleştir**
- Önce basit bir contract deploy et (test için)
- Sonra tam contract'ı deploy et

---

## 📋 Kontrol Listesi

- [ ] Contract compile başarılı
- [ ] MetaMask Base Sepolia'da
- [ ] Yeterli ETH var (0.01+)
- [ ] Remix'te doğru network seçili
- [ ] Environment: Injected Provider seçili

---

## 🆘 Hala Çalışmıyorsa

1. **Remix'i yenile** (F5)
2. **MetaMask'ı yeniden bağla**
3. **Farklı bir tarayıcı dene**
4. **Remix'in console'unu kontrol et** (hata mesajları için)

---

**Şimdi yukarıdaki adımları tek tek dene!**



