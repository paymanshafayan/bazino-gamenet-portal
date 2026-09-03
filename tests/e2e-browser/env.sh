#!/usr/bin/env bash
# Bazino Browser-Test environment
# Sourcing this file extracts Chromium (+ shared libs) from
# @sparticuz/chromium into /tmp and exports the env Playwright needs.
# NOTE: /tmp and node_modules are NOT persisted between sessions; re-run
# `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci` then `source ./env.sh`.
set -a
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CHROMIUM_EXECUTABLE_PATH="$(node "$DIR/bootstrap.cjs" --browser)"
export LD_LIBRARY_PATH="/tmp/al2023/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export FONTCONFIG_PATH="${FONTCONFIG_PATH:-/tmp/fonts}"
export HOME="${HOME:-/tmp}"
set +a
echo "browser-test ready: CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_EXECUTABLE_PATH"
