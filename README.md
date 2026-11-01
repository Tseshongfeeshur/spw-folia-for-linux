# spw-folia-for-linux

Folia 歌词可视化插件，面向 Salt Player `1.19.3` 的 Linux 版本。

项目主页：[spw-folia-for-linux GitHub Pages](https://tseshongfeeshur.github.io/spw-folia-for-linux/)。

## 目标环境

- Linux `x86_64`
- Wayland + KDE Plasma
- JDK `25.0.4` 运行 Salt Player
- 系统安装 Qt 6、QtWebEngine、PipeWire、KDE Frameworks 6 `KStatusNotifierItem` 和 Plasma StatusNotifier 支持

插件本身运行在 Salt Player JVM/PF4J 中；Folia 页面、QtWebEngine 窗口、Plasma 托盘和 PipeWire
音频分析由 `.spmod` 内的 `native/spw-folia-host` 负责。Qt、QtWebEngine、Wayland、Plasma 和
PipeWire 不随插件重复打包。

## 功能

- Folia 生产 web bundle 和设置页面
- 播放状态、歌曲、封面、歌词和逐字时间轴同步
- PipeWire sink monitor、FFT、频谱和五频段音频驱动
- 暂停或无音频时的呼吸值降级
- 播放 / 暂停、上一首、下一首和定位
- SPW 配置页“打开 Folia 歌词页”和“打开 Folia 以配置”按钮、公开菜单 Hook 入口、Plasma 托盘入口和标准快捷键入口
- 播放页右下角沿用 Folia 原版侧边面板开关；控制页仅保留歌曲信息、歌词样式、背景类型和颜色主题
- 控制页仅保留歌词样式、背景类型和颜色主题的原版操作；选择器不再提供“更多设置”入口
- 配置页使用说明、Linux 环境检测和诊断日志导出
- 设置持久化、字体、主题和 Folia 样式调节

Linux 版本不支持 X11 回退、透明窗口、鼠标穿透、Windows/WebView2、WASAPI、队列、随机/循环
控制，也不使用未公开的 Salt Player 内部注入器或反射播放器控制。SPW 1.19.3 的“更多”菜单入口
使用 Workshop API 已暴露的 `HookRegistrar`，因此需要用户授权 `class-transform`；该入口是宿主
混淆版本绑定的适配层，SPW 升级后可能需要更新插件。没有该权限时，配置页按钮和公开快捷键仍可用。

## 安装

安装系统依赖后，在 Salt Player 中导入并启用 `.spmod`，按提示授予 `library-read`、`key-bindings`
和 `class-transform`。插件配置页现在提供“打开 Folia 歌词页”和“打开 Folia 以配置”按钮；也可使用“更多”菜单、公开
快捷键（默认 `Ctrl+Alt+F`）或 Plasma 托盘。第一次打开时启动 Qt 宿主，宿主启动后注册 KDE
StatusNotifier 托盘。禁用或卸载插件会发送 `quit` 并关闭宿主。

详细依赖和构建说明见 [docs/linux-runtime.md](docs/linux-runtime.md)、[docs/protocol.md](docs/protocol.md)
和 [docs/release.md](docs/release.md)。

当前版本说明和旧版本迁移边界见 [docs/version-history.md](docs/version-history.md)；当前版本详细变更见
[docs/release-notes-v0.5.0.md](docs/release-notes-v0.5.0.md)。旧 Windows
版本的发布记录集中在 [docs/archive/](docs/archive/)。项目主页中的部分视频和截图也是旧版 Windows
构建素材，不能用来判断当前 Linux 版本是否支持透明窗口或菜单入口。

项目主页的 GitHub Pages 部署方式见 [docs/github-pages.md](docs/github-pages.md)。当前 workflow
直接把仓库根目录下的 `site/` 上传为 Pages artifact，不会把仓库其他目录发布到网站。

## 从源码构建

以下顺序会生成包含 Kotlin 插件、完整 Folia web bundle、Linux 原生宿主和许可证的最终
`.spmod`。不要直接安装 `spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod`：它是
Workshop Gradle 任务生成的 Kotlin 开发包，不包含 `native/` 和 `web/`，安装后会显示
“Folia Linux host is unavailable”。

```sh
# settings UI（需要 work/folia/folia-major-main）
pnpm --dir poc/settings-ui install --frozen-lockfile
pnpm --dir poc/settings-ui build

# Kotlin plugin；bash 用于兼容当前仓库中未设置 executable bit 的 gradlew
cd spw-folia
bash ./gradlew plugin
cd ..

# 构建 Qt6/Wayland/PipeWire 宿主并准备 packaging/web、packaging/native、packaging/licenses
bash packaging/build-package.sh

# 合并 Kotlin 开发包与上述 staging，生成可安装的完整 .spmod
python3 packaging/tools/assemble-release.py \
  --spmod spw-folia/build/libs/plugin-dev.spw.folia-0.5.0.spmod \
  --staging packaging \
  --out dist/release \
  --name spw-folia-for-linux-0.5.0-linux-x86_64.spmod
```

最终文件是
`dist/release/spw-folia-for-linux-0.5.0-linux-x86_64.spmod`。它必须包含 `classes/`、
`web/`、`native/spw-folia-host` 和 `licenses/`；`native/spw-folia-host` 是可执行的 Linux
`x86_64` ELF 文件。`packaging/build-package.sh` 会重新构建宿主、stage 完整 web bundle、
保留可执行权限并生成校验和，`assemble-release.py` 会拒绝缺少关键文件的 staging 或插件包。

`poc/settings-ui` 从 `work/folia/folia-major-main` 导入 Folia 源码；没有该 checkout 不能
重新构建 web 资源。Qt、QtWebEngine、PipeWire、Wayland 和 Plasma 仍是目标机器上的系统依赖，
不会被打包进 `.spmod`。

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
the notices included in the release package.
