# 🔧 Remix "Unauthorized" Hatası - Çözüm

## ⚠️ Sorun

Remix'te "Unauthorized" hatası görünüyor. Bu genellikle WalletConnect/MetaMask bağlantı sorunudur.

## ✅ Çözüm Adımları

### ADIM 1: Environment Değiştir

1. **Remix'te "Deploy & Run Transactions" sekmesi**
2. **Environment dropdown'ına tıkla**
3. **`Injected Provider - MetaMask` seç** (WalletConnect değil!)
4. **MetaMask popup'ı açılacak, onayla**

### ADIM 2: MetaMask Bağlantısını Kontrol Et

1. **MetaMask'ı aç**
2. **Base Sepolia network'ünde olduğundan emin**
3. **Remix'in bağlantı isteğini kontrol et:**
   - MetaMask'ta bildirim var mı?
   - Onayladın mı?

### ADIM 3: Remix'i Yenile

1. **Remix sayfasını yenile** (F5)
2. **MetaMask'ı tekrar bağla**
3. **Environment: `Injected Provider - MetaMask` seç**

### ADIM 4: Deploy Ayarları

1. **Gas Limit:** 9000000 (zaten ayarlı ✅)
2. **Value:** 0 Wei (doğru ✅)
3. **Contract:** RockPaperScissors seçili ✅
4. **"Deploy & Verify" butonuna tıkla**

---

## 🎯 Hızlı Çözüm

**En önemli adım:** Environment'ı `Injected Provider - MetaMask` olarak değiştir!

WalletConnect yerine MetaMask'ı direkt kullan.

---

## 📋 Kontrol Listesi

- [ ] Environment: `Injected Provider - MetaMask` (WalletConnect değil!)
- [ ] MetaMask Base Sepolia'da
- [ ] MetaMask bağlantısı onaylandı
- [ ] Account görünüyor (0x38e...dfa32)
- [ ] Balance yeterli (0.248 ETH ✅)
- [ ] Gas limit: 9000000 ✅

---

**Şimdi Environment'ı `Injected Provider - MetaMask` olarak değiştir ve tekrar dene!**


