# start.ps1 — 台南土地公 一鍵啟動
# 雙擊 start.bat，或右鍵 -> 用 PowerShell 執行

$root = $PSScriptRoot

function Write-Banner {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor DarkYellow
    Write-Host "    台南土地公 Tainan TuDiGong Full Stack" -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor DarkYellow
    Write-Host ""
}

function Check-Prereqs {
    # 後端 venv
    if (-not (Test-Path "$root\backend\.venv\Scripts\python.exe")) {
        Write-Host "  [ERROR] backend/.venv 不存在，請先執行：" -ForegroundColor Red
        Write-Host "    cd backend" -ForegroundColor Gray
        Write-Host "    python -m venv .venv" -ForegroundColor Gray
        Write-Host "    .\.venv\Scripts\pip install -e '.[dev]'" -ForegroundColor Gray
        Read-Host "Press Enter to exit"
        exit 1
    }
    # 前端 node_modules
    if (-not (Test-Path "$root\frontend\node_modules")) {
        Write-Host "  [INFO] frontend/node_modules 不存在，安裝中..." -ForegroundColor Yellow
        Push-Location "$root\frontend"
        npm install
        Pop-Location
    }
    # .env 檢查
    if (-not (Test-Path "$root\.env")) {
        Write-Host "  [WARN] 根目錄沒有 .env，請複製 .env.example 並填入 API Key" -ForegroundColor Yellow
        Write-Host "         cp .env.example .env" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Banner
Check-Prereqs

# 載入根目錄 .env，分別傳給各服務
$envFile = "$root\.env"
$envVars = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[A-Z]" -and $_ -notmatch "^#" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts.Count -eq 2) { $envVars[$parts[0].Trim()] = $parts[1].Trim() }
    }
}

# ── 1. Swarm Server (port 9000) ──────────────────────────────
Write-Host "  [1/3] 啟動 Swarm Server (port 9000)..." -ForegroundColor Magenta
$swarmCmd = "Set-Location '$root\backend\agents'; " +
    "`$env:GOOGLE_API_KEY='$($envVars['GOOGLE_API_KEY'])'; " +
    "`$env:GOOGLE_GENAI_USE_VERTEXAI='FALSE'; " +
    "Write-Host '=== Swarm Server  http://localhost:9000 ===' -ForegroundColor Magenta; " +
    ".\..\backend\.venv\Scripts\python -m dijizhu.swarm_server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $swarmCmd
Start-Sleep -Seconds 3

# ── 2. Gateway (port 8080) ───────────────────────────────────
Write-Host "  [2/3] 啟動 Gateway (port 8080)..." -ForegroundColor Green
$gatewayCmd = "Set-Location '$root\backend'; " +
    "`$env:GOOGLE_API_KEY='$($envVars['GOOGLE_API_KEY'])'; " +
    "`$env:GOOGLE_GENAI_USE_VERTEXAI='FALSE'; " +
    "Write-Host '=== Gateway  http://localhost:8080 ===' -ForegroundColor Green; " +
    ".\.venv\Scripts\python -m uvicorn apps.api.gateway:app --port 8080 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $gatewayCmd
Start-Sleep -Seconds 3

# ── 3. Frontend Vite (port 5173) ─────────────────────────────
Write-Host "  [3/3] 啟動前端 (port 5173)..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$root\frontend'; " +
    "`$env:VITE_MAPBOX_TOKEN='$($envVars['VITE_MAPBOX_TOKEN'])'; " +
    "`$env:VITE_WEATHER_KEY='$($envVars['VITE_WEATHER_KEY'])'; " +
    "`$env:VITE_BACKEND_HTTP='$($envVars['VITE_BACKEND_HTTP'] ?? 'http://127.0.0.1:8080')'; " +
    "`$env:VITE_BACKEND_WS='$($envVars['VITE_BACKEND_WS'] ?? 'ws://127.0.0.1:8080')'; " +
    "Write-Host '=== Frontend  http://localhost:5173 ===' -ForegroundColor Cyan; " +
    "npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "  等待服務啟動 (10 秒)..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "   Swarm     http://localhost:9000" -ForegroundColor Gray
Write-Host "   Gateway   http://localhost:8080/docs" -ForegroundColor Gray
Write-Host "   Frontend  http://localhost:5173" -ForegroundColor Gray
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  此視窗可關閉，三個服務各自在獨立視窗執行。" -ForegroundColor DarkGray
Write-Host ""
