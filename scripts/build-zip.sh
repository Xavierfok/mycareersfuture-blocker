#!/usr/bin/env bash
# build a chrome web store / unpacked install zip containing only runtime files.
# output: dist/mycareersfuture-blocker-v<version>.zip

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
OUT_DIR="dist"
OUT_ZIP="${OUT_DIR}/mycareersfuture-blocker-v${VERSION}.zip"
STAGE_DIR="${OUT_DIR}/stage"

rm -rf "${OUT_DIR}"
mkdir -p "${STAGE_DIR}"

# runtime files only; no tests, no dev deps, no docs, no scripts
cp manifest.json "${STAGE_DIR}/"
cp background.js "${STAGE_DIR}/"
cp content.js "${STAGE_DIR}/"
cp hide-before-ready.css "${STAGE_DIR}/"
cp match.js "${STAGE_DIR}/"
cp storage.js "${STAGE_DIR}/"
cp selectors.js "${STAGE_DIR}/"
cp popup.html popup.css popup.js "${STAGE_DIR}/"
cp -R icons "${STAGE_DIR}/"

# strip any macOS metadata
find "${STAGE_DIR}" -name ".DS_Store" -delete

(cd "${STAGE_DIR}" && zip -r "../mycareersfuture-blocker-v${VERSION}.zip" . -x "*.DS_Store")

rm -rf "${STAGE_DIR}"

echo ""
echo "built: ${OUT_ZIP}"
ls -lh "${OUT_ZIP}"
