#!/bin/bash
#
# Double-click to start both apps. A Terminal window opens to show progress -
# it is safe to close once you see "Both apps are running" below; they keep
# running in the background either way (that is what `nohup` is for).
#
# Double-clicking this again while both apps are already running does nothing
# harmful - it notices and says so, rather than starting a second copy that
# would fight the first one over the same port.

FRONTEND_DIR="/Users/sohelchickencentre/SOHEL/scc-frontend"
BACKEND_DIR="/Users/sohelchickencentre/SOHEL/backend"
BACKEND_JAR="backend-0.0.1-SNAPSHOT.jar"
BACKUP_SCRIPT="$HOME/scripts/backup_mysql.sh"

# Where this launcher remembers what it started, so Stop can find it again and
# a second Start knows not to duplicate it. Not inside either app's folder, so
# copying a fresh build never wipes it out from under a running process.
STATE_DIR="$HOME/.scc-launcher"
mkdir -p "$STATE_DIR"

is_running() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

echo "== Sohel Chicken Centre =="
echo

# ---- Backend ------------------------------------------------------------
if is_running "$STATE_DIR/backend.pid"; then
  echo "Backend already running (pid $(cat "$STATE_DIR/backend.pid")) - leaving it alone."
elif [ ! -d "$BACKEND_DIR" ]; then
  echo "! Cannot find $BACKEND_DIR - backend not started."
else
  # cd to the project root, not wherever the jar happens to sit, and stay there
  # for the java invocation below. .env is read via a path relative to the
  # process's working directory (spring.config.import=optional:file:./.env),
  # and it lives next to pom.xml - not inside target/. Running from inside
  # target/ finds a jar just fine and silently loads no .env at all, which
  # looks like the app started but reaches no real database and no messaging.
  cd "$BACKEND_DIR" || exit 1

  # The jar sits directly here if it was copied there by hand (the original
  # workflow); a plain git clone + `mvn package` instead leaves it in target/.
  # Resolved once, from the project root, so .env is found either way.
  JAR_PATH="$BACKEND_JAR"
  if [ ! -f "$JAR_PATH" ] && [ -f "target/$BACKEND_JAR" ]; then
    JAR_PATH="target/$BACKEND_JAR"
  fi

  if [ ! -f "$JAR_PATH" ]; then
    echo "! No jar found at $BACKEND_DIR/$BACKEND_JAR or target/$BACKEND_JAR - build it first (mvnw package)."
  else
    # ENV has no default on purpose - the app refuses to start rather than
    # guess which database it should be trading against. This is the shop's
    # real deployment, so it is always prod here.
    ENV=prod nohup java -jar "$JAR_PATH" > "$STATE_DIR/backend.log" 2>&1 &
    echo $! > "$STATE_DIR/backend.pid"
    echo "Backend starting (pid $!). If anything goes wrong, the reason is in:"
    echo "  $STATE_DIR/backend.log"
  fi
fi

# ---- Frontend -------------------------------------------------------------
if is_running "$STATE_DIR/frontend.pid"; then
  echo "Frontend already running (pid $(cat "$STATE_DIR/frontend.pid")) - leaving it alone."
elif [ ! -d "$FRONTEND_DIR" ]; then
  echo "! Cannot find $FRONTEND_DIR - frontend not started."
else
  cd "$FRONTEND_DIR" || exit 1
  nohup npm start > "$STATE_DIR/frontend.log" 2>&1 &
  echo $! > "$STATE_DIR/frontend.pid"
  echo "Frontend starting (pid $!). Log:"
  echo "  $STATE_DIR/frontend.log"
fi

# ---- Backup ---------------------------------------------------------------
# Same behaviour as the old script: one backup each time the apps are
# started. Worth moving to a real daily schedule later (see README.txt) so a
# quiet day off does not mean a day with no backup.
if [ -f "$BACKUP_SCRIPT" ]; then
  bash "$BACKUP_SCRIPT" > "$STATE_DIR/backup.log" 2>&1 &
  echo "Backup running in the background. Log:"
  echo "  $STATE_DIR/backup.log"
fi

echo
echo "Waiting for the frontend to come up (usually 15-30 seconds)..."
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:3000"; then
    echo "Frontend is up - opening it now."
    open "http://localhost:3000"
    break
  fi
  sleep 2
done

echo
echo "Both apps are running. This window can be closed."
echo "To stop them later, double-click 'Stop SCC.command' - not this window's close button."
read -p "Press Enter to close this window... "
