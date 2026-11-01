# Linux runtime

This release targets Linux x86_64 on Wayland with KDE Plasma. Salt Player loads the JVM plugin;
Folia's visualizer runs in the bundled `native/spw-folia-host` Qt process.

Install these system dependencies before enabling the plugin:

- Qt 6 Widgets and QtWebEngine
- PipeWire `libpipewire-0.3`
- Wayland, KDE Plasma, and KDE Frameworks 6 `KStatusNotifierItem` / StatusNotifier support

The native window opens Folia's documented `index.html?obs=1` browser-source surface directly. This
is the lyric visualizer page; Folia's home, library, queue and other application pages are not
exposed by this plugin. The settings overlay is the plugin's own lyric-style configuration island.
On the playback page, the bottom-right panel handle uses Folia's original `PanelHandle` motion and
appearance. Its Linux Controls page is intentionally reduced to the track header, lyric style,
background type, and theme colors. The final settings icon opens Folia's original lyric-style
workbench (`VisPlayground`) so the full preview, layout, and transitions remain source-compatible.

The plugin does not support X11 fallback, Windows/WebView2, transparent or mouse-passthrough
windows, queue/random/repeat controls, or reflective playback controls. The SPW More-menu entry is
registered through the public Workshop `HookRegistrar` and requires the `class-transform` permission;
it is validated for SPW `1.19.3` and may need a plugin update after a host upgrade. The configuration
page button and public shortcut remain usable if that permission is declined. Playback actions are
limited to play/pause, previous, next, and seek through the public Workshop API.

The plugin configuration page is enabled by `Plugin-Has-Config: true` and the bundled
`preference_config.json`. “打开 Folia 歌词页” calls
`dev.spw.folia.FoliaPlugin.onOpenFolia` and loads the plugin's `obs=1` lyric surface;
“打开 Folia 以配置” calls `onOpenFoliaForConfiguration` and loads Folia's main application
surface without `obs=1`, so its own global settings remain available.

The configuration page also provides a short usage guide, a Linux environment check, and a
diagnostic export button. The export is written to `~/Downloads` when available; otherwise the
plugin directory's `diagnostics/` folder is used and the exact path is shown in a toast.

When Salt Player is running inside Steam's pressure-vessel container, the plugin launches the Qt
helper through `steam-runtime-launch-client --host` so host-installed Qt and KDE libraries remain
visible. In a non-Steam launch it starts the helper directly.

## Troubleshooting

After replacing a plugin package, fully restart Salt Player so Workshop rescans the plugin
manifest. The installed package should contain `classes/preference_config.json` and its manifest
should report `Plugin-Has-Config: true`; an older `spw-folia-*.spmod` can leave the “配置” entry
disabled even when the source tree is correct.

The native helper must be executable. The release archive preserves its Unix mode, the local
installer applies `chmod 755`, and the plugin repairs the bundled helper on first launch when an
extractor has dropped the executable bit. Detailed host resolution, spawn failures, and Qt stderr
are written to `spw-folia.log` in the installed plugin directory.
