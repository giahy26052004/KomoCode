#!/bin/sh
# KomoCode install script
# Usage: curl -fsSL https://raw.githubusercontent.com/giahy26052004/KomoCode/main/install.sh | sh

set -e

GITHUB_REPO="${KOMOCODE_REPO:-giahy26052004/KomoCode}"
VERSION="${KOMOCODE_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# ── Detect OS ──────────────────────────────────────────────────────────────────
OS=$(uname -s)
case "$OS" in
  Linux)  OS="linux"  ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS. Download manually from:"
    echo "  https://github.com/$GITHUB_REPO/releases"
    exit 1
    ;;
esac

# ── Detect arch ────────────────────────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) ARCH="x64"   ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# ── Resolve download URL ───────────────────────────────────────────────────────
BINARY="komocode-${OS}-${ARCH}"

if [ "$VERSION" = "latest" ]; then
  DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/latest/download/$BINARY"
else
  DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$VERSION/$BINARY"
fi

echo ""
echo "  Installing KomoCode..."
echo "  OS: $OS / Arch: $ARCH"
echo "  From: $DOWNLOAD_URL"
echo ""

# ── Download ───────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/komocode"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$DOWNLOAD_URL" -O "$INSTALL_DIR/komocode"
else
  echo "Error: curl or wget is required."
  exit 1
fi

chmod +x "$INSTALL_DIR/komocode"

# ── PATH check ─────────────────────────────────────────────────────────────────
if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
  echo "  Add to your shell profile (~/.bashrc or ~/.zshrc):"
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo "  Done! Run: komocode"
echo ""
