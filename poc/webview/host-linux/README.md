# Linux host

`spw-folia-host` is a Qt 6 / QtWebEngine helper for Linux Wayland sessions. It requires Qt 6
WebEngine, PipeWire (`libpipewire-0.3`), and a Plasma-compatible desktop session. The plugin sets
`QT_QPA_PLATFORM=wayland`; X11 fallback is intentionally unsupported.

Build with:

```sh
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build
```

The process expects `--bundle <web-directory>`, sets no display fallback itself, and should be
started with `QT_QPA_PLATFORM=wayland`. It creates the Plasma tray before the Folia window and
accepts protocol-v1 JSON-lines on stdin. The host uses PipeWire's sink-monitor stream, 2048-point
FFT analysis, and sends page audio directly through the injected console bridge.
