#!/bin/bash
set -u

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
ROOT="/Users/alichafai/Downloads/iwc-store"
PROCESSOR="$ROOT/services/product-processor"
LOG="$PROCESSOR/logs/keep-alive.log"
mkdir -p "$PROCESSOR/logs"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

is_healthy() {
  curl -sf --max-time 3 http://127.0.0.1:8788/health >/dev/null
}

log "watchdog started pid=$$"
while true; do
  if is_healthy; then
    sleep 20
    continue
  fi

  log "processor down; starting"
  cd "$PROCESSOR" || exit 1
  PORT=8788 /opt/homebrew/bin/npm run dev >> "$LOG" 2>&1
  log "processor exited code=$?"
  sleep 2
done
