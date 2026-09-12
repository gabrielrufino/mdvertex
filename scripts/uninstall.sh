#!/usr/bin/env bash
set -e

INSTALL_DIR="${MDVERTEX_INSTALL_DIR:-$HOME/.local/share/mdvertex}"
BIN_DIR="${MDVERTEX_BIN_DIR:-$HOME/.local/bin}"
TARGET_FILE="$INSTALL_DIR/mdvertex"
BIN_FILE="$BIN_DIR/mdvertex"

echo "🗑️  Uninstalling mdvertex..."

REMOVED=0

if [ -f "$BIN_FILE" ] || [ -L "$BIN_FILE" ]; then
  rm -f "$BIN_FILE"
  echo "🗑️  Removed binary link: $BIN_FILE"
  REMOVED=1
fi

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo "🗑️  Removed install directory: $INSTALL_DIR"
  REMOVED=1
elif [ -f "$TARGET_FILE" ]; then
  rm -f "$TARGET_FILE"
  echo "🗑️  Removed binary: $TARGET_FILE"
  REMOVED=1
fi

if [ "$REMOVED" -eq 1 ]; then
  echo "✅ mdvertex was uninstalled successfully!"
else
  echo "ℹ️  mdvertex is not installed (no files found to remove)."
fi
