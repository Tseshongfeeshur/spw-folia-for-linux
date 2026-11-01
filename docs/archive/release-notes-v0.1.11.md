# spw-folia v0.1.11 — stdin and WebView2 thread-safety fix

> **Historical Windows release.** This note describes the former WebView2 helper and is not a
> current Linux installation guide.

## Changes

- Marshalled helper page updates from the stdin reader thread to the WebView2 UI thread.
- Isolated malformed stdin lines so one page message could not terminate the helper's stdin pump.
- Replaced blocking plugin-side pipe writes with a bounded writer queue, preventing a stalled helper
  from freezing the Salt Player UI thread.
- Preserved clean helper shutdown and playback-state forwarding after lyrics and track messages.

## Verification

The real-machine crash reproduction and fixed-helper comparison are recorded in
[`verification-v0.1.11.md`](verification-v0.1.11.md). The v0.2.0 notes also include this fix because
the two changes were carried into the next published package.

The current Linux host does not use WebView2 or this Windows helper path.
