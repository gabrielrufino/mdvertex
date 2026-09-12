# uninstall.ps1 - Uninstaller script for mdvertex on Windows
$ErrorActionPreference = "Stop"

$installDir = if ($env:MDVERTEX_INSTALL_DIR) { $env:MDVERTEX_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "mdvertex" }
$binDir = if ($env:MDVERTEX_BIN_DIR) { $env:MDVERTEX_BIN_DIR } else { Join-Path $installDir "bin" }

Write-Host "🗑️  Uninstalling mdvertex..." -ForegroundColor Cyan

$removed = $false

if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force
    Write-Host "🗑️  Removed install directory: $installDir" -ForegroundColor Gray
    $removed = $true
}

# Clean PATH if binDir was added
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -and ($userPath -split ";" -contains $binDir)) {
    $newPaths = ($userPath -split ";" | Where-Object { $_ -ne $binDir }) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newPaths, "User")
    Write-Host "ℹ️  Removed $binDir from user PATH." -ForegroundColor Gray
}

if ($removed) {
    Write-Host "✅ mdvertex was uninstalled successfully!" -ForegroundColor Green
}
else {
    Write-Host "ℹ️  mdvertex is not installed (no files found to remove)." -ForegroundColor Yellow
}
