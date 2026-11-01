# Linux host

`spw-folia-host` is a Qt 6 / QtWebEngine helper for Linux Wayland sessions. It requires Qt 6
WebEngine, KDE Frameworks 6 `KStatusNotifierItem`, PipeWire (`libpipewire-0.3`), and a Plasma
StatusNotifier host. The plugin sets `QT_QPA_PLATFORM=wayland`; X11 fallback is intentionally
unsupported.

Build with:

```sh
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build
```

This standalone command only builds the native helper. To produce the complete installable plugin,
build the settings UI and Kotlin archive first, then run the repository packaging flow from the
repository root:

```sh
pnpm --dir poc/settings-ui install --frozen-lockfile
pnpm --dir poc/settings-ui build
(cd spw-folia && bash ./gradlew plugin)
bash packaging/build-package.sh
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging --out dist/release \
  --name spw-folia-for-linux-0.5.0-linux-x86_64.spmod
```

The final `.spmod` must contain `native/spw-folia-host` next to the Kotlin `classes/` and `web/`
payload. Installing the intermediate Gradle archive alone produces a plugin without the native
host and results in “Folia Linux host is unavailable”.

The process expects `--bundle <web-directory>`, sets no display fallback itself, and should be
started with `QT_QPA_PLATFORM=wayland`. It registers a KDE StatusNotifier item before the Folia window and
accepts protocol-v1 JSON-lines on stdin. The host uses PipeWire's sink-monitor stream, 2048-point
FFT analysis, and sends page audio directly through the injected console bridge.

The page is loaded as `index.html?obs=1&splash=0`, Folia's public browser-source surface. This
keeps the helper on the lyric visualizer only; it does not depend on Folia's home/library routes.
