# 🚀 Contract Deploy Seçenekleri

## ⚠️ Durum

Hardhat'ta ESM/CommonJS uyumsuzluğu var. Alternatif yöntemler:

## 🎯 Seçenek 1: Remix IDE (EN KOLAY - ÖNERİLEN)

### Avantajlar:
- ✅ Tarayıcıda çalışır, kurulum gerekmez
- ✅ Contract'ı direkt deploy edebilirsin
- ✅ Base Sepolia'ya bağlanabilir
- ✅ 5 dakikada deploy

### Adımlar:

1. **Remix IDE'yi aç:**
   - https://remix.ethereum.org

2. **Contract'ı yükle:**
   - Sol panelde "contracts" klasörü oluştur
   - `RockPaperScissors.sol` dosyasını yapıştır
   - (Dosya: `jan-ken/contracts/src/RockPaperScissors.sol`)

3. **Compile:**
   - Sol panelde "Solidity Compiler" sekmesi
   - Compiler version: 0.8.20
   - "Compile RockPaperScissors.sol" tıkla

4. **Deploy:**
   - "Deploy & Run Transactions" sekmesi
   - Environment: "Injected Provider - MetaMask"
   - MetaMask'ı Base Sepolia'ya bağla
   - "Deploy" tıkla
   - Contract address'i kopyala

---

## 🎯 Seçenek 2: Hardhat Versiyonunu Düşür

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
npm uninstall hardhat @nomicfoundation/hardhat-toolbox
npm install --save-dev hardhat@^2.19.0 @nomicfoundation/hardhat-toolbox@^3.0.0
```

---

## 🎯 Seçenek 3: Foundry Manuel Kurulum

GitHub'dan binary'leri indirip PATH'e ekle (detaylı talimat: `FOUNDRY_MANUAL_KURULUM.md`)

---

## 🎯 Seçenek 4: Base Sepolia Explorer'dan Deploy

Base Sepolia explorer'da contract'ı deploy edebilirsin (daha karmaşık)

---

## ✅ Öneri

**Remix IDE kullan** - En hızlı ve kolay yöntem!

Hangi yöntemi tercih edersin?







