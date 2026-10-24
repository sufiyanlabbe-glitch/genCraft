Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting CreatorAI - AI-Powered Content Studio" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$pythonPath = "C:\Users\Sufiyan\AppData\Local\Python\pythoncore-3.14-64\python.exe"

if (Test-Path $pythonPath) {
    & $pythonPath app.py
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    py app.py
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python app.py
} else {
    Write-Host "Python not found! Please check your installation." -ForegroundColor Red
}

