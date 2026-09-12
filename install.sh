#!/usr/bin/env bash
set -e

REPO="gabrielrufino/mdvertex"
INSTALL_DIR="${MDVERTEX_INSTALL_DIR:-$HOME/.local/share/mdvertex}"
BIN_DIR="${MDVERTEX_BIN_DIR:-$HOME/.local/bin}"
TARGET_FILE="$INSTALL_DIR/mdvertex"
BIN_FILE="$BIN_DIR/mdvertex"

echo "📐 Installing / Updating mdvertex..."

# Check Node.js prerequisite
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js is required to run mdvertex, but it was not found." >&2
  echo "Please install Node.js (v18 or higher) and try again: https://nodejs.org/" >&2
  exit 1
fi

NODE_VERSION=$(node --version | grep -oE '^v[0-9]+' | sed 's/^v//')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js v18 or higher is required. Found v$(node --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')." >&2
  echo "Please update Node.js and try again: https://nodejs.org/" >&2
  exit 1
fi

# Ensure target directories exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/mdvertex"

echo "⬇️  Downloading mdvertex from ${DOWNLOAD_URL}..."
if ! curl -fsSL -o "${TARGET_FILE}.tmp" "$DOWNLOAD_URL"; then
  echo "❌ Error: Failed to download mdvertex from ${DOWNLOAD_URL}." >&2
  echo "Please verify your internet connection or check if a release is available at https://github.com/${REPO}/releases." >&2
  rm -f "${TARGET_FILE}.tmp"
  exit 1
fi

mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
chmod +x "$TARGET_FILE"
ln -sf "$TARGET_FILE" "$BIN_FILE"

echo "✅ mdvertex was installed/updated successfully!"

# Check if BIN_DIR is in PATH
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo ""
    echo "⚠️  Warning: ${BIN_DIR} is not in your \$PATH."
    echo "Add the following line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo ""
    echo "  export PATH=\"\$PATH:${BIN_DIR}\""
    echo ""
    ;;
esac
