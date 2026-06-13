#!/usr/bin/env bash
# Rotate audit log for a given tool. Keeps last 90 days.
set -euo pipefail

TOOL="${1:-}"
if [[ -z "$TOOL" ]]; then
  echo "usage: rotate-audit.sh <tool>"
  echo "example: rotate-audit.sh trello"
  exit 2
fi

LOG_DIR="${LLODEV_PM_TASKS_LOG_DIR:-$HOME/.local/share/llodev/pm-tasks}/$TOOL"
LOG="$LOG_DIR/audit.log"
KEEP_DAYS="${KEEP_DAYS:-90}"

[[ ! -f "$LOG" ]] && { echo "(no log at $LOG, nothing to rotate)"; exit 0; }

CUTOFF=$(date -u -v -"${KEEP_DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "${KEEP_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)
TMP="$(mktemp)"

awk -v cutoff="$CUTOFF" 'match($0, /"ts":"([^"]+)"/, m) { if (m[1] >= cutoff) print }' "$LOG" > "$TMP"

mv "$TMP" "$LOG"
echo "rotated $LOG (kept entries >= $CUTOFF)"
