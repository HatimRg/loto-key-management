# PowerShell script to view app debug logs
$logPath = "$env:APPDATA\loto-key-management\app-debug.log"

Write-Host "📄 Log file location: $logPath" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $logPath) {
    Write-Host "📋 Last 50 lines of log:" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Gray
    Get-Content $logPath -Tail 50
    Write-Host "=" * 80 -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Full log file: $logPath" -ForegroundColor Green
} else {
    Write-Host "❌ Log file not found at: $logPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Looking for log files in AppData..." -ForegroundColor Yellow
    Get-ChildItem "$env:APPDATA\*loto*" -Recurse -Filter "*.log" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Found: $($_.FullName)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
