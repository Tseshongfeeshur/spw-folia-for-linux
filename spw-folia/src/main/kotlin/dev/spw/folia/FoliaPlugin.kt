@file:OptIn(UnstableSpwWorkshopApi::class)

package dev.spw.folia

import com.xuncorp.spw.workshop.api.ActionShortcut
import com.xuncorp.spw.workshop.api.PluginContext
import com.xuncorp.spw.workshop.api.SpwPlugin
import com.xuncorp.spw.workshop.api.UnstableSpwWorkshopApi
import com.xuncorp.spw.workshop.api.WorkshopApi
import java.awt.event.KeyEvent
import java.io.File
import java.nio.charset.StandardCharsets
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/** Linux/Wayland Folia entry point. The visualizer itself lives in the Qt host process. */
class FoliaPlugin(pluginContext: PluginContext) : SpwPlugin(pluginContext) {
    private val bridge = FoliaHostBridge(File(pluginContext.pluginPath), ::writeLog)
    private val settingsStore = FoliaSettingsStore(::writeLog)
    private var toggleShortcut: AutoCloseable? = null

    @Volatile private var settingsTree = "{}"

    override fun start() {
        instance = this
        settingsTree = settingsStore.load()
        bridge.settingsTree = withSystemFonts(settingsTree)
        bridge.hostVersion = pluginContext.spwVersion
        bridge.snapshotProvider = {
            FoliaPlaybackExtension.get()?.snapshot() ?: PlaybackSnapshot(0L, 0L, false, 1.0)
        }
        bridge.lyricsProvider = { FoliaPlaybackExtension.get()?.lyricsJson() }
        bridge.trackProvider = { FoliaPlaybackExtension.get()?.trackJson() }
        bridge.onSettingsFromPage = { tree ->
            val cleanTree = FoliaSystemFonts.withoutSystemFontsJson(tree)
            settingsTree = cleanTree
            bridge.settingsTree = withSystemFonts(cleanTree)
            settingsStore.persist(cleanTree)
        }
        bridge.controlHandler = ::handleControl
        bridge.onClosed = { reason ->
            writeLog("Folia host closed: $reason")
            if (reason == "process-exit" && instance === this) {
                toast("Folia 宿主已退出，请运行“检测 Linux 环境”查看原因", WorkshopApi.Ui.ToastType.Error)
            }
        }
        registerToggleShortcut()
        writeLog("started Linux Folia plugin for SPW ${pluginContext.spwVersion}")
        // Show the same concise guide used by the configuration page whenever the module loads.
        showUsage()
    }

    override fun stop() {
        toggleShortcut?.close()
        toggleShortcut = null
        bridge.stop()
        FoliaPlaybackExtension.stopInstance()
        settingsStore.shutdown()
        if (instance === this) instance = null
    }

    private fun registerToggleShortcut() {
        toggleShortcut = runCatching {
            WorkshopApi.manager.keyBindingManager.register(
                actionId = TOGGLE_ACTION,
                title = "Folia",
                defaultShortcut = ActionShortcut(KeyEvent.VK_F, ActionShortcut.CONTROL or ActionShortcut.ALT),
                hasGlobal = false,
                handler = { toggleFoliaWindow() }
            )
        }.onFailure { writeLog("shortcut registration failed: ${it.message}") }.getOrNull()
    }

    private fun toggleFoliaWindow() {
        writeLog("shortcut invoked")
        if (bridge.isRunning()) bridge.sendAction("toggle")
        else if (!bridge.open()) toast("Folia Linux host is unavailable", WorkshopApi.Ui.ToastType.Error)
    }

    private fun showFoliaWindow() {
        writeLog("open entry invoked")
        if (!bridge.open("lyrics")) toast("Folia Linux host is unavailable", WorkshopApi.Ui.ToastType.Error)
    }

    private fun openFoliaForConfiguration() {
        writeLog("open configuration entry invoked")
        if (!bridge.open("main")) toast("Folia Linux host is unavailable", WorkshopApi.Ui.ToastType.Error)
    }

    private fun handleControl(action: String, positionMs: Long?) {
        writeLog("dispatching public playback control: action=$action positionMs=${positionMs ?: "-"}")
        runCatching {
            when (action) {
                "toggle" -> if (FoliaPlaybackExtension.get()?.snapshot()?.playing == true) WorkshopApi.playback.pause() else WorkshopApi.playback.play()
                "previous" -> WorkshopApi.playback.previous()
                "next" -> WorkshopApi.playback.next()
                "seek" -> positionMs?.let { WorkshopApi.playback.seekTo(it.coerceAtLeast(0L)) }
                else -> writeLog("ignored unsupported host control: $action")
            }
        }.onSuccess { writeLog("public playback control returned: action=$action") }
            .onFailure { writeLog("playback control failed ($action): ${it::class.java.name}: ${it.message}") }
    }

    private fun withSystemFonts(tree: String): String = runCatching { FoliaSystemFonts.mergeSystemFontsJson(tree) }.getOrDefault(tree)

    private fun writeLog(message: String) {
        runCatching {
            val file = File(pluginContext.pluginPath, "spw-folia.log")
            file.parentFile?.mkdirs()
            file.appendText("[${LocalDateTime.now()}] $message\n", StandardCharsets.UTF_8)
        }
    }

    private fun showUsage() {
        writeLog("usage dialog invoked")
        toast(
            "使用方法：点击“打开 Folia 歌词页”显示歌词页；需要修改 Folia 原版设置时，点击“打开 Folia 以配置”。\n" +
                "也可在 SPW 快捷键设置中使用 Ctrl+Alt+F 打开或隐藏歌词页。首次启动需要 Wayland、KDE Plasma、Qt6 WebEngine 和 PipeWire。",
            WorkshopApi.Ui.ToastType.Success,
        )
    }

    private fun checkEnvironment() {
        writeLog("environment check requested")
        bridge.diagnose { report, ok ->
            lastEnvironmentReport = report
            writeLog("environment check:\n$report")
            toast(
                if (ok) "环境检测通过：Folia 宿主可以启动"
                else "环境检测失败：请导出诊断日志查看详情",
                if (ok) WorkshopApi.Ui.ToastType.Success else WorkshopApi.Ui.ToastType.Error,
            )
        }
    }

    private fun exportDiagnostics() {
        writeLog("diagnostic export requested")
        val stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").format(LocalDateTime.now())
        val preferred = File(System.getProperty("user.home", "."), "Downloads")
        val directory = runCatching {
            if (!preferred.isDirectory) preferred.mkdirs()
            if (preferred.isDirectory && preferred.canWrite()) preferred else File(pluginContext.pluginPath, "diagnostics")
        }.getOrElse { File(pluginContext.pluginPath, "diagnostics") }
        runCatching {
            directory.mkdirs()
            val target = File(directory, "spw-folia-diagnostics-$stamp.txt")
            val logFile = File(pluginContext.pluginPath, "spw-folia.log")
            val report = buildString {
                appendLine("spw-folia-for-linux diagnostics")
                appendLine("generatedAt=${LocalDateTime.now()}")
                appendLine("pluginPath=${pluginContext.pluginPath}")
                appendLine("pluginVersion=$PLUGIN_VERSION")
                appendLine("spwVersion=${pluginContext.spwVersion}")
                appendLine("channel=${pluginContext.spwChannel}")
                appendLine()
                appendLine(bridge.diagnosticSummary())
                appendLine()
                appendLine("lastEnvironmentCheck:")
                appendLine(lastEnvironmentReport ?: "not run")
                appendLine("pluginLog:")
                if (logFile.isFile) append(logFile.readText()) else appendLine("missing")
            }
            target.writeText(report)
            writeLog("diagnostics exported: ${target.absolutePath}")
            toast("诊断日志已导出：${target.absolutePath}", WorkshopApi.Ui.ToastType.Success)
        }.onFailure {
            writeLog("diagnostic export failed: ${it::class.java.name}: ${it.message}")
            toast("诊断日志导出失败：${it.message ?: "未知错误"}", WorkshopApi.Ui.ToastType.Error)
        }
    }

    private fun toast(text: String, type: WorkshopApi.Ui.ToastType) {
        runCatching { WorkshopApi.ui.toast(text, type) }.onFailure { writeLog("toast failed: $it") }
    }

    companion object {
        const val SPW_VERSION = "1.19.3"
        const val PLUGIN_VERSION = "0.5.0"
        private const val TOGGLE_ACTION = "folia.toggle"
        @Volatile var instance: FoliaPlugin? = null
            private set
        @Volatile private var lastEnvironmentReport: String? = null

        fun logStatic(message: String) { instance?.writeLog(message) }

        /** Target of the SPW plugin configuration page's "打开 Folia 歌词页" button. */
        @JvmStatic
        @JvmName("onOpenFolia")
        fun onOpenFolia() {
            val target = instance
            if (target == null) {
                runCatching {
                    WorkshopApi.ui.toast("spw-folia-for-linux 插件未启动", WorkshopApi.Ui.ToastType.Warning)
                }
                return
            }
            target.showFoliaWindow()
        }

        @JvmStatic
        @JvmName("onOpenFoliaForConfiguration")
        fun onOpenFoliaForConfiguration() {
            val target = instance
            if (target == null) {
                runCatching {
                    WorkshopApi.ui.toast("spw-folia-for-linux 插件未启动", WorkshopApi.Ui.ToastType.Warning)
                }
                return
            }
            target.openFoliaForConfiguration()
        }

        @JvmStatic
        @JvmName("onShowUsage")
        fun onShowUsage() {
            instance?.showUsage() ?: runCatching {
                WorkshopApi.ui.toast("请先启用 spw-folia-for-linux 插件", WorkshopApi.Ui.ToastType.Warning)
            }
        }

        @JvmStatic
        @JvmName("onCheckEnvironment")
        fun onCheckEnvironment() {
            instance?.checkEnvironment() ?: runCatching {
                WorkshopApi.ui.toast("请先启用 spw-folia-for-linux 插件", WorkshopApi.Ui.ToastType.Warning)
            }
        }

        @JvmStatic
        @JvmName("onExportDiagnostics")
        fun onExportDiagnostics() {
            instance?.exportDiagnostics() ?: runCatching {
                WorkshopApi.ui.toast("请先启用 spw-folia-for-linux 插件", WorkshopApi.Ui.ToastType.Warning)
            }
        }

        fun toastStatic(text: String, type: WorkshopApi.Ui.ToastType) {
            val target = instance
            if (target != null) target.toast(text, type) else runCatching { WorkshopApi.ui.toast(text, type) }
        }
    }
}
