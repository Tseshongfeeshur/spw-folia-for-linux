#!/usr/bin/env bash
# Assemble the shippable spw-folia package tree (the payload of the final .spmod).
#
#   packaging/
#     web/                  minimal Folia web subset + settings UI island   -> .spmod/web/
#     native/               x86_64 Qt/PipeWire spw-folia-host -> .spmod/native/
#     licenses/             AGPL + third-party notices -> .spmod/licenses/
#     SHA256SUMS.txt
#     size-report.json
#     web-stage-report.json
#
# Usage: bash packaging/build-package.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PKG="$ROOT/packaging"
HOST="$ROOT/poc/webview/host-linux/build"
DIST="$ROOT/work/folia/folia-major-main/dist"
FOLIA_LICENSE="$ROOT/work/folia/folia-major-main/LICENSE"

echo "== spw-folia package assembly =="
echo "root: $ROOT"

echo "-- building Linux host"
cmake -S "$ROOT/poc/webview/host-linux" -B "$HOST"
cmake --build "$HOST" --parallel

# ---------------------------------------------------------------- 1. web payload
echo "-- staging web subset (dependency-report driven, no service worker)"
node "$PKG/tools/stage-web.mjs" --dist "$DIST" --out "$PKG/web"

echo "-- overlaying optimized illustrations (palette PNG / q88 JPEG, see image-overrides/MANIFEST.md)"
node "$PKG/tools/apply-image-overrides.mjs" --web "$PKG/web"

# ---------------------------------------------------------------- 2. native helper
echo "-- staging native helper"
rm -rf "$PKG/native"
mkdir -p "$PKG/native"
cp "$HOST/spw-folia-host" "$PKG/native/"
chmod 755 "$PKG/native/spw-folia-host"
file "$PKG/native/spw-folia-host" | grep -Eq 'ELF 64-bit.*x86-64' || { echo "ERROR: native host is not x86_64 ELF" >&2; exit 1; }

# ---------------------------------------------------------------- 3. licenses
echo "-- staging licenses"
rm -rf "$PKG/licenses"
mkdir -p "$PKG/licenses"
cp "$PKG"/licenses-src/*.md "$PKG/licenses/"
for license in "$PKG"/licenses-src/*.txt; do
  [ -f "$license" ] && cp "$license" "$PKG/licenses/"
done
if [ -f "$FOLIA_LICENSE" ]; then
  cp "$FOLIA_LICENSE" "$PKG/licenses/AGPL-3.0.txt"
else
  echo "WARNING: Folia LICENSE not found at $FOLIA_LICENSE" >&2
fi

# ---------------------------------------------------------------- 4. sizes + checksums
echo "-- size report"
node "$PKG/tools/size-report.mjs"

echo "-- checksums"
rm -f "$PKG/SHA256SUMS.txt"
(
  cd "$PKG"
  find web native licenses -type f | sort | while IFS= read -r f; do
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$f"
    else
      # Fallback: PowerShell on systems without coreutils
      powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath '$f').Hash.ToLower() + '  $f'"
    fi
  done
) | sed 's/ \*/  /' > "$PKG/SHA256SUMS.txt"

echo
echo "== done =="
echo "package tree: $PKG"
du -sh "$PKG/web" "$PKG/native" "$PKG/licenses" 2>/dev/null || true
