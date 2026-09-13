#!/bin/bash
#
# Double-click to stop both apps.

BACKEND_JAR="backend-0.0.1-SNAPSHOT.jar"
STATE_DIR="$HOME/.scc-launcher"

# Stops the pid Start recorded, and also anything matching the command line -
# the second part is the safety net. `npm start` runs its real dev server as
# a child process underneath `npm` itself, and killing only the parent's pid
# has been known to leave that child running and holding the port, on some
# npm versions. Matching the command line finds it regardless of which
# process is holding which pid.
stop() {
  local name="$1" pidfile="$2" pattern="$3"
  local found=0

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    kill "$(cat "$pidfile")" 2>/dev/null
    found=1
  fi
  if pkill -f "$pattern" 2>/dev/null; then
    found=1
  fi

  if [ "$found" = 1 ]; then
    echo "$name: stopped"
  else
    echo "$name: was not running"
  fi
  rm -f "$pidfile"
}

echo "== Sohel Chicken Centre - stopping =="
echo
stop "Backend"  "$STATE_DIR/backend.pid"  "$BACKEND_JAR"
stop "Frontend" "$STATE_DIR/frontend.pid" "react-scripts start"

echo
read -p "Done. Press Enter to close this window... "
