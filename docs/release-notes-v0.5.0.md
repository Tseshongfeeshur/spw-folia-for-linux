# spw-folia-for-linux v0.5.0 — Linux-only runtime

This is the first Linux-only implementation of spw-folia-for-linux. It is intended for Salt Player `1.19.3`
running on Linux `x86_64` with Wayland and KDE Plasma.

## What changed

- Replaced the Windows helper with a Qt6 C++ host using QtWebEngine and KDE Frameworks 6
  `KStatusNotifierItem`/D-Bus tray facilities and
  PipeWire.
- Kept the Kotlin plugin inside Salt Player's PF4J process, but limited it to public Workshop API
  surfaces, settings persistence, playback extension data and key bindings.
- Restored the SPW “更多” entry through the exposed Workshop `HookRegistrar` API. The adapter targets
  the validated Salt Player `1.19.3` Compose signature and requests the explicit `class-transform`
  permission; it is not a private agent or an undocumented injector.
- Enabled the SPW plugin configuration page with `preference_config.json`, including an “打开 / 显示
  Folia” button, a short usage guide, Linux environment self-check, and diagnostic log export. The
  default public shortcut remains `Ctrl+Alt+F`.
- Added host stderr capture and a startup probe to the environment check. Steam pressure-vessel
  launches use `steam-runtime-launch-client --host` so missing host-side Qt libraries are reported
  clearly instead of appearing as an unresponsive entry point.
- Replaced Qt's generic tray abstraction with KDE Frameworks 6 `KStatusNotifierItem`, which registers
  a Plasma StatusNotifier item over D-Bus before the Folia window is created.
- Moved FFT, spectrum compression, five-band calculation and paused breathing fallback into the native
  host. Audio frames do not pass through the Kotlin/JVM bridge.
- Kept playback state, track, cover, lyrics and settings synchronization through the JSON-lines bridge.
- Reused Folia's original bottom-right `PanelHandle` for the playback-page entry. The reduced Controls
  page keeps the track header, lyric style, background type and theme colors; its settings icon opens
  Folia's original lyric-style workbench and preserves the original preview layout and animation.

## Removed from the current platform

The Linux package does not support Windows, WebView2, WASAPI, X11 fallback, transparent windows, mouse
passthrough, reflective playback controls, queue controls,
shuffle or repeat controls. Playback actions are limited to play/pause, previous, next and seek.

Qt6, QtWebEngine, KDE Frameworks 6 StatusNotifierItem, Wayland, KDE Plasma and PipeWire are system
dependencies. They are deliberately not copied into the `.spmod`.

## Verification

The local release assembly checks the PF4J extension index, Linux x86_64 ELF host, executable mode,
required web resources, licenses and absence of Windows payload files. Kotlin and packaging builds have
been run locally. Full Wayland GUI acceptance still requires a live Wayland/KDE session; a headless build
machine cannot prove tray and window behavior.

See [`linux-runtime.md`](linux-runtime.md), [`protocol.md`](protocol.md), [`release.md`](release.md) and
[`version-history.md`](version-history.md).
