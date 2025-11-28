# 🔧 Foundry Manuel Kurulum - Windows

## 📥 Adım 1: Foundry Binary'lerini İndir

### Yöntem A: GitHub'dan İndir (Önerilen)

1. Tarayıcıda şu adrese git:
   https://github.com/foundry-rs/foundry/releases/latest

2. `foundry_nightly_x86_64-pc-windows-msvc.zip` dosyasını indir

3. İndirilen dosyayı aç ve içindeki dosyaları kopyala

### Yöntem B: PowerShell ile İndir

```powershell
# Geçici klasör
$tempDir = "$env:TEMP\foundry"
New-Item -ItemType Directory -Force -Path $tempDir

# GitHub releases sayfasından en son sürümü kontrol et
# Örnek URL (güncel sürümü kontrol et):
$url = "https://github.com/foundry-rs/foundry/releases/download/nightly-2024-12-20/foundry_nightly_x86_64-pc-windows-msvc.zip"

# İndir
Invoke-WebRequest -Uri $url -OutFile "$tempDir\foundry.zip"

# Aç
Expand-Archive -Path "$tempDir\foundry.zip" -DestinationPath $tempDir -Force
```

---

## 📁 Adım 2: Binary'leri Kopyala

```powershell
# Foundry klasörü oluştur
$foundryBin = "$env:USERPROFILE\.foundry\bin"
New-Item -ItemType Directory -Force -Path $foundryBin

# Binary'leri kopyala (açtığın klasörden)
# forge.exe, cast.exe, anvil.exe, chisel.exe dosyalarını kopyala
Copy-Item "$tempDir\foundry_nightly_x86_64-pc-windows-msvc\forge.exe" -Destination $foundryBin -Force
Copy-Item "$tempDir\foundry_nightly_x86_64-pc-windows-msvc\cast.exe" -Destination $foundryBin -Force
Copy-Item "$tempDir\foundry_nightly_x86_64-pc-windows-msvc\anvil.exe" -Destination $foundryBin -Force
Copy-Item "$tempDir\foundry_nightly_x86_64-pc-windows-msvc\chisel.exe" -Destination $foundryBin -Force
```

---

## 🔧 Adım 3: PATH'e Ekle

### Yöntem A: PowerShell ile (Geçici)

```powershell
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
```

### Yöntem B: Kalıcı Olarak

1. Windows tuşu + R
2. `sysdm.cpl` yaz ve Enter
3. "Gelişmiş" sekmesi > "Ortam Değişkenleri"
4. "Kullanıcı değişkenleri" altında "Path" seç > "Düzenle"
5. "Yeni" > `C:\Users\deepn\.foundry\bin` ekle
6. Tamam > Tamam
7. **PowerShell'i kapat ve yeniden aç**

---

## ✅ Adım 4: Kontrol Et

Yeni PowerShell penceresinde:

```powershell
forge --version
cast --version
```

Başarılı olursa kurulum tamamlandı!

---

## 🚀 Alternatif: Hardhat Kullan

Eğer Foundry kurulumu çok zorsa, Hardhat kullanabiliriz:

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

---

**Hangi yöntemi tercih edersin? Manuel kurulum mu yoksa Hardhat'a geçelim mi?**







