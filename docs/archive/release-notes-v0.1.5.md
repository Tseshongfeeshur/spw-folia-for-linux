# spw-folia v0.1.5 — local preview animation

> **Historical internal build.** v0.1.5 was verified locally but was not published as a GitHub
> release. It belongs to the former Windows/WebView2 implementation.

## Changes

- Added a slow Ken Burns drift to the large lyric-style preview in the settings page.
- Connected the preview pause button to `Play` / `Pause` state and `animationPlayState`, so pausing
  freezes the preview and resuming continues it.
- Kept the preview lightweight: the full Folia renderer was tested but rejected for this build because
  it increased the payload substantially and triggered a React maximum-update-depth failure in the
  injected settings page.

## Verification

The local Windows SPW 1.19.0 verification recorded a playing frame change, a zero-pixel paused frame
change, and a resumed frame change. The complete evidence remains in
[`verification-v0.1.5.md`](verification-v0.1.5.md).

No v0.1.5 artifact was published or tagged.
