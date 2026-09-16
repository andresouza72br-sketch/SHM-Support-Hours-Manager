param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "reset-db", "sync", "diff", "backups", "restore", "backup-db")]
    [string]$Action = "start",

    [Parameter(Position=1)]
    [string]$Target = "backend",

    [switch]$Visible = $false,
    [switch]$VsCode = $false,
    [switch]$Force = $false
)

switch ($Action) {
    "reset-db" {
        & "$PSScriptRoot\tools\database\reset_db.ps1" -Force:$Force
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Reiniciando ambiente apos reset..." -ForegroundColor Cyan
            & "$PSScriptRoot\tools\scripts\start-dev.ps1" -Visible:$Visible
        }
    }
    "stop" {
        & "$PSScriptRoot\tools\scripts\stop-dev.ps1"
    }
    "start" {
        & "$PSScriptRoot\tools\scripts\start-dev.ps1" -Visible:$Visible
    }
    "restart" {
        Write-Host "Reiniciando ambiente SHM 2.3..." -ForegroundColor Cyan
        & "$PSScriptRoot\tools\scripts\stop-dev.ps1"
        Start-Sleep -Seconds 1
        & "$PSScriptRoot\tools\scripts\start-dev.ps1" -Visible:$Visible
    }
    "status" {
        $port8001 = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
        $port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
        $port8025 = Get-NetTCPConnection -LocalPort 8025 -State Listen -ErrorAction SilentlyContinue

        Write-Host "===================================================" -ForegroundColor Cyan
        Write-Host "           Status dos Servicos SHM 2.3             " -ForegroundColor Cyan
        Write-Host "===================================================" -ForegroundColor Cyan
        
        if ($port8001) {
            $pid8001 = $port8001[0].OwningProcess
            Write-Host " [ONLINE]  Backend Django  -> http://localhost:8001 (PID: $pid8001)" -ForegroundColor Green
            try {
                $statusRes = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/v1/status/" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($statusRes) {
                    Write-Host "           Health / Versao: $($statusRes.service) - $($statusRes.release)" -ForegroundColor DarkGreen
                }
            } catch {}
        } else {
            Write-Host " [OFFLINE] Backend Django  -> Porta 8001 livre" -ForegroundColor Red
        }

        if ($port5173) {
            $pid5173 = $port5173[0].OwningProcess
            Write-Host " [ONLINE]  Frontend Vite   -> http://localhost:5173 (PID: $pid5173)" -ForegroundColor Green
            
            $tailscaleIp = $env:TAILSCALE_IP
            if (-not $tailscaleIp -and (Test-Path "$PSScriptRoot\.env")) {
                $envLines = Get-Content "$PSScriptRoot\.env" -ErrorAction SilentlyContinue
                foreach ($line in $envLines) {
                    if ($line -match '^\s*TAILSCALE_IP\s*=\s*(.+)$') {
                        $tailscaleIp = $matches[1].Trim().Trim('"').Trim("'")
                        break
                    }
                }
            }
            if ($tailscaleIp) {
                Write-Host "           Tailscale IP    -> http://${tailscaleIp}:5173" -ForegroundColor Cyan
            }
        } else {
            Write-Host " [OFFLINE] Frontend Vite   -> Porta 5173 livre" -ForegroundColor Red
        }

        if ($port8025) {
            $pid8025 = $port8025[0].OwningProcess
            Write-Host " [ONLINE]  Mail Dev Server -> http://localhost:8025 (SMTP: 1025 / PID: $pid8025)" -ForegroundColor Green
        } else {
            Write-Host " [OFFLINE] Mail Dev Server -> Portas 1025/8025 livres" -ForegroundColor Yellow
        }

        $logDir = Join-Path $PSScriptRoot ".logs"
        if (Test-Path $logDir) {
            $bLog = Join-Path $logDir "backend.log"
            $fLog = Join-Path $logDir "frontend.log"
            $mLog = Join-Path $logDir "mail.log"
            Write-Host "---------------------------------------------------" -ForegroundColor Gray
            if (Test-Path $bLog) {
                $bItem = Get-Item $bLog
                $bKb = [math]::Round($bItem.Length / 1024, 1)
                Write-Host " Log Backend:  .logs\backend.log ($bKb KB)" -ForegroundColor Gray
            }
            if (Test-Path $fLog) {
                $fItem = Get-Item $fLog
                $fKb = [math]::Round($fItem.Length / 1024, 1)
                Write-Host " Log Frontend: .logs\frontend.log ($fKb KB)" -ForegroundColor Gray
            }
            if (Test-Path $mLog) {
                $mItem = Get-Item $mLog
                $mKb = [math]::Round($mItem.Length / 1024, 1)
                Write-Host " Log Mail Dev: .logs\mail.log ($mKb KB)" -ForegroundColor Gray
            }
        }

        Write-Host "===================================================" -ForegroundColor Cyan
    }
    "logs" {
        $logDir = Join-Path $PSScriptRoot ".logs"
        $file = if ($Target -like "*front*") { 
            Join-Path $logDir "frontend.log" 
        } elseif ($Target -like "*mail*") { 
            Join-Path $logDir "mail.log" 
        } else { 
            Join-Path $logDir "backend.log" 
        }
        if (Test-Path $file) {
            Write-Host "Exibindo ultimas linhas de $file (Ctrl+C para sair)..." -ForegroundColor Cyan
            Get-Content -Path $file -Tail 30 -Wait
        } else {
            Write-Host "Nenhum arquivo de log encontrado em $file." -ForegroundColor Yellow
        }
    }
    "sync" {
        & "$PSScriptRoot\tools\scripts\sync-local.ps1" -Action sync
    }
    "diff" {
        & "$PSScriptRoot\tools\scripts\sync-local.ps1" -Action diff -TargetItem $Target -VsCode:$VsCode
    }
    "backups" {
        & "$PSScriptRoot\tools\scripts\sync-local.ps1" -Action backups
    }
    "restore" {
        & "$PSScriptRoot\tools\scripts\sync-local.ps1" -Action restore -BackupId $Target
    }
    "backup-db" {
        $backupDir = Join-Path $PSScriptRoot "backend\backups"
        if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
        $ts = Get-Date -Format "yyyyMMdd_HHmmss"
        $srcDb = Join-Path $PSScriptRoot "backend\db.sqlite3"
        if (Test-Path $srcDb) {
            $destDb = Join-Path $backupDir "db_${ts}.sqlite3"
            Copy-Item -Path $srcDb -Destination $destDb -Force
            Write-Host "===================================================" -ForegroundColor Green
            Write-Host " [BACKUP] Base de dados SQLite salva com sucesso!" -ForegroundColor Green
            Write-Host " Arquivo: $destDb" -ForegroundColor DarkCyan
            Write-Host "===================================================" -ForegroundColor Green
        } else {
            Write-Host "Arquivo de banco nao encontrado em $srcDb." -ForegroundColor Yellow
        }
    }
}

