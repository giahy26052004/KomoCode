# KomoCode install script for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/giahy26052004/KomoCode/main/install.ps1 | iex

param(
  [string]$Version = "latest",
  [string]$InstallDir = "$env:LOCALAPPDATA\KomoCode\bin"
)

$Repo = "giahy26052004/KomoCode"
$Arch = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq "Arm64") { "arm64" } else { "x64" }
$Binary = "komocode-windows-$Arch.exe"

if ($Version -eq "latest") {
  $DownloadUrl = "https://github.com/$Repo/releases/latest/download/$Binary"
} else {
  $DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Binary"
}

Write-Host ""
Write-Host "  Installing KomoCode ($Arch)..."
Write-Host "  From: $DownloadUrl"
Write-Host ""

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$OutFile = "$InstallDir\komocode.exe"

try {
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $OutFile -UseBasicParsing
} catch {
  Write-Host "  Error: $_"
  exit 1
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$UserPath", "User")
  Write-Host "  Added to PATH (restart terminal)"
}

Write-Host ""
Write-Host "  Done!  Run:  komocode"
Write-Host ""
