SOHEL CHICKEN CENTRE - START/STOP (WINDOWS)
============================================

The Windows equivalent of mac-launcher/ in this same repo, for the PC now acting
as production while the Mac Mini is repaired.

  Start SCC.bat   double-click to back up the database, then start both apps.
                  A browser tab opens automatically once the frontend is ready.
  Stop SCC.bat    double-click to stop both apps.

Every time you start, it:
  1. Runs the backend's own backup script (scc-backend-upgraded's
     scripts\backup-database.ps1) and waits for it to finish and verify itself.
  2. Starts the backend as ENV=prod - always the real database, never a guess.
  3. Starts the frontend from its production build (`serve -s build`), not the
     dev server.

Running Start SCC.bat again while both are already up is harmless - it notices
each is already listening on its port and leaves it alone rather than starting
a second copy that would fight the first for it.

The paths inside Start-SCC.ps1 already match where the two projects live on
this PC:
  Backend:  C:\Users\mulan\Downloads\scc-backend-upgraded\scc-backend-upgraded
  Frontend: C:\Users\mulan\Downloads\users-management-system-java-react\
            users-management-system-java-react\frontend

If either project ever moves, open Start-SCC.ps1 in Notepad and update the two
folder lines near the top.


THE FRONTEND SERVES WHATEVER WAS LAST BUILT
---------------------------------------------
`serve -s build` serves a snapshot, not a live view of the source. After
pulling backend or frontend changes:

  Backend:  nothing extra needed - `mvnw spring-boot:run` (what Start SCC.bat
            uses) recompiles automatically.
  Frontend: run `npm run build` in the frontend folder, then Stop SCC.bat and
            Start SCC.bat again (or just relaunch the frontend - `serve` reads
            the build folder fresh each time it starts).


LOGS AND BACKUPS
------------------
  %LOCALAPPDATA%\SCC-Launcher\backend.log    backend console output
  %LOCALAPPDATA%\SCC-Launcher\frontend.log   frontend console output
  %LOCALAPPDATA%\SCC-Launcher\backup.log     the backup script's own log
  scc-backend-upgraded\backups\              the .sql/.zip files themselves,
                                              one per start, 30 days kept

A backup taken only when someone happens to start the apps still leaves gaps on
a day nothing crashes and nobody restarts anything. Worth adding a real Task
Scheduler entry too - see the -NOTES section of backup-database.ps1 for the
exact command - so a backup happens daily regardless of the launcher.


IF DOUBLE-CLICKING SHOWS A SECURITY WARNING
----------------------------------------------
Windows sometimes blocks a script copied from elsewhere ("Windows protected
your PC"). Right-click Start-SCC.ps1 and Stop-SCC.ps1 -> Properties -> tick
"Unblock" -> OK. The .bat files call PowerShell with -ExecutionPolicy Bypass
already, so no system-wide policy change is needed.


FOR OTHER DEVICES ON THE SAME WIFI TO USE THE APP
----------------------------------------------------
Already working: the backend's .env has FRONTEND_URL set to both
http://localhost:3000 and this PC's LAN address. On a phone or another
computer on the same wifi, open http://<this PC's LAN address>:3000.

Find the address again any time with, in PowerShell:
  (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi').IPAddress

If that address ever changes (most home/office routers can do this after a
power cut), update FRONTEND_URL in scc-backend-upgraded\.env and restart the
backend (Stop SCC.bat, then Start SCC.bat).


WHEN THE MAC MINI IS BACK
----------------------------
This PC was stood up as a temporary production machine while the Mac Mini was
being repaired. See scc-backend-upgraded\docs\mac-migration.md for how the
database was restored here, and keep in mind the two machines' databases will
have diverged since - moving back means deciding which one is the source of
truth for the days in between, not just switching the launcher off.
