# Historical Windows hook target

> This page describes the private Salt Player menu hook removed by the Linux migration.

The former implementation discovered or profiled obfuscated Compose classes to append a Folia entry to
the Windows mini-player menu. The current Linux plugin does not use that private Windows injector or
private Salt Player classes. It uses the exposed Workshop `HookRegistrar` for the validated SPW 1.19.3
menu target, plus a public key binding and the Qt host. The public hook requires `CLASS_TRANSFORM`.

See [`../version-history.md`](../version-history.md).
