# start.ps1 -- Tainan TuDiGong one-click launcher
# Double-click start.bat, or right-click -> Run with PowerShell

$root = $PSScriptRoot

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host "   Tainan TuDiGong Full Stack" -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor DarkYellow
Write-Host ""

# -- Prereq checks -------------------------------------------------------
if (-not (Test-Path "$root\backend\.venv\Scripts\python.exe")) {
    Write-Host "  [ERROR] backend/.venv not found. Please run:" -ForegroundColor Red
    Write-Host "    cd backend" -ForegroundColor Gray
    Write-Host "    python -m venv .venv" -ForegroundColor Gray
    Write-Host "    .\.venv\Scripts\pip install -e '.[dev]'" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "  [INFO] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "$root\frontend"
    npm install
    Pop-Location
}

# -- Load .env into current session (child processes inherit) ------------
$envFile = "$root\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[A-Za-z_][A-Za-z0-9_]*=" -and $_ -notmatch "^\s*#" } | ForEach-Object {
        $idx = $_.IndexOf("=")
        $key = $_.Substring(0, $idx).Trim()
        $val = $_.Substring($idx + 1).Trim()
        Set-Item -Path "Env:$key" -Value $val
    }
    Write-Host "  [OK] .env loaded" -ForegroundColor Green
} else {
    Write-Host "  [WARN] .env not found. Copy .env.example and fill in API keys:" -ForegroundColor Yellow
    Write-Host "         Copy-Item .env.example .env" -ForegroundColor Gray
    Write-Host ""
}

# -- 1. Swarm Server (port 9000) -----------------------------------------
Write-Host "  [1/3] Starting Swarm Server (port 9000)..." -ForegroundColor Magenta
$swarmDir = "$root\backend\agents"
$swarmPy  = "$root\backend\.venv\Scripts\python.exe"
$s1 = "Set-Location '$swarmDir'; Write-Host '=== Swarm Server  http://localhost:9000 ===' -ForegroundColor Magenta; & '$swarmPy' -m dijizhu.swarm_server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $s1
Start-Sleep -Seconds 3

# -- 2. Gateway (port 8080) ----------------------------------------------
Write-Host "  [2/3] Starting Gateway (port 8080)..." -ForegroundColor Green
$backendDir = "$root\backend"
$backendPy  = "$root\backend\.venv\Scripts\python.exe"
$s2 = "Set-Location '$backendDir'; Write-Host '=== Gateway  http://localhost:8080 ===' -ForegroundColor Green; & '$backendPy' -m uvicorn apps.api.gateway:app --port 8080 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $s2
Start-Sleep -Seconds 3

# -- 3. Frontend Vite (port 5173) ----------------------------------------
Write-Host "  [3/3] Starting Frontend (port 5173)..." -ForegroundColor Cyan
$frontendDir = "$root\frontend"
$s3 = "Set-Location '$frontendDir'; Write-Host '=== Frontend  http://localhost:5173 ===' -ForegroundColor Cyan; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $s3

# -- Open browser --------------------------------------------------------
Write-Host ""
Write-Host "  Waiting 10s for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "   Swarm     http://localhost:9000" -ForegroundColor Gray
Write-Host "   Gateway   http://localhost:8080/docs" -ForegroundColor Gray
Write-Host "   Frontend  http://localhost:5173" -ForegroundColor Gray
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  This window can be closed. Services run in their own windows." -ForegroundColor DarkGray
Write-Host ""
