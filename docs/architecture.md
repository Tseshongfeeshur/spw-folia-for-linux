# Architecture

spw-folia-for-linux is a Linux-only Salt Player plugin. The Kotlin/PF4J side uses only public Workshop API
surfaces; the visualizer is hosted by a separate Qt process so Chromium and audio processing do not
run inside Salt Player's JVM.

```text
Salt Player JVM / PF4J
  Kotlin plugin
    config-page callback + public shortcut + public HookRegistrar menu adapter
    playback extension + settings persistence
    JSON-lines stdin/stdout
              |
              v
  native/spw-folia-host  (Qt6 / QtWebEngine / PipeWire)
    Wayland window + Plasma tray
    local Folia web bundle
    PipeWire sink monitor -> FFT -> audio messages
              |
              v
  Folia page + settings island
```

The plugin sends `hello`, settings, playback state, lyrics, and track metadata. The host sends page
settings changes and public playback requests back to the plugin. High-frequency audio stays inside
the host and is injected directly into the page.

The plugin entry points are independent: the SPW configuration page button and public shortcut work
without `class-transform`; the More-menu item is installed through the exposed Workshop
`HookRegistrar` only when that permission is granted. The target adapter is pinned to the validated
SPW `1.19.3` Compose signature and is isolated in `FoliaMenuHook.kt`.

The host uses the standard Qt Wayland platform plugin and does not provide an X11 fallback. The
bundle uses a local `folia://app/` URL scheme, so it needs no HTTP server or network access.
