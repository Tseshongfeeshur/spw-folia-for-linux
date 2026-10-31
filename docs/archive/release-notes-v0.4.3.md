# spw-folia v0.4.3 — Windows issue fixes

> **Historical Windows release.** This was the final old release-note revision before the Linux
> migration work; its Windows requirements and feature claims are not current.

v0.4.3 continued the v0.4.2 fixes for the Windows WebView2 bridge. It corrected word-level lyric timing,
made more Folia layers obey the old transparent-window flag, and improved diagnostics and feedback.

## Historical changes

- Mapped real lyric cells into Folia words instead of using only equal character timing.
- Removed opaque decorative layers while the old Windows color-key transparency mode was active.
- Added environment self-checks, page console forwarding, stall logging and a prefilled feedback flow.
- Retained the old private menu hook, transparent window, mouse passthrough and WASAPI helper.

For the current package, use [`docs/release-notes-v0.5.0.md`](../release-notes-v0.5.0.md) instead.
