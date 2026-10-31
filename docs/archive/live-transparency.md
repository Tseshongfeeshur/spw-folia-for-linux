# Historical Windows transparency contract

> This page describes the removed Windows color-key transparency and mouse-passthrough implementation.

The archived releases used a Windows helper, transparent playback windows, input capture and shaped
regions. Those controls were removed in the Linux migration and are not part of v0.5.0.

The current host uses a normal Qt Wayland window. See [`../architecture.md`](../architecture.md) and
[`../linux-runtime.md`](../linux-runtime.md).
