#!/usr/bin/env bash
# Install the built spw-folia .spmod into a Linux Salt Player workshop directory.
#
# Usage: SPW_WORKSHOP_PLUGINS=/path/to/workshop/plugins bash spw-folia/scripts/install-local.sh [--fresh]
#   --fresh    also delete workshop/data/dev.spw.folia (settings tree); default keeps it
set -euo pipefail

FRESH=0
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=1 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLUGINS="${SPW_WORKSHOP_PLUGINS:-$HOME/.local/share/Salt Player/workshop/plugins}"
APPDATA_DIR="$(dirname "$PLUGINS")"
PLUGIN_ID="dev.spw.folia"
PLUGIN_VERSION="${PLUGIN_VERSION:-0.5.0}"
DEST="$PLUGINS/${PLUGIN_ID}-${PLUGIN_VERSION}-LOCAL-ONLY"
SPMOD="$ROOT/spw-folia/build/libs/plugin-${PLUGIN_ID}-${PLUGIN_VERSION}.spmod"
BACKUP="$ROOT/spw-folia/notes/appdata-backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$SPMOD" ]; then
  echo "ERROR: $SPMOD not found (run: gradle plugin)" >&2
  exit 1
fi

mkdir -p "$BACKUP"
for f in enabled.txt permissions.json; do
  if [ -f "$PLUGINS/$f" ]; then cp -a "$PLUGINS/$f" "$BACKUP/$f"; fi
done
echo "backup: $BACKUP"

# drop previous installs of this plugin (id dir + workshop name dir + stray .spmod)
# so the host cannot load two copies of dev.spw.folia at once
shopt -s nullglob
for old in "$PLUGINS/${PLUGIN_ID}-"* "$PLUGINS/spw-folia-"*; do
  if [ "$old" = "$DEST" ]; then continue; fi
  rm -rf "$old"
  echo "removed stale: $old"
done
shopt -u nullglob

# fresh plugin dir (host scans dir plugins at startup)
rm -rf "$DEST"
if [ "$FRESH" = 1 ]; then
  rm -rf "$APPDATA_DIR/workshop/data/$PLUGIN_ID"
  echo "fresh: removed plugin settings data"
else
  echo "keeping plugin settings data (pass --fresh to reset)"
fi
mkdir -p "$DEST"
python - "$SPMOD" "$DEST" <<'PY'
import sys, zipfile
spmod, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(spmod) as z:
    z.extractall(dest)
print("extracted", spmod, "->", dest)
PY

# stage the native helper (host/) + Folia web bundle (web/) next to classes/ and lib/.
# These are produced by the syncDevAssets Gradle task, not part of the .spmod format.
ASSETS="$ROOT/spw-folia/build/plugin-root"
if [ -d "$ASSETS" ]; then
  cp -a "$ASSETS/." "$DEST/"
  echo "staged assets: $(ls "$ASSETS")"
else
  echo "WARN: $ASSETS missing (run: gradle plugin) — plugin will use dev-checkout fallback paths" >&2
fi

# enable (plain line list) + pre-grant declared permissions (reviewed+granted)
# key-bindings backs the public shortcut-manager action used to open or toggle Folia.
python - "$PLUGINS" "$PLUGIN_ID" <<'PY'
import json, sys
from pathlib import Path
plugins, plugin_id = Path(sys.argv[1]), sys.argv[2]
DECLARED = ["library-read", "key-bindings"]

enabled = plugins / "enabled.txt"
lines = [l.strip() for l in enabled.read_text(encoding="utf-8").splitlines() if l.strip()] if enabled.exists() else []
if plugin_id not in lines:
    lines.append(plugin_id)
# write bytes: host expects plain CRLF lines, text-mode writes would double the CR
enabled.write_bytes(("\r\n".join(lines) + "\r\n").encode("utf-8"))

permissions = plugins / "permissions.json"
data = json.loads(permissions.read_text(encoding="utf-8")) if permissions.exists() and permissions.stat().st_size else {}
entry = data.setdefault(plugin_id, {"reviewed": [], "granted": []})
for key in ("reviewed", "granted"):
    entry.setdefault(key, [])
    for perm in DECLARED:
        if perm not in entry[key]:
            entry[key].append(perm)
permissions.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(data, ensure_ascii=False))
PY

echo "installed $DEST"
ls "$DEST"
if [ -f "$DEST/classes/META-INF/MANIFEST.MF" ]; then
  echo "--- MANIFEST ---"
  head -25 "$DEST/classes/META-INF/MANIFEST.MF" | tr -d '\r'
fi
