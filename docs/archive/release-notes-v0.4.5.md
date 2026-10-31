# spw-folia v0.4.5 — Windows Salt Player 1.19.3 hook fix

> **Historical Windows release.** The current Linux build does not install this menu hook.

v0.4.5 fixed the old Windows menu entry after Salt Player 1.19.3 renamed its R8-obfuscated Compose
classes. It corrected the structural-discovery path that converted JVM internal class names to binary
names before `Class.forName`.

## Historical changes

- Added the Salt Player for Windows 1.19.3 private menu target profile.
- Fixed structural discovery for the menu facade, menu scope and popup state.
- Revalidated the old menu entry, playback controls, tray behavior and transparency path on Windows.

The Linux version does not inject a menu item and does not use `class-transform`, reflection or private
Salt Player classes. Its entry is the public key binding plus Plasma tray.
