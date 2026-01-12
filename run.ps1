# SoFi-QA - Run Script for Windows (PowerShell)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "        SoFi-QA - Synthetic Q&A Generator                   " -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

$VenvDir = Join-Path $ScriptDir ".venv"

# 1. Check/Create Virtual Environment
if (-not (Test-Path $VenvDir)) {
    Write-Host "[!] Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv $VenvDir
}

# 2. Activate Virtual Environment
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"
if (Test-Path $VenvActivate) {
    . $VenvActivate
} else {
    # Fallback to standard python if venv structure is different
    Write-Host "[!] Could not find Activate.ps1, assuming python is in path or using global." -ForegroundColor Yellow
}

# 3. Install Requirements
Write-Host "[*] Checking dependencies..." -ForegroundColor Cyan
pip install -r (Join-Path $ScriptDir "requirements.txt") | Out-Null

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
$BackendProcess = Start-Process uvicorn -ArgumentList "src.api:app --host 0.0.0.0 --port 8000 --reload" -PassThru -NoNewWindow

Start-Sleep -Seconds 3

Write-Host "[>] Starting Frontend (Port 5173)..." -ForegroundColor Cyan
Push-Location $FrontendDir
# We run npm in a new process to avoid blocking
$FrontendProcess = Start-Process npm -ArgumentList "run dev" -PassThru -NoNewWindow
Pop-Location

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
