# spw-folia Linux Protocol v1

The Kotlin plugin runs inside Salt Player. `native/spw-folia-host` is a Qt 6 process for Linux
x86_64 Wayland sessions. The host owns the Wayland window, Plasma tray, QtWebEngine page, PipeWire
capture, FFT, and JSON-lines stdin/stdout. The page owns Folia rendering and settings.

## Process

```text
Salt Player JVM -> spw-folia-host (Qt6 / QtWebEngine / PipeWire)
                       | console.log("__SPW__:" + json)
                       v
                    Folia page
```

The host is started with `--bundle <web-dir>` and sets `QT_QPA_PLATFORM=wayland`. X11 fallback,
Windows/WebView2, transparent windows, mouse passthrough, and private Salt Player hooks are not
part of this protocol.

## Plugin to Host

Every line is one UTF-8 JSON object.

| `t` | Fields | Meaning |
| --- | --- | --- |
| `hello` | `protocol:1`, `pluginVersion`, `spwVersion` | Handshake. |
| `settings` | `settings: object` | Full persisted settings tree. |
| `state` | `posMs`, `durationMs`, `playing`, `rate`, `tsMs` | Playback clock, sent every 100 ms. |
| `lyrics` | `lyrics: object` | Lyrics and word timing JSON. |
| `track` | `track: object` | Track metadata and cover data URL. |
| `action` | `action:"toggle"` | Show or hide the host window. |
| `quit` | none | Graceful host shutdown. |

The host also emits `audio` internally to the page. Audio is never forwarded through the JVM.

## Host to Plugin

| `t` | Fields | Meaning |
| --- | --- | --- |
| `ready` | `protocol:1` | Host process and tray are ready. |
| `settings` | `settings: object` | Page settings update. |
| `control` | `action`, optional `positionMs` | Public playback request. |
| `closed` | `reason` | Window or process lifecycle notification. |
| `log` | `level`, `msg` | Host diagnostics. |

Supported playback actions are `toggle`, `previous`, `next`, and `seek`. The plugin maps them to
`WorkshopApi.playback`; queue, shuffle, repeat, and reflective player controls do not exist.

## Host and Page

The injected `Shim.js` sends page messages through the Chromium console:

```js
console.log('__SPW__:' + JSON.stringify(message));
```

The Qt `QWebEnginePage::javaScriptConsoleMessage()` override parses that prefix. Host messages are
delivered by calling `window.__SPW_FOLIA_HOST_DELIVER__(message)`.

Page messages are limited to `settings`, `control`, `action`, and `log`. Host messages are limited to
`hello`, `settings`, `state`, `lyrics`, `track`, `audio`, `config`, and `ui`.

## Audio

PipeWire capture and analysis remain in the host. The stream requests the system sink monitor and
captures mono float audio. The host uses a Hann-windowed 2048-point FFT, emits 1024 AnalyserNode
compatible 0..255 spectrum bytes, and computes the five Folia bands in Hz: bass 20-150, low-mid
150-400, mid 400-1200, vocal 1000-3500, and treble 3500-12000. Power and bands are gamma-shaped on
the same 0..255 scale. The page receives approximately 30 Hz `audio` messages. While paused or
silent, the spectrum is empty and power/bands use Folia's 0..40 breathing fallback.

## Lifecycle

1. The public Salt Player shortcut starts or toggles the host.
2. The plugin sends `hello` and settings; the host creates its tray immediately and the page on demand.
3. The plugin sends state at 100 ms and lower-frequency track/lyrics changes.
4. Disabling or uninstalling the plugin sends `quit`; the host exits and the bridge releases its threads.
