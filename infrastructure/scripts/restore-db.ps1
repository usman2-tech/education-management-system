# ==============================================================================
# SCRIPT: PostgreSQL Database Restore Verification (PowerShell)
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$DbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "127.0.0.1" }
$DbPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5433" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "ems_database" }
$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file $BackupFile does not exist."
    exit 1
}

Write-Host "==============================================================================" -ForegroundColor Yellow
Write-Host "WARNING: YOU ARE ABOUT TO RESTORE A POSTGRESQL DATABASE BACKUP" -ForegroundColor Yellow
Write-Host "Target Host:     $DbHost`:$DbPort" -ForegroundColor Yellow
Write-Host "Target Database: $DbName" -ForegroundColor Yellow
Write-Host "Source File:     $BackupFile" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Yellow

if (-not $Force) {
    $Confirm = Read-Host "Type 'RESTORE' to confirm operation on database [$DbName]"
    if ($Confirm -ne "RESTORE") {
        Write-Host "Restore cancelled by user." -ForegroundColor Red
        exit 0
    }
}

Write-Host "[$((Get-Date).ToString('u'))] Commencing restoration..." -ForegroundColor Cyan

if (Get-Command pg_restore -ErrorAction SilentlyContinue) {
    & pg_restore -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges $BackupFile
} else {
    Write-Host "Using Docker container to restore..." -ForegroundColor Cyan
    Get-Content $BackupFile -Raw | docker exec -i ems-postgres pg_restore -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges
}

Write-Host "Restoration completed." -ForegroundColor Green
