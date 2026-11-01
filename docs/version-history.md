# Version history

This page separates the current Linux package from the older Windows implementation.

## Current

### v0.5.0 — Linux / Wayland / Plasma / PipeWire

Full notes: [`release-notes-v0.5.0.md`](release-notes-v0.5.0.md).

The current package targets Salt Player `1.19.3` on Linux `x86_64`, Wayland and KDE Plasma. It keeps
the public Workshop API, moves the Folia page and audio analysis to the bundled Qt6 host, and removes
the private Windows implementation.

- Qt6 + QtWebEngine host with Plasma StatusNotifier tray entry.
- PipeWire sink-monitor capture, FFT, spectrum and five-band audio data.
- Public playback controls only: play/pause, previous, next and seek.
- Salt Player entry through the configuration-page button and public key-binding API; default shortcut
  `Ctrl+Alt+F`.
- SPW 1.19.3 More-menu entry through the public `HookRegistrar`; requires explicit `CLASS_TRANSFORM`
  permission and is isolated from the playback API.
- No X11 fallback, transparent window, mouse passthrough, queue, shuffle or repeat controls.
- System Qt, QtWebEngine, KDE Frameworks 6 StatusNotifierItem, Wayland, Plasma and PipeWire are
  required and are not bundled.

The package and host checks are described in [`linux-runtime.md`](linux-runtime.md),
[`protocol.md`](protocol.md) and [`release.md`](release.md). The current package is a locally verified
Linux build; check GitHub Releases for the artifact actually published to users.

## Historical Windows releases

These documents describe the implementation that existed before the Linux migration. They are retained
for release archaeology and are not supported installation instructions.

| Version | Record | Historical focus |
| --- | --- | --- |
| v0.1.0 | [`archive/release-notes-v0.1.0.md`](archive/release-notes-v0.1.0.md) | Initial Windows/WebView2/WASAPI release |
| v0.1.1–v0.1.4 | [`archive/`](archive/) | Windows UI, menu styling and lyric-style fixes |
| v0.1.5 | [`archive/release-notes-v0.1.5.md`](archive/release-notes-v0.1.5.md) | Unpublished local animated preview build |
| v0.1.6–v0.1.10 | [`archive/`](archive/) | Windows live preview, transparency and input fixes |
| v0.1.11 | [`archive/release-notes-v0.1.11.md`](archive/release-notes-v0.1.11.md) | WebView2/stdin thread-safety fix, carried into v0.2.0 |
| v0.2.0–v0.2.2 | [`docs/archive/`](archive/) | Transparent window and mouse passthrough work |
| v0.3.0 | [`archive/release-notes-v0.3.0.md`](archive/release-notes-v0.3.0.md) | Windows playback HUD and private controls |
| v0.3.1 | [`archive/release-notes-v0.3.1.md`](archive/release-notes-v0.3.1.md) | Runtime discovery for the old Windows hook |
| v0.4.0 | [`archive/release-notes-v0.4.0.md`](archive/release-notes-v0.4.0.md) | Folia 0.7.22 and Windows tray/custom-font work |
| v0.4.1 | [`archive/release-notes-v0.4.1.md`](archive/release-notes-v0.4.1.md) | Windows live preview |
| v0.4.2 / v0.4.3 | [`archive/release-notes-v0.4.2.md`](archive/release-notes-v0.4.2.md) | Windows lyric timing, transparency and diagnostics |
| v0.4.5 | [`archive/release-notes-v0.4.5.md`](archive/release-notes-v0.4.5.md) | Salt Player 1.19.3 Windows hook fix |
| v0.4.6 | [`archive/release-notes-v0.4.6.md`](archive/release-notes-v0.4.6.md) | Windows hook target discovery |

There is no separate v0.4.4 release note in the original release sequence. The archive README explains
why these files are frozen and why their Windows-specific claims are not current behavior.
