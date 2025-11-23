# 🚀 Frontend Başlatıldı!

## ✅ Durum

Frontend development server başlatıldı.

## 🌐 Erişim

Tarayıcıda şu adrese git:

**http://localhost:3000**

## 🎮 Oyunu Kullan

### 1. Wallet Bağla

1. Sayfada wallet bağlantı butonuna tıkla
2. MetaMask popup'ı açılacak
3. Base Sepolia network'ünde olduğundan emin
4. Bağlantıyı onayla

### 2. Oyunu Başlat

1. **Bahis Seviyesi Seç:**
   - $5 (0.0015 ETH)
   - $10 (0.003 ETH)
   - $50 (0.015 ETH)
   - $100 (0.03 ETH)

2. **Eşleşme:**
   - Aynı bahis seviyesindeki başka bir oyuncu aranıyor
   - İki farklı wallet ile test edebilirsin

3. **Oyun:**
   - 40 saniye içinde seçim yap
   - Taş 🪨, Kağıt 📄, veya Makas ✂️
   - Her iki oyuncu seçim yaptığında sonuç gösterilir

4. **Sonuç:**
   - Kazanan tüm bahisi alır (2x bahis miktarı)
   - Berabere durumunda para iadesi yapılır

## 🔍 Kontrol

### Frontend Çalışıyor mu?

- Tarayıcıda `http://localhost:3000` aç
- Sayfa yükleniyor mu?
- Hata var mı? (Console'u kontrol et: F12)

### Contract Bağlantısı

- Contract address: `0x877cb5a3BD613D764c0f4e61365A0B65A7f4F180`
- Base Sepolia network'ünde
- Wallet Base Sepolia'da olmalı

## 🐛 Sorun Giderme

### Hata: "Contract address not found"
**Çözüm:** `.env.local` dosyasında `NEXT_PUBLIC_CONTRACT_ADDRESS` kontrol et

### Hata: "Network mismatch"
**Çözüm:** MetaMask'ta Base Sepolia network'ünü seç

### Hata: "Insufficient funds"
**Çözüm:** Base Sepolia faucet'ten ETH al

### Frontend açılmıyor
**Çözüm:**
1. Terminal'de hata var mı kontrol et
2. Port 3000 kullanımda mı kontrol et
3. `npm run dev` komutunu tekrar çalıştır

---

## 📋 Kontrol Listesi

- [x] Frontend başlatıldı
- [ ] Tarayıcıda açıldı (http://localhost:3000)
- [ ] Wallet bağlandı
- [ ] Base Sepolia network'ünde
- [ ] Oyun test edildi

---

**Frontend hazır! Tarayıcıda http://localhost:3000 adresine git! 🎮**


