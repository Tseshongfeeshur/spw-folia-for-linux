# spw-folia v0.4.6 — Windows structural host discovery

> **Historical Windows release.** This document describes the removed private-hook implementation.

v0.4.6 replaced the old Windows hard-coded R8 name table with bytecode-structure discovery. The goal was
to survive future Salt Player obfuscation changes without publishing a new plugin for every Windows host
patch release.

## Historical changes

- Indexed the Windows host jar and found the private menu targets by method and type shape.
- Required a unique candidate and cross-validated the discovered menu facade, scope and popup state.
- Cached verified results by Salt Player version and kept the old profile path as a fallback.
- Added diagnostics for scan counts, validation and cache reuse.

This mechanism was intentionally removed during the Linux migration. The current host is a standalone
Qt6 process and the plugin uses only public Workshop API surfaces.
