# install.ps1 - Installer script for mdvertex on Windows
$ErrorActionPreference = "Stop"

$repo = "gabrielrufino/mdvertex"
$installDir = if ($env:MDVERTEX_INSTALL_DIR) { $env:MDVERTEX_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "mdvertex" }
$binDir = if ($env:MDVERTEX_BIN_DIR) { $env:MDVERTEX_BIN_DIR } else { Join-Path $installDir "bin" }
$targetScript = Join-Path $installDir "mdvertex.js"

Write-Host "📐 Installing mdvertex..." -ForegroundColor Cyan

# Check for Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "❌ Error: Node.js is required to run mdvertex, but it was not found." -ForegroundColor Red
    Write-Host "Please install Node.js (v18 or higher) from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersionString = & node --version
if ($nodeVersionString -match 'v(\d+)\.') {
    $majorVersion = [int]$matches[1]
    if ($majorVersion -lt 18) {
        Write-Host "❌ Error: Node.js v18 or higher is required. Found $nodeVersionString." -ForegroundColor Red
        Write-Host "Please update Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

# Ensure directory structure exists
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$downloadUrl = "https://github.com/$repo/releases/latest/download/mdvertex"
$tempFile = "$targetScript.tmp"

Write-Host "⬇️  Downloading mdvertex from $downloadUrl..." -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -UseBasicParsing
}
catch {
    Write-Host "❌ Error: Failed to download mdvertex from $downloadUrl." -ForegroundColor Red
    Write-Host "Please verify your internet connection or check if a release is available at https://github.com/$repo/releases." -ForegroundColor Yellow
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    exit 1
}

Move-Item -Path $tempFile -Destination $targetScript -Force

# Create CMD wrapper
$cmdWrapper = Join-Path $binDir "mdvertex.cmd"
$cmdContent = "@ECHO off`r`nnode `"%~dp0..\mdvertex.js`" %*"
Set-Content -Path $cmdWrapper -Value $cmdContent -Encoding ASCII

# Create PowerShell wrapper
$psWrapper = Join-Path $binDir "mdvertex.ps1"
$psContent = "& node `"`$PSScriptRoot\..\mdvertex.js`" `$args"
Set-Content -Path $psWrapper -Value $psContent -Encoding ASCII

# Check and update PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -split ";" -notcontains $binDir) {
    $newUserPath = if ([string]::IsNullOrEmpty($userPath)) { $binDir } else { "$userPath;$binDir" }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    $env:Path = "$env:Path;$binDir"
    Write-Host "ℹ️  Added $binDir to user PATH." -ForegroundColor Gray
}

Write-Host "✅ mdvertex was installed successfully!" -ForegroundColor Green
Write-Host "Run 'mdvertex --help' to get started." -ForegroundColor Cyan
