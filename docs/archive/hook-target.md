# Historical Windows hook target

> This page describes the private Salt Player menu hook removed by the Linux migration.

The former implementation discovered or profiled obfuscated Compose classes to append a Folia entry to
the Windows mini-player menu. The current Linux plugin does not use `CLASS_TRANSFORM`, menu hooks,
reflection or private Salt Player classes; it registers a public key binding and starts the Qt host.

See [`../version-history.md`](../version-history.md).
