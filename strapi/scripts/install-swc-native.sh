#!/bin/sh
set -e

SWC_VER=$(node -p "require('@swc/core/package.json').version")
ARCH=$(uname -m)

case "$ARCH" in
  x86_64 | amd64)
    PKG="@swc/core-linux-x64-gnu@${SWC_VER}"
    ;;
  aarch64 | arm64)
    PKG="@swc/core-linux-arm64-gnu@${SWC_VER}"
    ;;
  *)
    echo "install-swc-native: unsupported arch: $ARCH" >&2
    exit 1
    ;;
esac

echo "install-swc-native: ${PKG}"
npm install "${PKG}" --no-save --include=optional --force
node -e "require('@swc/core'); console.log('install-swc-native: @swc/core OK')"
