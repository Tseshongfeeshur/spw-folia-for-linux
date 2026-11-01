# spw-folia-for-linux

Folia lyric visualizer for Salt Player on Linux.

Project page: [spw-folia-for-linux GitHub Pages](https://tseshongfeeshur.github.io/spw-folia-for-linux/).

## Target environment

- Linux `x86_64`
- Wayland with KDE Plasma
- Salt Player verified with JDK `25.0.4`
- System Qt 6, QtWebEngine, PipeWire, KDE Frameworks 6 `KStatusNotifierItem`, and a Plasma StatusNotifier-compatible tray

The Kotlin plugin runs inside Salt Player's JVM/PF4J process. The bundled Qt host owns the Folia
page, Wayland window, Plasma tray, JSON-lines bridge, PipeWire capture, and FFT analysis. Qt,
QtWebEngine, Wayland, Plasma, and PipeWire remain system dependencies and are not bundled.

## Features

- Folia production web bundle and settings island
- Playback state, track, cover, lyrics, and word-timing synchronization
- PipeWire sink-monitor capture, FFT spectrum, five bands, and pause breathing fallback
- Play/pause, previous, next, and seek controls
- SPW configuration-page button, a public `HookRegistrar` More-menu entry, Plasma tray entry, and a public shortcut
- Folia's original bottom-right panel handle; its Controls page keeps only track information, lyric style, background type, and theme colors
- The panel's settings icon opens Folia's original lyric-style workbench with its original preview, layout, and animation
- Configuration-page usage guide, Linux environment check, and diagnostic log export
- Persisted settings, fonts, themes, and Folia style tuning

The Linux build does not support X11 fallback, transparent windows, mouse passthrough,
Windows/WebView2, WASAPI, queue/random/repeat controls, or reflective player controls. The SPW 1.19.3
More-menu entry uses the exposed Workshop `HookRegistrar`, not an unpublished injector; it therefore
requires the user to grant `class-transform` and remains host-version-sensitive. Without that permission,
the configuration-page button and public shortcut remain available.

When Salt Player is launched through Steam's pressure-vessel container, the plugin uses the Steam
Runtime host launcher so the native helper can see the system Qt and KDE libraries. Outside Steam it
launches the helper directly.

## Build

```sh
# settings UI (requires work/folia/folia-major-main)
pnpm --dir poc/settings-ui install --frozen-lockfile
pnpm --dir poc/settings-ui build

# Kotlin plugin; bash works with this checkout's non-executable gradlew bit
cd spw-folia
bash ./gradlew plugin
cd ..

# Build the Qt6/Wayland/PipeWire host and stage web/native/licenses
bash packaging/build-package.sh

# Merge the Kotlin development archive and staging into the installable package
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging \
  --out dist/release \
  --name spw-folia-for-linux-0.5.0-linux-x86_64.spmod
```

The installable artifact is
`dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod`. Do not install the intermediate
`spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod`: it contains only the Kotlin plugin and
does not contain `native/spw-folia-host` or `web/`, so the plugin reports that the Linux host is
unavailable. The final archive contains `classes/`, the complete `web/` bundle, executable
`native/spw-folia-host`, and `licenses/`.

`packaging/build-package.sh` rebuilds the native host, stages the full web bundle, preserves the
Linux executable bit, and writes checksums. `assemble-release.py` validates the staging tree and
merges it with the Kotlin archive. The settings and production page builds require the Folia source
checkout at `work/folia/folia-major-main`; Qt, QtWebEngine, PipeWire, Wayland, and Plasma remain
system dependencies and are not bundled.

See [docs/linux-runtime.md](docs/linux-runtime.md), [docs/protocol.md](docs/protocol.md), and
[docs/release.md](docs/release.md) for runtime, protocol, and packaging details.

The current version notes and migration boundaries are in [docs/version-history.md](docs/version-history.md),
with detailed v0.5.0 changes in [docs/release-notes-v0.5.0.md](docs/release-notes-v0.5.0.md).
Older Windows release records are kept under [docs/archive/](docs/archive/). Some site videos and
screenshots are also historical Windows-build material and do not describe current Linux support.
The GitHub Pages deployment is documented in [docs/github-pages.md](docs/github-pages.md); the workflow
uploads only the repository's `site/` directory as the Pages artifact.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and
the notices included in the release package.
