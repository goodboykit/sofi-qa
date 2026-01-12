# SoFi-QA - Run Script for Windows (PowerShell)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Set console encoding to UTF-8 for better character support
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "        SoFi-QA - Synthetic Q&A Generator                   " -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

# ============================================================
# PREREQUISITE CHECKS
# ============================================================

Write-Host "[*] Checking prerequisites..." -ForegroundColor Cyan

# Check for Python
$PythonCmd = $null
try {
    $PythonCmd = Get-Command python -ErrorAction Stop
} catch {
    try {
        $PythonCmd = Get-Command python3 -ErrorAction Stop
    } catch {
        # Python not found
    }
}

if (-not $PythonCmd) {
    Write-Host ""
    Write-Host "[X] Python is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.10 or newer:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "  IMPORTANT: During installation, check the box that says:" -ForegroundColor Yellow
    Write-Host '  [x] "Add Python to PATH"' -ForegroundColor Green
    Write-Host ""
    exit 1
}

# Check Python version (need 3.10+)
$PythonVersion = & $PythonCmd.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$PythonMajor = & $PythonCmd.Source -c "import sys; print(sys.version_info.major)"
$PythonMinor = & $PythonCmd.Source -c "import sys; print(sys.version_info.minor)"

if ([int]$PythonMajor -lt 3 -or ([int]$PythonMajor -eq 3 -and [int]$PythonMinor -lt 10)) {
    Write-Host ""
    Write-Host "[X] Python version $PythonVersion is too old!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.10 or newer:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "    [OK] Python $PythonVersion found" -ForegroundColor Green

# Check for Node.js
$NodeCmd = $null
try {
    $NodeCmd = Get-Command node -ErrorAction Stop
} catch {
    # Node not found
}

if (-not $NodeCmd) {
    Write-Host ""
    Write-Host "[X] Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js (LTS version recommended):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "  Choose the LTS (Long Term Support) version." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$NodeVersion = & node --version
Write-Host "    [OK] Node.js $NodeVersion found" -ForegroundColor Green

# Check for npm
$NpmCmd = $null
try {
    $NpmCmd = Get-Command npm -ErrorAction Stop
} catch {
    # npm not found
}

if (-not $NpmCmd) {
    Write-Host ""
    Write-Host "[X] npm is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "npm usually comes with Node.js. Please reinstall Node.js:" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    exit 1
}

$NpmVersion = & npm --version
Write-Host "    [OK] npm $NpmVersion found" -ForegroundColor Green

Write-Host ""
Write-Host "[OK] All prerequisites met!" -ForegroundColor Green
Write-Host ""

# ============================================================
# SETUP AND RUN
# ============================================================

$VenvDir = Join-Path $ScriptDir ".venv"

# 1. Check/Create Virtual Environment
if (-not (Test-Path $VenvDir)) {
    Write-Host "[!] Virtual environment not found. Creating one..." -ForegroundColor Yellow
    & $PythonCmd.Source -m venv $VenvDir
}

# 2. Activate Virtual Environment
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"
if (Test-Path $VenvActivate) {
    . $VenvActivate
} else {
    # Fallback to standard python if venv structure is different
    Write-Host "[!] Could not find Activate.ps1, assuming python is in path or using global." -ForegroundColor Yellow
}

# 3. Check if DeepEval is installed, if not install all requirements
Write-Host "[*] Checking Python dependencies..." -ForegroundColor Cyan
$DeepEvalInstalled = $false
try {
    python -c "import deepeval" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $DeepEvalInstalled = $true
    }
} catch {
    $DeepEvalInstalled = $false
}

if (-not $DeepEvalInstalled) {
    Write-Host "[!] DeepEval not found. Installing all dependencies..." -ForegroundColor Yellow
    try {
        pip install --upgrade pip --quiet
        pip install -r (Join-Path $ScriptDir "requirements.txt")
        # Ensure PDF libraries are updated to fix bbox KeyError
        pip install --upgrade pdfplumber pdfminer.six --quiet
        Write-Host "[OK] All Python packages installed" -ForegroundColor Green
    } catch {
        Write-Host "[X] Failed to install Python dependencies!" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    [OK] DeepEval found" -ForegroundColor Green
    
    # Quick install to ensure all packages are up to date
    try {
        pip install -r (Join-Path $ScriptDir "requirements.txt") --quiet
        # Ensure PDF libraries are updated to fix bbox KeyError
        pip install --upgrade pdfplumber pdfminer.six --quiet
        Write-Host "    [OK] Dependencies up to date" -ForegroundColor Green
    } catch {
        Write-Host "[!] Some packages may have failed to update, continuing..." -ForegroundColor Yellow
    }
}

# 4. Check Frontend Dependencies
$FrontendDir = Join-Path $ScriptDir "frontend"
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "[!] Node modules not found. Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

# 5. Start Servers
Write-Host "[>] Starting Backend (Port 8000)..." -ForegroundColor Cyan
$UvicornPath = Join-Path $VenvDir "Scripts\uvicorn.exe"
$BackendProcess = Start-Process $UvicornPath -ArgumentList "src.api:app --host 0.0.0.0 --port 8000 --reload" -PassThru -NoNewWindow

Start-Sleep -Seconds 3

Write-Host "[>] Starting Frontend (Port 5173)..." -ForegroundColor Cyan
# Use -WorkingDirectory to ensure npm runs from frontend folder
$FrontendProcess = Start-Process cmd -ArgumentList "/c npm run dev" -WorkingDirectory $FrontendDir -PassThru -NoNewWindow

Write-Host ""
Write-Host "[OK] Both servers are running!" -ForegroundColor Green
Write-Host "     Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "     Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow

# Wait loop
try {
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} catch {
    # If user hits Ctrl+C or processes die
    Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
    Write-Host "[X] Stopped servers." -ForegroundColor Red
}
