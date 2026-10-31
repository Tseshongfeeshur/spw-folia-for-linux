# SOURCE OFFER - spw-folia

This distribution includes software licensed under AGPL-3.0-or-later, including the Folia web
assets and the spw-folia plugin. The corresponding source is available in this repository.

The Linux native host source is in `poc/webview/host-linux/` and is built with:

```sh
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build
```

The settings island source is in `poc/settings-ui/`; the Kotlin plugin source is in `spw-folia/`.
The bundled Folia source is the upstream `folia-major` 0.7.22 release identified in the project
notice. `packaging/tools/stage-web.mjs` documents the web staging transformation.

Anyone distributing a modified version must preserve the corresponding-source offer required by
AGPL-3.0, including for users interacting with the program over a network.
