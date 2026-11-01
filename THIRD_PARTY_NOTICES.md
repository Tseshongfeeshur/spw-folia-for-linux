# Third-party notices

`spw-folia-for-linux` is an AGPL-3.0-or-later derivative work of Folia. It is an unofficial community
plugin and is not affiliated with Salt Player or Folia authors.

## Folia

- Upstream: `https://github.com/chthollyphile/folia-major`
- Version: `0.7.22`
- License: AGPL-3.0
- Use: production web bundle, visualizer styles, translations, and reused settings components.

The upstream source identity and the reproducible staging recipe are recorded in
`packaging/licenses/SOURCE-OFFER.md`.

## Salt Player Workshop API and PF4J

The Workshop API (`com.xuncorp.spw.workshop:spw-workshop-api:0.1.0-dev23`) and PF4J are compile-only
dependencies. Salt Player provides them at runtime; they are not redistributed in the `.spmod`.

## Linux system dependencies

The native host links to system-provided Qt 6, QtWebEngine, KDE Frameworks 6
`KStatusNotifierItem`/Plasma StatusNotifier support, Wayland, and PipeWire `libpipewire-0.3`. These
libraries are not bundled. Their licenses are provided by the Linux distribution.

## Build dependencies

Kotlin, Compose, Gradle, React, Vite, TypeScript, zustand, i18next, lucide-react, Dexie, and other
Node packages retain their upstream licenses. They are build-time dependencies or host-provided
runtime components and are not copied into the native host.
