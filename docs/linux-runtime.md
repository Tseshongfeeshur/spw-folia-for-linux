# Linux runtime

This release targets Linux x86_64 on Wayland with KDE Plasma. Salt Player loads the JVM plugin;
Folia's visualizer runs in the bundled `native/spw-folia-host` Qt process.

Install these system dependencies before enabling the plugin:

- Qt 6 Widgets and QtWebEngine
- PipeWire `libpipewire-0.3`
- Wayland and a Plasma StatusNotifier-compatible tray

The plugin does not support X11 fallback, Windows/WebView2, transparent or mouse-passthrough
windows, queue/random/repeat controls, or private Salt Player hooks. Playback actions are limited
to play/pause, previous, next, and seek through the public Workshop API.
