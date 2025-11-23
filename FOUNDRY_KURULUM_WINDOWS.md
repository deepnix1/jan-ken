# 🔧 Foundry Kurulumu - Windows

## ⚠️ Sorun

Foundry kurulumu başarısız oldu. Alternatif yöntemler:

## 🚀 Yöntem 1: Chocolatey ile Kurulum (Önerilen)

### 1. Chocolatey Kur (Eğer yoksa)

PowerShell'i **Yönetici olarak** aç ve:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Foundry Kur

```powershell
choco install foundry
```

### 3. PATH'i Güncelle

```powershell
$env:PATH += ";C:\ProgramData\chocolatey\bin"
```

### 4. Kontrol Et

```powershell
forge --version
cast --version
```

---

## 🚀 Yöntem 2: Manuel Kurulum

### 1. Foundry Binary'lerini İndir

```powershell
# Geçici klasör oluştur
$tempDir = "$env:TEMP\foundry"
New-Item -ItemType Directory -Force -Path $tempDir

# İndir (GitHub releases'dan)
Invoke-WebRequest -Uri "https://github.com/foundry-rs/foundry/releases/download/nightly-2024-12-20/foundry_nightly_x86_64-pc-windows-msvc.zip" -OutFile "$tempDir\foundry.zip"

# Aç
Expand-Archive -Path "$tempDir\foundry.zip" -DestinationPath "$tempDir" -Force
```

### 2. PATH'e Ekle

```powershell
# Kullanıcı PATH'ine ekle
$foundryPath = "$env:USERPROFILE\.foundry\bin"
New-Item -ItemType Directory -Force -Path $foundryPath

# Binary'leri kopyala
Copy-Item "$tempDir\foundry_nightly_x86_64-pc-windows-msvc\*" -Destination $foundryPath -Recurse -Force

# PATH'e ekle
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$foundryPath", "User")
```

### 3. Terminal'i Yeniden Başlat

PowerShell'i kapat ve yeniden aç.

### 4. Kontrol Et

```powershell
forge --version
```

---

## 🚀 Yöntem 3: WSL (Windows Subsystem for Linux) Kullan

Eğer WSL kuruluysa:

```bash
# WSL'de
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

---

## 🚀 Yöntem 4: Hardhat Kullan (Alternatif)

Foundry kurulumu sorunluysa, Hardhat kullanabiliriz:

```powershell
cd C:\Users\deepn\Desktop\AGENT\jan-ken\contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

---

## ✅ Hangi Yöntemi Seçmeliyim?

1. **Chocolatey varsa:** Yöntem 1 (En kolay)
2. **Chocolatey yoksa:** Yöntem 2 (Manuel)
3. **WSL varsa:** Yöntem 3
4. **Hepsi başarısızsa:** Yöntem 4 (Hardhat)

---

**Hangi yöntemi denemek istersin? Veya Hardhat'a geçelim mi?**



