# spw-folia v0.4.5 — Windows Salt Player 1.19.3 hook fix

> **Historical Windows release.** The current Linux build does not install this old private Windows
> hook. Its Linux menu entry is a separate adapter built on the exposed Workshop `HookRegistrar`.

v0.4.5 fixed the old Windows menu entry after Salt Player 1.19.3 renamed its R8-obfuscated Compose
classes. It corrected the structural-discovery path that converted JVM internal class names to binary
names before `Class.forName`.

## Historical changes

- Added the Salt Player for Windows 1.19.3 private menu target profile.
- Fixed structural discovery for the menu facade, menu scope and popup state.
- Revalidated the old menu entry, playback controls, tray behavior and transparency path on Windows.

The Linux version does not use the old private Windows injector or private Salt Player classes. Its
SPW 1.19.3 menu entry uses the exposed `HookRegistrar` and requires `class-transform`; its configuration
page button, public key binding and Plasma StatusNotifier tray remain independent entry points.
