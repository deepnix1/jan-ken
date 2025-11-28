# 🚀 Deploy Hazırlık Kontrolü

## ✅ Kontrol Sonucu: HER ŞEY HAZIR!

Tüm dosyalar doğru oluşturulmuş. Artık contract deploy edebilirsin.

---

## 📋 Son Kontrol Listesi

- [x] `contracts/.env` dosyası oluşturuldu
- [x] Private key eklendi
- [x] RPC URL'leri eklendi
- [x] `jan-ken-app/.env.local` dosyası oluşturuldu
- [x] CDP API Key bilgileri eklendi
- [x] `.gitignore` dosyaları doğru
- [x] Dosyalar güvenli (git'e commit edilmeyecek)

---

## 🚀 Şimdi Ne Yapmalıyım?

### ADIM 1: Contracts Klasörüne Git

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

### ADIM 2: Environment Variables Set Et

```powershell
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
```

### ADIM 3: Contract Compile Et

```powershell
forge build
```

**Beklenen çıktı:**
```
[⠊] Compiling...
[⠊] Compiling 1 files with 0.8.20
[⠊] Solc 0.8.20 finished in 2.34s
Compiler run successful!
```

### ADIM 4: Test Et (Opsiyonel ama Önerilir)

```powershell
forge test
```

**Beklenen çıktı:**
```
[⠊] Compiling...
[⠊] Compiling 2 files with 0.8.20
[⠊] Solc 0.8.20 finished in 2.34s
Compiler run successful!

Running 3 tests for test/RockPaperScissors.t.sol:RockPaperScissorsTest
[PASS] testJoinQueue() (gas: 123456)
[PASS] testMatchPlayers() (gas: 234567)
[PASS] testRockBeatsScissors() (gas: 345678)
Test result: ok. 3 passed; 0 failed; finished in 1.23s
```

### ADIM 5: Deploy Et

```powershell
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast
```

**Beklenen çıktı:**
```
[⠊] Compiling...
[⠊] Compiling 1 files with 0.8.20
[⠊] Solc 0.8.20 finished in 2.34s
Compiler run successful!

Script ran successfully.

== Return ==
0x...

## Setting up (1) EVMs.
==========================

Chain 84532

Estimated gas price: 0.1 gwei
Estimated total cost: 0.000123 ETH

Contract address: 0x1234567890abcdef1234567890abcdef12345678
```

---

## 📝 Deploy Sonrası

### 1. Contract Address'i Kopyala

Deploy sonrası çıkan address'i kopyala (örnek: `0x1234567890abcdef...`)

### 2. contracts/.env Dosyasına Ekle

```powershell
# contracts klasöründe
# .env dosyasını aç ve şunu ekle:
ROCK_PAPER_SCISSORS_ADDRESS="0x..." # Deploy sonrası çıkan address
```

### 3. jan-ken-app/.env.local Dosyasına Ekle

```powershell
# jan-ken-app klasöründe
# .env.local dosyasını aç ve şunu güncelle:
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..." # Aynı address
```

---

## 🆘 Olası Hatalar ve Çözümleri

### Hata 1: "insufficient funds"

**Sebep:** Base Sepolia ETH yetersiz

**Çözüm:**
```powershell
# Balance kontrolü
cast balance <WALLET_ADDRESS> --rpc-url https://sepolia.base.org

# Faucet'ten ETH al:
# https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
```

### Hata 2: "execution reverted"

**Sebep:** RPC URL veya private key yanlış

**Çözüm:**
```powershell
# Environment variables'ı tekrar set et
$env:BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
$env:PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
```

### Hata 3: "forge: command not found"

**Sebep:** Foundry kurulu değil

**Çözüm:**
```powershell
# Foundry kur
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_x86_64-pc-windows-msvc.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
foundryup
```

---

## ✅ Başarı Kontrolü

Deploy başarılı olduysa:

1. ✅ Contract address gösterildi
2. ✅ Transaction hash gösterildi
3. ✅ Base Sepolia explorer'da görünebilir

**Explorer'da kontrol et:**
- https://sepolia.basescan.org
- Transaction hash'i veya contract address'i ara

---

## 🎯 Sonraki Adımlar

1. ✅ Contract deploy edildi
2. ⏭️ Contract address kaydedildi
3. ⏭️ Frontend'i başlat: `cd jan-ken-app && npm run dev`
4. ⏭️ Oyunu test et!

---

**Hazırsın! Deploy etmeye başlayabilirsin! 🚀**







