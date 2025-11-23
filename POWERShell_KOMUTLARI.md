# 💻 PowerShell Komutları - Doğru Kullanım

## ❌ YANLIŞ Kullanım

```powershell
C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

Bu sadece bir path, komut değil!

---

## ✅ DOĞRU Kullanım

### Klasöre Gitmek İçin: `cd` Komutu

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

---

## 🚀 ADIM ADIM: Doğru Komutlar

### ADIM 1: Contracts Klasörüne Git

```powershell
# PowerShell'de şunu yaz:
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts

# Enter'a bas
# Şimdi contracts klasöründesin!
```

**Kontrol et:**
```powershell
# Hangi klasörde olduğunu göster
pwd
# veya
Get-Location
```

**Çıktı şöyle olmalı:**
```
Path
----
C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

---

### ADIM 2: .env Dosyası Oluştur

```powershell
# Hala contracts klasöründeyken:
@"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
"@ | Out-File -FilePath .env -Encoding utf8
```

**Kontrol et:**
```powershell
# Dosyanın oluştuğunu gör
dir .env
# veya
ls .env

# İçeriğini gör
type .env
```

---

### ADIM 3: Frontend Klasörüne Git

```powershell
# contracts klasöründen çık, jan-ken-app'e git
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app
```

**Kontrol et:**
```powershell
pwd
# Şöyle olmalı:
# C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app
```

---

### ADIM 4: .env.local Dosyası Oluştur

```powershell
# Hala jan-ken-app klasöründeyken:
@"
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**Kontrol et:**
```powershell
dir .env.local
type .env.local
```

---

## 📋 TAM KOMUT LİSTESİ (Kopyala-Yapıştır)

### 1. Contracts .env Oluştur

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
@"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0xe95df50610b1a5f0f9c65e8cba33de1a9b062bedfbd6125caf2d344be35cbb06"
ROCK_PAPER_SCISSORS_ADDRESS=""
"@ | Out-File -FilePath .env -Encoding utf8
type .env
```

### 2. Frontend .env.local Oluştur

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\jan-ken-app
@"
NEXT_PUBLIC_CDP_API_KEY_ID="f0532979-ad56-48aa-907a-bfd4fb535ceb"
NEXT_PUBLIC_CDP_API_KEY_SECRET="vZm96Yjq6mw1WWgnXY81FD7W4ahKRUXVyjBCBt5qo+Sa5bpXk5Y2PowMB9mBrHlTkUvLH9Lh7IY9BBlTTvVBmw=="
NEXT_PUBLIC_CONTRACT_ADDRESS=""
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
"@ | Out-File -FilePath .env.local -Encoding utf8
type .env.local
```

---

## 🎯 PowerShell Temel Komutları

| Komut | Ne Yapar? |
|-------|-----------|
| `cd <path>` | Klasöre git |
| `pwd` | Hangi klasörde olduğunu göster |
| `dir` veya `ls` | Klasördeki dosyaları listele |
| `type <dosya>` | Dosya içeriğini göster |
| `cd ..` | Bir üst klasöre çık |

---

## 🆘 Yaygın Hatalar

### Hata 1: "The term is not recognized"
**Sebep:** `cd` komutunu kullanmadın
**Çözüm:** `cd` ekle: `cd C:\Users\...`

### Hata 2: "Cannot find path"
**Sebep:** Klasör yok veya yanlış path
**Çözüm:** 
```powershell
# Önce klasörün var olup olmadığını kontrol et
Test-Path C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
```

### Hata 3: "Access Denied"
**Sebep:** Yetki yok
**Çözüm:** PowerShell'i **Yönetici olarak çalıştır**

---

## ✅ Başarı Kontrolü

Her adımdan sonra şunu çalıştır:

```powershell
# Hangi klasördeyim?
pwd

# Dosya oluştu mu?
dir .env
dir .env.local

# İçerik doğru mu?
type .env
type .env.local
```

---

**Şimdi yukarıdaki komutları `cd` ile başlayarak kullan! 🚀**



