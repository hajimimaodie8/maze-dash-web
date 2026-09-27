#!/usr/bin/env bash
# 冲撞迷阵 Maze Dash - web port launcher (macOS / Linux)
set -e
cd "$(dirname "$0")"
PORT="${1:-8099}"

URL="http://localhost:${PORT}/"

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 || true
  fi
}

if command -v node >/dev/null 2>&1; then
  echo "Starting the bundled server on port ${PORT} ..."
  open_browser
  exec node serve.js "$PORT"
fi

if command -v python3 >/dev/null 2>&1; then
  echo "Node.js not found - falling back to Python's built-in server."
  echo "(Audio retry behaviour is slightly reduced with this fallback.)"
  open_browser
  exec python3 -m http.server "$PORT"
fi

echo
echo "  Node.js or Python 3 is required to serve this game."
echo "  Browsers block the XHR asset requests the game makes from file:// URLs."
echo "  Install Node.js from https://nodejs.org and run this script again."
echo
exit 1
