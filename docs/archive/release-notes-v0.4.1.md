# spw-folia v0.4.1 — Windows live preview

> **Historical Windows release.** This document records the old WebView2 implementation only.

v0.4.1 changed the settings preview from a locally fabricated sample song to a live mirror of the old
Windows playback page. It reused the page's config, clock, audio and transparency state, and removed the
preview-text selector. It also fixed a packaging compression regression.

## Historical changes

- Settings preview consumed the same config received by the playback page.
- Playback time and audio were mirrored into the preview instead of synthesized locally.
- Pause froze the mirrored clock and resume continued it from the real state.
- Removed the preview placeholder-song and preview-text settings.
- Restored the expected compressed package size after the build-tool regression.

WebView2, Windows transparency and the old host bridge were required. The current Linux preview runs in
the QtWebEngine host and follows the contracts in [`docs/protocol.md`](../protocol.md).
