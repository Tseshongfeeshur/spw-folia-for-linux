# spw-folia v0.4.0 — Windows feature expansion

> **Historical Windows release.** These notes describe the pre-Linux implementation and must not be used
> as current support documentation.

v0.4.0 updated the bundled Folia web resources and added Windows-only experience features: the `花火`
style, random style selection, custom/system fonts, a Windows tray entry, transparency shortcuts and
opening transitions.

## Historical changes

- Updated the web bundle to Folia 0.7.22 and added the 15th style, `花火` (`hanabi`).
- Added random style pools and per-song style rotation.
- Added font import and Windows system-font enumeration.
- Added a Windows tray entry and shortcuts for transparent playback backgrounds.
- Added cover-colour opening transitions and a non-transparent exit button.
- Fixed Windows startup flash, preview loading, preview font updates and tray visibility.

## Historical requirements

Windows 10/11 x64, Salt Player for Windows, WebView2, WASAPI and the private Windows hook were required.
The transparency and mouse-passthrough controls described by the old release are removed from the Linux
version. The current Linux package uses Folia 0.7.21 assets and exposes 14 styles.
