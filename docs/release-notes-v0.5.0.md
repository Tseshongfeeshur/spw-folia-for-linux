# spw-folia v0.5.0 — Linux-only runtime

This is the first Linux-only implementation of spw-folia. It is intended for Salt Player `1.19.3`
running on Linux `x86_64` with Wayland and KDE Plasma.

## What changed

- Replaced the Windows helper with a Qt6 C++ host using QtWebEngine, QtDBus/Plasma tray facilities and
  PipeWire.
- Kept the Kotlin plugin inside Salt Player's PF4J process, but limited it to public Workshop API
  surfaces, settings persistence, playback extension data and key bindings.
- Replaced the old menu hook with the public shortcut entry. The default action is `Ctrl+Alt+F` and the
  Plasma tray remains available after the host starts.
- Moved FFT, spectrum compression, five-band calculation and paused breathing fallback into the native
  host. Audio frames do not pass through the Kotlin/JVM bridge.
- Kept playback state, track, cover, lyrics and settings synchronization through the JSON-lines bridge.

## Removed from the current platform

The Linux package does not support Windows, WebView2, WASAPI, X11 fallback, transparent windows, mouse
passthrough, `CLASS_TRANSFORM`, private menu hooks, reflective playback controls, queue controls,
shuffle or repeat controls. Playback actions are limited to play/pause, previous, next and seek.

Qt6, QtWebEngine, Wayland, KDE Plasma and PipeWire are system dependencies. They are deliberately not
copied into the `.spmod`.

## Verification

The local release assembly checks the PF4J extension index, Linux x86_64 ELF host, executable mode,
required web resources, licenses and absence of Windows payload files. Kotlin and packaging builds have
been run locally. Full Wayland GUI acceptance still requires a live Wayland/KDE session; a headless build
machine cannot prove tray and window behavior.

See [`linux-runtime.md`](linux-runtime.md), [`protocol.md`](protocol.md), [`release.md`](release.md) and
[`version-history.md`](version-history.md).
