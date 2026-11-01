# spw-folia v0.4.2 — Windows diagnostics and lyric timing

> **Historical Windows release.** This document is retained because it was part of the original version
> notes. It does not describe the current Linux package.

v0.4.2 fixed three issues in the old Windows path: lost word timing, incomplete transparent rendering and
poor diagnostics.

## Historical changes

- Preserved Salt Player lyric `cells[]` as Folia word timing, with equal-duration fallback for ordinary
  LRC lines.
- Disabled additional opaque decorative layers in the old transparent mode.
- Added environment checks, richer plugin/helper/page logging and a support/feedback entry.
- Kept the old Windows playback HUD, private host integration and transparency behavior.

The Linux implementation has no transparent window or old private Windows hook. Its current menu
entry uses the exposed Workshop `HookRegistrar`; timing and diagnostics are defined by
[`docs/protocol.md`](../protocol.md) and [`docs/linux-runtime.md`](../linux-runtime.md).
