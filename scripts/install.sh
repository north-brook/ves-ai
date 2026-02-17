#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${VESAI_REPO_URL:-https://github.com/north-brook/ves-ai.git}"
VESAI_HOME="${VESAI_HOME:-$HOME/.vesai}"
APP_DIR="$VESAI_HOME/app/vesai"
BIN_DIR="$HOME/.local/bin"
IS_TTY=0
IS_UTF8=0
STEP_LOG="$(mktemp -t vesai-install.XXXXXX)"
trap 'rm -f "$STEP_LOG"' EXIT

if [ -t 1 ]; then
  IS_TTY=1
fi

if [ "$IS_TTY" -eq 1 ]; then
  COLOR_RESET=$'\033[0m'
  COLOR_BOLD=$'\033[1m'
  COLOR_CYAN=$'\033[36m'
  COLOR_GREEN=$'\033[32m'
  COLOR_RED=$'\033[31m'
else
  COLOR_RESET=""
  COLOR_BOLD=""
  COLOR_CYAN=""
  COLOR_GREEN=""
  COLOR_RED=""
fi

if printf "%s" "${LC_ALL:-${LANG:-}}" | grep -qi "utf-8"; then
  IS_UTF8=1
  SYMBOL_OK="✔"
  SYMBOL_FAIL="✖"
  SYMBOL_ARROW="→"
else
  SYMBOL_OK="[ok]"
  SYMBOL_FAIL="[x]"
  SYMBOL_ARROW="->"
fi

fail() {
  echo "${COLOR_RED}${SYMBOL_FAIL}${COLOR_RESET} $1" >&2
  exit 1
}

require_command() {
  local binary="$1"
  local message="$2"
  if ! command -v "$binary" >/dev/null 2>&1; then
    fail "$message"
  fi
}

run_step() {
  local label="$1"
  shift
  : >"$STEP_LOG"

  if [ "$IS_TTY" -eq 1 ]; then
    local pid
    local frame
    local frame_index=0
    local frame_count=4
    "$@" >"$STEP_LOG" 2>&1 &
    pid=$!

    if [ "$IS_UTF8" -eq 1 ]; then
      frame_count=10
    fi

    while kill -0 "$pid" 2>/dev/null; do
      if [ "$IS_UTF8" -eq 1 ]; then
        case "$frame_index" in
          0) frame='⠋' ;; 1) frame='⠙' ;; 2) frame='⠹' ;; 3) frame='⠸' ;;
          4) frame='⠼' ;; 5) frame='⠴' ;; 6) frame='⠦' ;; 7) frame='⠧' ;;
          8) frame='⠇' ;; *) frame='⠏' ;;
        esac
      else
        case "$frame_index" in
          0) frame='|' ;; 1) frame='/' ;; 2) frame='-' ;; *) frame='\' ;;
        esac
      fi
      printf "\r%s%s%s %s\033[K" "$COLOR_CYAN" "$frame" "$COLOR_RESET" "$label"
      frame_index=$(((frame_index + 1) % frame_count))
      sleep 0.09
    done

    if wait "$pid"; then
      printf "\r%s%s%s %s\033[K\n" "$COLOR_GREEN" "$SYMBOL_OK" "$COLOR_RESET" "$label"
      return 0
    fi

    printf "\r%s%s%s %s\033[K\n" "$COLOR_RED" "$SYMBOL_FAIL" "$COLOR_RESET" "$label" >&2
    cat "$STEP_LOG" >&2
    return 1
  fi

  if "$@" >"$STEP_LOG" 2>&1; then
    echo "${SYMBOL_OK} $label"
    return 0
  fi

  echo "${SYMBOL_FAIL} $label" >&2
  cat "$STEP_LOG" >&2
  return 1
}

sync_repo() {
  mkdir -p "$VESAI_HOME/app"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" remote set-url origin "$REPO_URL"
    git -C "$APP_DIR" pull --ff-only --quiet
  else
    git clone --quiet "$REPO_URL" "$APP_DIR"
  fi
}

install_deps() {
  cd "$APP_DIR"
  bun install --silent
}

install_playwright() {
  cd "$APP_DIR"
  bunx playwright install chromium
}

link_binary() {
  mkdir -p "$BIN_DIR"
  ln -sf "$APP_DIR/bin/vesai" "$BIN_DIR/vesai"
}

# ─── Preflight ────────────────────────────────────────────────────────────────

require_command "git" "git is required."
require_command "bun" "bun is required (https://bun.sh)."
require_command "gcloud" "gcloud is required (https://cloud.google.com/sdk/docs/install)."
require_command "ffmpeg" "ffmpeg is required (brew install ffmpeg)."

# ─── Install ──────────────────────────────────────────────────────────────────

run_step "Syncing VESAI" sync_repo
run_step "Installing dependencies" install_deps
run_step "Installing Playwright Chromium" install_playwright
run_step "Linking binary" link_binary

# ─── Done ─────────────────────────────────────────────────────────────────────

if [ "$IS_TTY" -eq 1 ]; then
  echo ""
fi

echo "${COLOR_GREEN}${SYMBOL_OK}${COLOR_RESET} VESAI is installed."
echo "${COLOR_CYAN}${SYMBOL_ARROW}${COLOR_RESET} Next: run ${COLOR_BOLD}${COLOR_CYAN}vesai quickstart${COLOR_RESET}"
