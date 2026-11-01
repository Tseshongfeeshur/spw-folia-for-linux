# NOTICE - spw-folia-for-linux

spw-folia-for-linux is an unofficial community workshop plugin for Salt Player. It is not affiliated with,
endorsed by, or supported by Salt Player or Folia authors.

## Project code

The Kotlin plugin, React settings island, Qt host, PipeWire analyzer, and packaging scripts are
Copyright (C) 2026 the spw-folia-for-linux contributors and are licensed under AGPL-3.0-or-later.

## Folia web assets

The `web/` directory contains the Folia `folia-major` 0.7.22 production web build and reused
settings components. Folia is licensed under AGPL-3.0. The corresponding upstream source is listed
in `SOURCE-OFFER.md`; the full license is included as `licenses/AGPL-3.0.txt`.

## Runtime dependencies

The Linux host links against system-provided Qt 6, QtWebEngine, KDE Frameworks 6
`KStatusNotifierItem`/Plasma StatusNotifier, Wayland, and PipeWire libraries. These libraries are not
bundled in the `.spmod`; their licenses are provided by the host distribution.

No Windows binaries, WebView2 SDK, .NET runtime, WASAPI code, or font files are redistributed.
