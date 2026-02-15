#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${VESAI_REPO_URL:-https://github.com/north-brook/vesai.git}"
VESAI_HOME="${VESAI_HOME:-$HOME/.vesai}"
APP_DIR="$VESAI_HOME/app/vesai"
BIN_DIR="$HOME/.local/bin"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

echo "Installing VESAI local-first runtime..."
need_cmd git
need_cmd curl
need_cmd gcloud
need_cmd ffmpeg
need_cmd bun

mkdir -p "$VESAI_HOME/app"

if [ -d "$APP_DIR/.git" ]; then
  echo "Updating existing repo at $APP_DIR"
  git -C "$APP_DIR" fetch --depth 1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  echo "Cloning $REPO_URL to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

bun install
echo "Installing Playwright Chromium..."
bunx playwright install chromium

mkdir -p "$BIN_DIR"
ln -sf "$APP_DIR/bin/vesai" "$BIN_DIR/vesai"

echo ""
echo "VESAI installed at: $APP_DIR"
echo "Binary linked at: $BIN_DIR/vesai"

echo ""
echo "Before quickstart, ensure gcloud is authenticated:"
echo "  gcloud auth login"
echo "  gcloud auth application-default login"
echo "  gcloud config set project <project-id>"
echo ""

echo "Starting quickstart..."
"$BIN_DIR/vesai" quickstart
