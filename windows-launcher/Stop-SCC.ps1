<#
.SYNOPSIS
    Stops the backend and frontend started by Start-SCC.ps1.

.DESCRIPTION
    Finds processes by their actual command line rather than a remembered PID.
    Start-SCC.ps1 launches the backend through the Maven wrapper (mvnw.cmd), which
    is itself a wrapper around the real `java` process - killing only the pid
    Start-Process handed back stops the wrapper and leaves the java process
    (the one actually holding port 8080) running underneath it. Matching on
    command line finds the real process regardless of how many wrappers sit
    above it.
#>

$ErrorActionPreference = 'Stop'

function Stop-ByCommandLine {
    param([string] $Name, [string] $Pattern)

    $matches = Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='node.exe'" |
        Where-Object { $_.CommandLine -like $Pattern }

    if (-not $matches) {
        Write-Host "$Name`: was not running"
        return
    }

    foreach ($proc in $matches) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "$Name`: stopped ($($matches.Count) process(es))"
}

Write-Host "== Sohel Chicken Centre - stopping ==" -ForegroundColor Cyan
Write-Host ""

Stop-ByCommandLine -Name 'Backend'  -Pattern '*com.app.BackendApplication*'
Stop-ByCommandLine -Name 'Frontend' -Pattern '*serve*build*'

Write-Host ""
try { Read-Host "Done. Press Enter to close this window" | Out-Null } catch { }
