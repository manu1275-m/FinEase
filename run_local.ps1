param(
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 3000,
    [switch]$NoBrowser
)

$root = Split-Path $PSCommandPath -Parent
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pythonExe = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Error "Python venv not found at $pythonExe. Activate venv or adjust path."
    exit 1
}

Write-Host "Starting backend on http://127.0.0.1:$BackendPort ..."
Start-Process -FilePath $pythonExe -WorkingDirectory $backendDir -ArgumentList @(
    "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$BackendPort", "--reload"
) -WindowStyle Normal

Write-Host "Starting frontend on http://127.0.0.1:$FrontendPort ..."
Start-Process -FilePath $pythonExe -WorkingDirectory $frontendDir -ArgumentList @(
    "-m", "http.server", "$FrontendPort"
) -WindowStyle Normal

if (-not $NoBrowser) {
    Start-Sleep -Seconds 3
    Write-Host "Opening browser to http://127.0.0.1:$FrontendPort ..."
    Start-Process "http://127.0.0.1:$FrontendPort"
}

Write-Host "Backend PID and Frontend PID are in their respective windows. Press Ctrl+C in those windows to stop."