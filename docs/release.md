# Release

The current development release is **v0.5.0**, Linux-only. Older Windows release notes are historical
records and are indexed in [`version-history.md`](version-history.md); do not use their install steps
for the current package.

The release artifact is an `.spmod` containing the Kotlin plugin, Linux web resources, the native
Qt host, and license notices.

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

```sh
cd spw-folia
GRADLE_USER_HOME=/tmp/spw-gradle-home bash ./gradlew plugin

cd ..
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build

cd poc/settings-ui
pnpm install --frozen-lockfile
pnpm build

cd ../..
bash packaging/build-package.sh
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging --out dist/release \
  --name spw-folia-0.5.0-linux-x86_64.spmod
```

`build-package.sh` compiles the host, stages the full web bundle, checks the executable as an
x86_64 ELF, verifies executable permissions, and writes checksums. `assemble-release.py` rejects a
missing web entry, native binary, license, or plugin manifest field.

The settings and Folia web builds require `work/folia/folia-major-main`. Its production `dist/` is
staged directly into the release tree; Kotlin and native builds can be verified independently when
that checkout is unavailable.
