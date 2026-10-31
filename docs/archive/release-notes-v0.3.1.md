# spw-folia v0.3.1 — Windows hook compatibility

> **Historical Windows release.** This document is retained for release archaeology. It is not an
> installation guide for the current Linux-only v0.5.0 package.

v0.3.1 kept the v0.3.0 Windows feature set and changed how the plugin located Salt Player's private
Compose menu classes. It added version profiles and a bytecode-shape discovery fallback so Windows
patch releases such as SPW 1.19.2 could reuse the plugin without a new hard-coded class-name mapping.

## Historical changes

- Moved Windows menu targets out of a single fixed mapping into versioned profiles and a cache.
- Added background structural scanning of the Windows host jar for the private menu facade, scope and
  popup state.
- Validated discovered methods and signatures before installing the hook.
- Changed the old version guard to accept SPW versions at or above the historical minimum `1.19.0`.

## Historical requirements

Windows 10/11 x64, Salt Player for Windows, WebView2, `class-transform` and the old private menu hook
were required. Transparency, mouse passthrough, WASAPI and reflective playback control remained part of
that Windows implementation.

The implementation was superseded by the Linux Qt host in v0.5.0. See [`docs/version-history.md`](../version-history.md).
