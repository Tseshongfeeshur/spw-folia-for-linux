package dev.spw.folia

import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/** JSON-lines bridge to the Linux Qt/Wayland host. */
internal class FoliaHostBridge(private val pluginPath: File, private val log: (String) -> Unit) {
    @Volatile private var process: Process? = null
    @Volatile private var stopping = false
    @Volatile private var ready = false
    @Volatile private var writer: Thread? = null
    @Volatile private var queue: LinkedBlockingQueue<String>? = null
    private var pump: ScheduledExecutorService? = null
    @Volatile private var lastLyrics: String? = null
    @Volatile private var lastTrack: String? = null

    @Volatile var settingsTree: String? = null
    @Volatile var hostVersion: String = FoliaPlugin.SPW_VERSION
    @Volatile var onClosed: ((String) -> Unit)? = null
    @Volatile var onSettingsFromPage: ((String) -> Unit)? = null
    @Volatile var controlHandler: ((String, Long?) -> Unit)? = null
    @Volatile var snapshotProvider: (() -> PlaybackSnapshot?)? = null
    @Volatile var lyricsProvider: (() -> String?)? = null
    @Volatile var trackProvider: (() -> String?)? = null

    fun isRunning(): Boolean = process?.isAlive == true && !stopping

    @Synchronized fun open(): Boolean {
        if (isRunning()) { sendAction("toggle"); return true }
        val host = resolveHost() ?: run { log("Linux host executable not found"); return false }
        val web = resolveWeb() ?: run { log("Folia web bundle not found"); return false }
        stopping = false
        lastLyrics = null
        lastTrack = null
        val builder = ProcessBuilder(host.absolutePath, "--bundle", web.absolutePath)
            .directory(pluginPath.absoluteFile)
            .redirectError(ProcessBuilder.Redirect.INHERIT)
        builder.environment()["QT_QPA_PLATFORM"] = "wayland"
        val p = runCatching { builder.start() }.getOrElse { log("Linux host spawn failed: ${it.message}"); return false }
        process = p
        ready = false
        startWriter(p)
        Thread({ readOutput(p) }, "spw-folia-host-output").apply { isDaemon = true; start() }
        Thread({ p.waitFor(); if (!stopping) cleanup(p, "process-exit") }, "spw-folia-host-exit").apply { isDaemon = true; start() }
        sendLine("{\"t\":\"hello\",\"protocol\":1,\"pluginVersion\":${Json.str(FoliaPlugin.PLUGIN_VERSION)},\"spwVersion\":${Json.str(hostVersion)}}")
        settingsTree?.let(::sendSettings)
        log("Linux host spawned pid=${p.pid()}")
        return true
    }

    @Synchronized fun stop() {
        val p = process ?: return
        stopping = true
        pump?.shutdownNow()
        sendLine("{\"t\":\"quit\"}")
        queue?.offer(POISON)
        writer?.join(500)
        if (!runCatching { p.waitFor(2, TimeUnit.SECONDS) }.getOrDefault(true)) p.destroyForcibly()
        cleanup(p, "stopped")
    }

    fun sendAction(action: String) = sendLine("{\"t\":\"action\",\"action\":${Json.str(action)}}")

    fun sendSettings(json: String) {
        settingsTree = json
        sendLine("{\"t\":\"settings\",\"settings\":$json}")
    }

    private fun readOutput(p: Process) {
        runCatching { BufferedReader(InputStreamReader(p.inputStream, StandardCharsets.UTF_8)).forEachLine(::handleLine) }
            .onFailure { if (!stopping) log("host output failed: ${it.message}") }
    }

    private fun handleLine(line: String) {
        when (Json.stringField(line, "t")) {
            "ready" -> { ready = true; startPump() }
            "settings" -> Json.rawField(line, "settings")?.let { onSettingsFromPage?.invoke(it) }
            "control" -> controlHandler?.invoke(Json.stringField(line, "action") ?: "", Json.rawField(line, "positionMs")?.toLongOrNull())
            "closed" -> onClosed?.invoke(Json.stringField(line, "reason") ?: "closed")
            "log" -> log("host: ${Json.stringField(line, "msg") ?: line}")
        }
    }

    private fun startPump() {
        pump?.shutdownNow()
        pump = Executors.newSingleThreadScheduledExecutor { r -> Thread(r, "spw-folia-state-pump").apply { isDaemon = true } }
        pump!!.scheduleAtFixedRate({
            if (!ready || !isRunning()) return@scheduleAtFixedRate
            snapshotProvider?.invoke()?.let { s -> sendLine("{\"t\":\"state\",\"posMs\":${s.posMs},\"durationMs\":${s.durationMs},\"playing\":${s.playing},\"rate\":${s.rate},\"tsMs\":${System.currentTimeMillis()}}") }
            lyricsProvider?.invoke()?.let { if (it != lastLyrics) { lastLyrics = it; sendLine("{\"t\":\"lyrics\",\"lyrics\":$it}") } }
            val track = trackProvider?.invoke()
            if (track != lastTrack) {
                lastTrack = track
                sendLine("{\"t\":\"track\",\"track\":${track ?: "null"}}")
            }
        }, 0, 100, TimeUnit.MILLISECONDS)
    }

    private fun startWriter(p: Process) {
        val q = LinkedBlockingQueue<String>(256)
        queue = q
        writer = Thread({
            runCatching { OutputStreamWriter(p.outputStream, StandardCharsets.UTF_8).buffered().use { out ->
                while (true) { val line = q.take(); if (line == POISON) break; out.append(line).append('\n').flush() }
            } }.onFailure { if (!stopping) log("host input failed: ${it.message}") }
        }, "spw-folia-host-input").apply { isDaemon = true; start() }
    }

    private fun sendLine(line: String) { queue?.offer(line) }

    private fun cleanup(expected: Process, reason: String) {
        if (process !== expected) return
        pump?.shutdownNow(); pump = null; queue = null; writer = null; ready = false; process = null
        onClosed?.invoke(reason)
    }

    private fun resolveHost(): File? = listOf(
        File(pluginPath, "native/spw-folia-host"), File(pluginPath, "host/spw-folia-host"),
        File(System.getenv("SPW_FOLIA_HOST") ?: "")
    ).firstOrNull { it.isFile && it.canExecute() }

    private fun resolveWeb(): File? = listOf(File(pluginPath, "web"), File(pluginPath, "web/index.html"))
        .firstOrNull { it.isDirectory && File(it, "index.html").isFile }

    private companion object { const val POISON = "\u0000spw-folia-stop" }
}
