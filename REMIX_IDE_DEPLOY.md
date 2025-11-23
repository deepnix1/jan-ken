# 🚀 Remix IDE ile Contract Deploy - Adım Adım

## 📋 Hazırlık

### 1. Contract Dosyası Hazır
✅ `contracts/src/RockPaperScissors.sol` dosyası hazır

### 2. MetaMask Hazırlığı
- ✅ MetaMask kurulu olmalı
- ✅ Base Sepolia network eklenmiş olmalı
- ✅ Base Sepolia ETH olmalı (faucet'ten al)

---

## 🎯 Adım Adım Deploy

### ADIM 1: Remix IDE'yi Aç

1. Tarayıcıda şu adrese git:
   **https://remix.ethereum.org**

2. Remix IDE açılacak

---

### ADIM 2: Contract Dosyasını Yükle

1. **Sol panelde "contracts" klasörü oluştur:**
   - Sol üstteki "+" butonuna tıkla
   - Klasör adı: `contracts`
   - Enter

2. **RockPaperScissors.sol dosyasını oluştur:**
   - `contracts` klasörüne sağ tık
   - "New File"
   - Dosya adı: `RockPaperScissors.sol`
   - Enter

3. **Contract kodunu yapıştır:**
   - Aşağıdaki contract kodunu kopyala
   - Remix'te açılan dosyaya yapıştır
   - Ctrl+S ile kaydet

---

### ADIM 3: Contract'ı Compile Et

1. **Sol panelde "Solidity Compiler" sekmesine git** (⚙️ ikonu)

2. **Compiler ayarları:**
   - Compiler: `0.8.20` seç (veya en yakın versiyon)
   - Language: `Solidity`
   - EVM Version: `default` veya `london`

3. **Compile butonuna tıkla:**
   - Yeşil "Compile RockPaperScissors.sol" butonu
   - Başarılı olursa yeşil tik görünecek

4. **Hata kontrolü:**
   - Eğer hata varsa, hata mesajlarını kontrol et
   - Genellikle compiler versiyonu uyumsuzluğu olabilir

---

### ADIM 4: MetaMask'ı Hazırla

1. **Base Sepolia Network Ekle (Eğer yoksa):**
   - MetaMask'ı aç
   - Ağlar > Ağ Ekle
   - Manuel olarak ekle:
     - Ağ Adı: `Base Sepolia`
     - RPC URL: `https://sepolia.base.org`
     - Chain ID: `84532`
     - Para Birimi Sembolü: `ETH`
     - Block Explorer: `https://sepolia.basescan.org`

2. **Base Sepolia ETH Al:**
   - https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Wallet adresini gir
   - ETH al

3. **MetaMask'ı Base Sepolia'ya bağla:**
   - MetaMask'ta Base Sepolia network'ünü seç

---

### ADIM 5: Contract'ı Deploy Et

1. **Sol panelde "Deploy & Run Transactions" sekmesine git** (🚀 ikonu)

2. **Environment seç:**
   - Dropdown'dan: `Injected Provider - MetaMask` seç
   - MetaMask bağlantı isteği gelecek, onayla

3. **Account kontrolü:**
   - Account adresinin göründüğünden emin ol
   - Balance'ın yeterli olduğundan emin (0.01+ ETH)

4. **Contract seç:**
   - "Contract" dropdown'ından: `RockPaperScissors` seç

5. **Deploy butonuna tıkla:**
   - "Deploy" butonuna tıkla
   - MetaMask'ta transaction onayla
   - Gas fee'yi onayla

6. **Deploy bekleniyor:**
   - Transaction'ın onaylanmasını bekle
   - Başarılı olursa contract address görünecek

---

### ADIM 6: Contract Address'i Kaydet

1. **Deploy sonrası:**
   - Sol altta "Deployed Contracts" bölümünde contract görünecek
   - Contract adresini kopyala (0x ile başlayan uzun adres)

2. **Environment dosyalarına ekle:**

   **`jan-ken-app1/.env.local` dosyasını aç:**
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS="0x..." # Remix'ten kopyaladığın address
   ```

   **`contracts/.env` dosyasını aç:**
   ```env
   ROCK_PAPER_SCISSORS_ADDRESS="0x..." # Aynı address
   ```

---

## ✅ Kontrol

### Contract'ı Test Et

Remix'te deployed contract'ın altında:

1. **BET_LEVEL_1, BET_LEVEL_2, vb. fonksiyonlarını test et:**
   - Fonksiyon adına tıkla
   - "call" butonuna tıkla
   - Sonucu gör (wei cinsinden)

2. **getMyGame fonksiyonunu test et:**
   - `getMyGame` fonksiyonunu bul
   - Address parametresine wallet adresini gir
   - "call" butonuna tıkla

---

## 🐛 Olası Sorunlar

### Hata: "Insufficient funds"
**Çözüm:** Base Sepolia faucet'ten daha fazla ETH al

### Hata: "Network mismatch"
**Çözüm:** MetaMask'ta Base Sepolia network'ünü seç

### Hata: "Compiler version not found"
**Çözüm:** Remix'te farklı bir compiler versiyonu dene (0.8.19, 0.8.21)

### Hata: "Transaction failed"
**Çözüm:** 
- Gas limit'i artır
- RPC bağlantısını kontrol et
- Yeterli ETH olduğundan emin ol

---

## 🎉 Başarılı!

Contract deploy edildikten sonra:

1. ✅ Contract address kaydedildi
2. ✅ Frontend'e eklendi
3. ✅ Oyunu test edebilirsin!

---

**Şimdi Remix IDE'yi aç ve yukarıdaki adımları takip et! 🚀**



