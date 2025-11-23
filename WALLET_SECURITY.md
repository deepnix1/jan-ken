# 🔐 Wallet Güvenlik Rehberi

## ⚠️ KRİTİK GÜVENLİK UYARILARI

### 1. Private Key ASLA Paylaşılmamalı
- ✅ Environment dosyalarında saklanmalı
- ❌ GitHub'a commit edilmemeli
- ❌ Public kanallarda paylaşılmamalı
- ❌ Screenshot'larda görünmemeli

### 2. Test Wallet Kullan
- ✅ Sadece test için ayrı wallet oluştur
- ✅ Gerçek para içeren wallet kullanma
- ✅ Base Sepolia testnet için yeterli

### 3. .gitignore Kontrolü
- ✅ `.env` dosyası `.gitignore`'da olmalı
- ✅ Her commit öncesi kontrol et

---

## 📝 Private Key Kullanımı

### EVM Wallet Private Key
**Evet, herhangi bir EVM wallet private key'i kullanılabilir:**
- MetaMask
- Trust Wallet
- Coinbase Wallet
- Herhangi bir EVM-compatible wallet

**Önemli:** Base Sepolia testnet'te çalışacak, bu yüzden:
- Base Sepolia network'üne bağlı olmalı
- Base Sepolia ETH'ye sahip olmalı

---

## 🚀 Hızlı Kurulum

Private key'iniz environment dosyalarına eklendi. Şimdi:

1. ✅ Contracts `.env` dosyası hazır
2. ⏭️ Base Sepolia ETH kontrolü yap
3. ⏭️ Contract deploy et
4. ⏭️ Test et

---

## 🔒 Güvenlik Checklist

- [ ] Private key sadece `.env` dosyasında
- [ ] `.env` dosyası `.gitignore`'da
- [ ] GitHub'a commit edilmedi
- [ ] Test wallet kullanılıyor (gerçek para yok)
- [ ] Base Sepolia network'ünde

---

## 🆘 Eğer Private Key Sızdırıldıysa

1. **HEMEN** wallet'ı boşalt
2. Yeni wallet oluştur
3. Yeni private key ile devam et
4. Eski wallet'ı kullanma

---

**✅ Private key güvenli şekilde kaydedildi. Şimdi contract deploy edebilirsin!**



