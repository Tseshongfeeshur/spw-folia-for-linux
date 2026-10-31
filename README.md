# spw-folia

Folia 歌词可视化插件，面向 Salt Player `1.19.3` 的 Linux 版本。

## 目标环境

- Linux `x86_64`
- Wayland + KDE Plasma
- JDK `25.0.4` 运行 Salt Player
- 系统安装 Qt 6、QtWebEngine、PipeWire 和 Plasma StatusNotifier 支持

插件本身运行在 Salt Player JVM/PF4J 中；Folia 页面、QtWebEngine 窗口、Plasma 托盘和 PipeWire
音频分析由 `.spmod` 内的 `native/spw-folia-host` 负责。Qt、QtWebEngine、Wayland、Plasma 和
PipeWire 不随插件重复打包。

## 功能

- Folia 生产 web bundle 和设置页面
- 播放状态、歌曲、封面、歌词和逐字时间轴同步
- PipeWire sink monitor、FFT、频谱和五频段音频驱动
- 暂停或无音频时的呼吸值降级
- 播放 / 暂停、上一首、下一首和定位
- Plasma 托盘入口与标准快捷键入口
- 设置持久化、字体、主题和 Folia 样式调节

Linux 版本不支持 X11 回退、透明窗口、鼠标穿透、Windows/WebView2、WASAPI、队列、随机/循环
控制，也不使用 Salt Player 私有 hook 或反射播放器控制。

## 安装

安装系统依赖后，在 Salt Player 中导入并启用 `.spmod`。插件会在第一次使用公开快捷键时启动
Qt 宿主；宿主启动后会常驻并显示 Plasma 托盘。禁用或卸载插件会发送 `quit` 并关闭宿主。

详细依赖和构建说明见 [docs/linux-runtime.md](docs/linux-runtime.md)、[docs/protocol.md](docs/protocol.md)
和 [docs/release.md](docs/release.md)。

## 从源码构建

```sh
# Kotlin plugin
cd spw-folia
GRADLE_USER_HOME=/tmp/spw-gradle-home bash ./gradlew plugin

# Qt6 / PipeWire host
cd ..
cmake -S poc/webview/host-linux -B poc/webview/host-linux/build
cmake --build poc/webview/host-linux/build

# settings UI, requires work/folia/folia-major-main
cd poc/settings-ui
pnpm install --frozen-lockfile
pnpm build

# package staging and release assembly
cd ../..
bash packaging/build-package.sh
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging --out dist/release
```

`poc/settings-ui` imports the Folia source checkout from `work/folia/folia-major-main`; its `dist/`
is also the source for the bundled production page. Without that checkout the Kotlin and native
builds still work, but the web resources cannot be rebuilt.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
the notices included in the release package.
