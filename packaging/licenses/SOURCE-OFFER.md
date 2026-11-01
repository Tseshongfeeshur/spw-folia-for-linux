# SOURCE OFFER - spw-folia-for-linux

This distribution includes software licensed under AGPL-3.0-or-later, including the Folia web
assets and the spw-folia-for-linux plugin. The corresponding source is available in this repository.

The Linux native host source is in `poc/webview/host-linux/` and is built with:

```sh
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build
```

The settings island source is in `poc/settings-ui/`; the Kotlin plugin source is in `spw-folia/`.
The bundled Folia source is the upstream `folia-major` 0.7.22 release identified in the project
notice. `packaging/tools/stage-web.mjs` documents the web staging transformation.

To reproduce the complete installable Linux `x86_64` package from the repository root, build the
settings UI, Kotlin archive, and native host, then assemble the staging tree:

```sh
pnpm --dir poc/settings-ui install --frozen-lockfile
pnpm --dir poc/settings-ui build
(cd spw-folia && bash ./gradlew plugin)
bash packaging/build-package.sh
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging --out dist/release \
  --name spw-folia-for-linux-0.5.0-linux-x86_64.spmod
```

The Gradle output is an intermediate Kotlin-only archive. The file intended for installation is
`dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod`, which includes `classes/`, `web/`,
`native/spw-folia-host`, and the license notices.

Anyone distributing a modified version must preserve the corresponding-source offer required by
AGPL-3.0, including for users interacting with the program over a network.
