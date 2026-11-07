<#
.SYNOPSIS
    SentinelMesh AI — Unified Startup & Demonstration Orchestrator (Windows PowerShell)

.DESCRIPTION
    Runs system preflight diagnostics and coordinates backend, frontend, and Docker sandbox readiness.

.EXAMPLE
    .\start_application.ps1
    .\start_application.ps1 -RunDemo
#>

param (
    [switch]$RunDemo,
    [switch]$RunTests,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "    SentinelMesh AI -- Unified Application Startup     " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Run Preflight Check
Write-Host "[1/3] Running preflight environment verification..." -ForegroundColor Yellow
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    python scripts/preflight_check.py
} elseif (Test-Path "$env:USERPROFILE\anaconda3\python.exe") {
    & "$env:USERPROFILE\anaconda3\python.exe" scripts/preflight_check.py
} else {
    Write-Host "Python not found in PATH or standard location." -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Preflight checks failed. Please fix the reported issues above." -ForegroundColor Red
    exit 1
}

if ($CheckOnly) {
    Write-Host "Preflight check completed successfully (-CheckOnly flag passed)." -ForegroundColor Green
    exit 0
}

# 2. Run Tests if requested
if ($RunTests) {
    Write-Host "[2/3] Running complete test suite..." -ForegroundColor Yellow
    pytest -v
    exit $LASTEXITCODE
}

# 3. Instructions and Running Options
Write-Host ""
Write-Host "[2/3] Deployment Ports and Endpoints:" -ForegroundColor Yellow
Write-Host "  - React Frontend UI:     http://localhost:5173" -ForegroundColor White
Write-Host "  - FastAPI Backend Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Backend Health Check:  http://localhost:8000/health" -ForegroundColor White
Write-Host "  - Canonical Demo Defect: http://localhost:8000/demo/users" -ForegroundColor White
Write-Host ""

if ($RunDemo) {
    Write-Host "[3/3] Executing Automated End-to-End Demo Scenario..." -ForegroundColor Yellow
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        python scripts/run_demo_scenario.py
    } else {
        & "$env:USERPROFILE\anaconda3\python.exe" scripts/run_demo_scenario.py
    }
    exit $LASTEXITCODE
}

Write-Host "[3/3] Startup Commands for Windows PowerShell:" -ForegroundColor Yellow
Write-Host "  To start the FastAPI backend:" -ForegroundColor Cyan
Write-Host "    python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "  To start the React frontend:" -ForegroundColor Cyan
Write-Host "    npm run dev --prefix frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "  To execute the automated end-to-end demo:" -ForegroundColor Cyan
Write-Host "    python scripts/run_demo_scenario.py" -ForegroundColor Gray
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
