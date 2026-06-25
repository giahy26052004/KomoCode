# KomoCode install script for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/giahy26052004/KomoCode/fresh-main/install.ps1 | iex

param(
  [string]$InstallDir = "$env:LOCALAPPDATA\KomoCode\bin"
)

$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$R2_BASE = "https://pub-35d505cd7b5b4b08b523badfd81534a5.r2.dev"
$Arch    = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq "Arm64") { "arm64" } else { "x64" }
$Binary  = "komocode-windows-$Arch.exe"

Write-Host ""
Write-Host "  Installing KomoCode ($Arch)..." -ForegroundColor Cyan

$DownloadUrl = "$R2_BASE/latest/$Binary"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$OutFile = "$InstallDir\komocode.exe"

try {
  ([System.Net.WebClient]::new()).DownloadFile($DownloadUrl, $OutFile)
} catch {
  Write-Host "  Error: $_" -ForegroundColor Red
  exit 1
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$UserPath", "User")
  Write-Host "  Added to PATH (restart terminal)" -ForegroundColor Yellow
}

Write-Host "  Done!  Run:  komocode" -ForegroundColor Green
Write-Host ""
