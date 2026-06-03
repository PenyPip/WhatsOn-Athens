#!/bin/sh
set -e

ARCH=$(uname -m)
case "$ARCH" in
  x86_64 | amd64)
    BINDING_PKG="@swc/core-linux-x64-gnu"
    NPM_CPU=x64
    NODE_FILE="node_modules/@swc/core-linux-x64-gnu/swc.linux-x64-gnu.node"
    ;;
  aarch64 | arm64)
    BINDING_PKG="@swc/core-linux-arm64-gnu"
    NPM_CPU=arm64
    NODE_FILE="node_modules/@swc/core-linux-arm64-gnu/swc.linux-arm64-gnu.node"
    ;;
  *)
    echo "install-swc-native: unsupported arch: $ARCH" >&2
    exit 1
    ;;
esac

SWC_VER=$(node -p "require('@swc/core/package.json').version")
echo "install-swc-native: ${BINDING_PKG}@${SWC_VER} (arch=${ARCH})"

npm install "${BINDING_PKG}@${SWC_VER}" --no-save --force --os=linux --cpu="${NPM_CPU}"

if [ ! -f "$NODE_FILE" ]; then
  echo "install-swc-native: missing ${NODE_FILE}" >&2
  ls -la node_modules/@swc/ >&2 || true
  exit 1
fi

node -e "require('@swc/core'); console.log('install-swc-native: OK')"
