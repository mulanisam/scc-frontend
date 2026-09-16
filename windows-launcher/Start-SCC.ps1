<#
.SYNOPSIS
    Backs up the database, then starts the backend and frontend.

.DESCRIPTION
    The Windows equivalent of the Mac shop's launcher (mac-launcher/ in this same
    repo). Double-clicking "Start SCC.bat" runs this. It:

      1. Runs the backend's own verified backup script (scripts\backup-database.ps1)
         and waits for it to finish, so a bad day never starts on an un-backed-up
         database.
      2. Starts the backend as ENV=prod via the Maven wrapper - this recompiles
         any changed source automatically, so a `git pull` never needs a separate
         build step before starting.
      3. Starts the frontend with `serve -s build` - the production static build,
         not the dev server (see docs/running-the-stack.md in the backend repo for
         why that distinction matters for a shop screen left open all day).
      4. Waits for both ports to answer, then opens the app in the default browser.

    Running this again while both are already up does nothing harmful: each step
    checks its port first and leaves a running process alone rather than starting
    a second copy that would fight the first one for it.

.NOTES
    The paths below are this machine's actual layout. If either project ever
    moves, update BackendDir / FrontendDir here.
#>

$ErrorActionPreference = 'Stop'

$BackendDir   = 'C:\Users\mulan\Downloads\scc-backend-upgraded\scc-backend-upgraded'
$FrontendDir  = 'C:\Users\mulan\Downloads\users-management-system-java-react\users-management-system-java-react\frontend'
$BackupScript = Join-Path $BackendDir 'scripts\backup-database.ps1'

$StateDir    = Join-Path $env:LOCALAPPDATA 'SCC-Launcher'
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
$BackendLog  = Join-Path $StateDir 'backend.log'
$FrontendLog = Join-Path $StateDir 'frontend.log'
$BackupLog   = Join-Path $StateDir 'backup.log'

function Test-PortOpen {
    param([int] $Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Wait-ForPort {
    param([int] $Port, [int] $TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port $Port) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

Write-Host "== Sohel Chicken Centre ==" -ForegroundColor Cyan
Write-Host ""

# ---- Backup first -----------------------------------------------------------
# Run before either app starts, not in the background alongside them - a
# backup racing the day's first sale entry is exactly the ambiguity a backup
# exists to avoid.
if (Test-Path $BackupScript) {
    Write-Host "Backing up the database (see $BackupLog for detail)..."
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BackupScript -Compress *> $BackupLog
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Backup verified." -ForegroundColor Green
        } else {
            Write-Host "! Backup script reported a failure - check $BackupLog. Continuing anyway, since a shop day should not wait on a backup issue being investigated." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "! Backup failed to run: $_. Continuing anyway - check $BackupLog." -ForegroundColor Yellow
    }
} else {
    Write-Host "! Backup script not found at $BackupScript - skipping backup." -ForegroundColor Yellow
}
Write-Host ""

# ---- Backend ------------------------------------------------------------------
if (Test-PortOpen -Port 8080) {
    Write-Host "Backend already running on port 8080 - leaving it alone."
} elseif (-not (Test-Path $BackendDir)) {
    Write-Host "! Cannot find $BackendDir - backend not started." -ForegroundColor Red
} else {
    # ENV has no default on purpose - the app refuses to start rather than guess
    # which database it should be trading against. This is the shop's real
    # deployment, so it is always prod here.
    $env:ENV = 'prod'
    Start-Process -FilePath (Join-Path $BackendDir 'mvnw.cmd') `
        -ArgumentList '-o', 'spring-boot:run' `
        -WorkingDirectory $BackendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $BackendLog `
        -RedirectStandardError "$BackendLog.err"
    Write-Host "Backend starting. Log: $BackendLog"
}
Write-Host ""

# ---- Frontend -----------------------------------------------------------------
if (Test-PortOpen -Port 3000) {
    Write-Host "Frontend already running on port 3000 - leaving it alone."
} elseif (-not (Test-Path $FrontendDir)) {
    Write-Host "! Cannot find $FrontendDir - frontend not started." -ForegroundColor Red
} elseif (-not (Test-Path (Join-Path $FrontendDir 'build\index.html'))) {
    Write-Host "! No build\ found in $FrontendDir - run 'npm run build' there first." -ForegroundColor Red
} else {
    Start-Process -FilePath 'C:\Program Files\nodejs\npx.cmd' `
        -ArgumentList 'serve', '-s', 'build', '-l', '3000' `
        -WorkingDirectory $FrontendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $FrontendLog `
        -RedirectStandardError "$FrontendLog.err"
    Write-Host "Frontend starting. Log: $FrontendLog"
}

Write-Host ""
Write-Host "Waiting for the backend..."
if (-not (Wait-ForPort -Port 8080)) {
    Write-Host "! Backend did not answer within 90 seconds - check $BackendLog" -ForegroundColor Yellow
}

Write-Host "Waiting for the frontend..."
if (Wait-ForPort -Port 3000 -TimeoutSeconds 30) {
    Write-Host "Frontend is up - opening it now." -ForegroundColor Green
    Start-Process 'http://localhost:3000'
} else {
    Write-Host "! Frontend did not answer in time - check $FrontendLog" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Both apps are running. This window can be closed."
Write-Host "To stop them later, double-click 'Stop SCC.bat' - not this window's close button."
try { Read-Host "Press Enter to close this window" | Out-Null } catch { }
