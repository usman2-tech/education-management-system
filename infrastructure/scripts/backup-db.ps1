# ==============================================================================
# SCRIPT: PostgreSQL Database Backup Automation (PowerShell)
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
[CmdletBinding()]
param (
    [string]$BackupDir = "./backups/postgres",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

$DbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "127.0.0.1" }
$DbPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5433" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "ems_database" }
$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }

$DateStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "ems_${DbName}_${DateStamp}.dump"

Write-Host "[$((Get-Date).ToString('u'))] Starting backup for $DbName on $DbHost:$DbPort..." -ForegroundColor Cyan

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --format=custom --compress=9 --no-owner --no-privileges --file=$BackupFile
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Running backup via Docker container ems-postgres..." -ForegroundColor Yellow
    docker exec ems-postgres pg_dump -U $DbUser -d $DbName --format=custom --compress=9 --no-owner --no-privileges | Out-File -FilePath $BackupFile -Encoding byte
} else {
    Write-Error "Neither pg_dump nor docker is available on PATH."
    exit 1
}

if (Test-Path $BackupFile) {
    $Size = (Get-Item $BackupFile).Length / 1MB
    Write-Host "[$((Get-Date).ToString('u'))] Backup successful! File: $BackupFile ($([math]::Round($Size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Error "Backup file was not created."
    exit 1
}

# Cleanup older backups
$Cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "ems_${DbName}_*.dump" | Where-Object { $_.LastWriteTime -lt $Cutoff } | Remove-Item -Force
Write-Host "Backup rotation completed." -ForegroundColor Cyan
