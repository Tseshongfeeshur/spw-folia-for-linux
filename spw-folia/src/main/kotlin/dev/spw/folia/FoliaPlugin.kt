@file:OptIn(UnstableSpwWorkshopApi::class)

package dev.spw.folia

import com.xuncorp.spw.workshop.api.ActionShortcut
import com.xuncorp.spw.workshop.api.PluginContext
import com.xuncorp.spw.workshop.api.SpwPlugin
import com.xuncorp.spw.workshop.api.UnstableSpwWorkshopApi
import com.xuncorp.spw.workshop.api.WorkshopApi
import java.awt.event.KeyEvent
import java.io.File
import java.time.LocalDateTime

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
        bridge.onClosed = { reason -> writeLog("Folia host closed: $reason") }
        registerToggleShortcut()
        writeLog("started Linux Folia plugin for SPW ${pluginContext.spwVersion}")
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
        if (bridge.isRunning()) bridge.sendAction("toggle")
        else if (!bridge.open()) toast("Folia Linux host is unavailable", WorkshopApi.Ui.ToastType.Error)
    }

    private fun handleControl(action: String, positionMs: Long?) {
        runCatching {
            when (action) {
                "toggle" -> if (FoliaPlaybackExtension.get()?.snapshot()?.playing == true) WorkshopApi.playback.pause() else WorkshopApi.playback.play()
                "previous" -> WorkshopApi.playback.previous()
                "next" -> WorkshopApi.playback.next()
                "seek" -> positionMs?.let { WorkshopApi.playback.seekTo(it.coerceAtLeast(0L)) }
                else -> writeLog("ignored unsupported host control: $action")
            }
        }.onFailure { writeLog("playback control failed ($action): ${it.message}") }
    }

    private fun withSystemFonts(tree: String): String = runCatching { FoliaSystemFonts.mergeSystemFontsJson(tree) }.getOrDefault(tree)

    private fun writeLog(message: String) {
        runCatching {
            val file = File(pluginContext.pluginPath, "spw-folia.log")
            file.parentFile?.mkdirs()
            file.appendText("[${LocalDateTime.now()}] $message\n")
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

        fun logStatic(message: String) { instance?.writeLog(message) }

        fun toastStatic(text: String, type: WorkshopApi.Ui.ToastType) {
            val target = instance
            if (target != null) target.toast(text, type) else runCatching { WorkshopApi.ui.toast(text, type) }
        }
    }
}
