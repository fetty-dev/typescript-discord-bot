# Windows Native Ollama Setup

## 🎯 Why This Works
- Your RX 9070XT is managed by Windows (not WSL2)
- Windows has better AMD GPU drivers for RDNA4
- Discord bot stays in WSL2, connects to Windows Ollama
- Zero driver hassles, immediate GPU support

## 📋 Setup Steps

### 1. Download Ollama on Windows
**Option A: Direct Download**
- Go to: https://ollama.com/download/windows
- Download and run OllamaSetup.exe

**Option B: PowerShell (as Administrator)**
```powershell
# Download installer
Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "$env:TEMP\OllamaSetup.exe"

# Run installer
Start-Process -FilePath "$env:TEMP\OllamaSetup.exe" -Wait
```

### 2. Configure for AMD GPU
**In Windows PowerShell (as Administrator):**
```powershell
# Set environment variables for your RX 9070XT
[Environment]::SetEnvironmentVariable("HIP_VISIBLE_DEVICES", "0", "Machine")
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "Machine")

# Restart to apply
Restart-Computer
```

### 3. Start Ollama on Windows
**After restart, in PowerShell:**
```powershell
# Start Ollama service
ollama serve

# In another PowerShell window, pull your model:
ollama pull gpt-oss:20b

# Test GPU usage
ollama run gpt-oss:20b "Hi there!"
```

### 4. Update Discord Bot Config
**In WSL2, edit your .env file:**
```bash
# Change this line:
OLLAMA_URL=http://172.29.240.1:11434

# Note: Replace 172.29.240.1 with your Windows IP
# Find it with: ipconfig | findstr "WSL"
```

### 5. Test Connection
**From WSL2:**
```bash
# Test connection to Windows Ollama
curl http://172.29.240.1:11434/api/version

# Should return: {"version":"0.x.x"}
```

## 🔧 Find Your Windows IP
**In Windows PowerShell:**
```powershell
# Find WSL host IP
ipconfig | Select-String "WSL" -A 4 -B 2
```

Look for the "Ethernet adapter vEthernet (WSL)" IP address.

## ✅ Expected Results
- **Windows**: Ollama uses RX 9070XT GPU directly
- **Performance**: 60s → 3-5s responses
- **WSL2**: Discord bot connects via network
- **Zero driver issues**: Windows handles everything