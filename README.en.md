# spw-folia

Folia lyric visualizer for Salt Player on Linux.

## Target environment

- Linux `x86_64`
- Wayland with KDE Plasma
- Salt Player verified with JDK `25.0.4`
- System Qt 6, QtWebEngine, PipeWire, and a Plasma StatusNotifier-compatible tray

The Kotlin plugin runs inside Salt Player's JVM/PF4J process. The bundled Qt host owns the Folia
page, Wayland window, Plasma tray, JSON-lines bridge, PipeWire capture, and FFT analysis. Qt,
QtWebEngine, Wayland, Plasma, and PipeWire remain system dependencies and are not bundled.

## Features

- Folia production web bundle and settings island
- Playback state, track, cover, lyrics, and word-timing synchronization
- PipeWire sink-monitor capture, FFT spectrum, five bands, and pause breathing fallback
- Play/pause, previous, next, and seek controls
- Plasma tray entry and a public Salt Player shortcut entry
- Persisted settings, fonts, themes, and Folia style tuning

The Linux build does not support X11 fallback, transparent windows, mouse passthrough,
Windows/WebView2, WASAPI, queue/random/repeat controls, private Salt Player hooks, or reflective
player controls.

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
  --staging packaging --out dist/release
```

The settings and production page builds require the Folia source checkout at
`work/folia/folia-major-main`; its `dist/` is staged into the release package.

See [docs/linux-runtime.md](docs/linux-runtime.md), [docs/protocol.md](docs/protocol.md), and
[docs/release.md](docs/release.md) for runtime, protocol, and packaging details.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and
the notices included in the release package.
