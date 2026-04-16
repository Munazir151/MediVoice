$ErrorActionPreference = 'Stop'

$python = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
  throw "Python executable not found at $python. Create the project virtual environment first."
}

Set-Location $PSScriptRoot
& $python -m uvicorn app.main:app --reload --port 8000