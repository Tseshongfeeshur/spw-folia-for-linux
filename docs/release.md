# Release

The current development release is **v0.5.0**, Linux-only. Older Windows release notes are historical
records and are indexed in [`version-history.md`](version-history.md); do not use their install steps
for the current package.

The release artifact is an `.spmod` containing the Kotlin plugin, Linux web resources, the native
Qt host, and license notices.

The plugin manifest declares `Plugin-Has-Config: true` and the permissions `library-read`,
`key-bindings`, and `class-transform`. `class-transform` is used only by the public Workshop
`HookRegistrar` adapter for the SPW 1.19.3 More-menu entry; the configuration-page button and
shortcut remain available without it.

The plugin classes include `preference_config.json`; this is what makes the SPW plugin-page
“配置” action available and supplies its “打开 / 显示 Folia” button.

```text
web/
  index.html
  assets/                 complete Folia lazy-chunk graph
  settings/settings-ui.js
  _host/shim.js
  _host/preview-shim.js
native/
  spw-folia-host          x86_64 ELF, executable
licenses/
  AGPL-3.0.txt
  NOTICE.md
  THIRD-PARTY.md
  SOURCE-OFFER.md
```

## Build

The Workshop Gradle task produces an **intermediate Kotlin-only archive**. It is not the file to
install: it does not contain `native/spw-folia-host` or `web/`. Always run the complete assembly
below for a user-facing `.spmod`.

```sh
# 1. Build the settings UI first. The Gradle staging task consumes poc/settings-ui/dist.
pnpm --dir poc/settings-ui install --frozen-lockfile
pnpm --dir poc/settings-ui build

# 2. Build the Kotlin/PF4J plugin archive.
cd spw-folia
bash ./gradlew plugin
cd ..

# 3. Build the Qt6/Wayland/PipeWire host and stage the complete payload.
bash packaging/build-package.sh

# 4. Merge everything into the installable Linux x86_64 package.
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging --out dist/release \
  --name spw-folia-for-linux-0.5.0-linux-x86_64.spmod
```

`build-package.sh` compiles the host, stages the full web bundle, checks the executable as an
x86_64 ELF, verifies executable permissions, and writes checksums. `assemble-release.py` rejects a
missing web entry, native binary, license, or plugin manifest field.

The resulting installable file is
`dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod`. Verify it before distribution:

```sh
unzip -t dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod
python3 - <<'PY'
import zipfile

path = "dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod"
required = {
    "classes/META-INF/MANIFEST.MF",
    "classes/preference_config.json",
    "web/index.html",
    "web/settings/settings-ui.js",
    "native/spw-folia-host",
    "licenses/AGPL-3.0.txt",
}
with zipfile.ZipFile(path) as archive:
    missing = sorted(required - set(archive.namelist()))
    native = archive.read("native/spw-folia-host")
    if missing or native[:4] != b"\x7fELF" or native[4] != 2 or int.from_bytes(native[18:20], "little") != 0x3e:
        raise SystemExit(f"invalid package: missing={missing}")
    print(f"valid package: {len(archive.namelist())} entries")
PY
```

The settings and Folia web builds require `work/folia/folia-major-main`. Its production `dist/` is
staged directly into the release tree. The standalone host command remains useful for development,
but it is already run by `packaging/build-package.sh`; running only Gradle or only CMake does not
produce a complete installable plugin.
