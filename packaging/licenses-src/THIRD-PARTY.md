# THIRD-PARTY COMPONENTS - spw-folia

| component | version | license | where |
| --- | --- | --- | --- |
| Folia web build (`folia-major`) | 0.7.22 | AGPL-3.0 | `web/**` |
| Folia visualizer and settings components | 0.7.22 | AGPL-3.0 | bundled web build and settings island |
| spw-folia settings UI | this repository | AGPL-3.0 | `web/settings/**` |
| Qt 6 / QtWebEngine | system dependency | distribution-provided licenses | native host runtime |
| PipeWire `libpipewire-0.3` | system dependency | distribution-provided license | native host runtime |
| Salt Player Workshop API | 0.1.0-dev23 | host-provided | Kotlin `compileOnly` dependency |
| PF4J | 3.12.0 | Apache-2.0 | host-provided / Kotlin `compileOnly` dependency |
| Kotlin, Compose, React, Vite and supporting packages | pinned build dependencies | their respective licenses | build time or host-provided |

The `.spmod` contains only the Kotlin plugin, Linux web resources, the x86_64 Qt host, and these
notices. Qt, QtWebEngine, Wayland, Plasma, PipeWire, JDK, Node, and pnpm remain system/build
dependencies.
