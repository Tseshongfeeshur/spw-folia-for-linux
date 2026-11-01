package dev.spw.folia

import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets
import java.util.concurrent.CountDownLatch
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
        val builder = createProcessBuilder(host, web)
        val p = runCatching { builder.start() }.getOrElse { log("Linux host spawn failed: ${it.message}"); return false }
        process = p
        ready = false
        startWriter(p)
        Thread({ readOutput(p) }, "spw-folia-for-linux-host-output").apply { isDaemon = true; start() }
        Thread({ readError(p) }, "spw-folia-for-linux-host-error").apply { isDaemon = true; start() }
        Thread({ p.waitFor(); if (!stopping) cleanup(p, "process-exit") }, "spw-folia-for-linux-host-exit").apply { isDaemon = true; start() }
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

    /** Run the same host launch path without opening a Folia window and return a diagnostic report. */
    fun diagnose(callback: (String, Boolean) -> Unit) {
        Thread({
            val report = StringBuilder()
            val host = resolveHost()
            val web = resolveWeb()
            val launcher = resolveRuntimeLauncher()
            report.appendLine("pluginPath=${pluginPath.absolutePath}")
            report.appendLine("host=${host?.absolutePath ?: "missing"}")
            report.appendLine("web=${web?.absolutePath ?: "missing"}")
            report.appendLine("runtimeLauncher=${launcher?.absolutePath ?: "none"}")
            report.appendLine("pressureVessel=${isPressureVessel()}")
            val sessionType = System.getenv("XDG_SESSION_TYPE") ?: ""
            val desktop = System.getenv("XDG_CURRENT_DESKTOP") ?: System.getenv("XDG_SESSION_DESKTOP") ?: ""
            val wayland = System.getenv("WAYLAND_DISPLAY") ?: ""
            report.appendLine("waylandCheck=${if (sessionType.equals("wayland", true) && wayland.isNotBlank()) "ok" else "failed"}")
            report.appendLine("plasmaCheck=${if (desktop.contains("kde", true) || desktop.contains("plasma", true)) "ok" else "warning"}")
            report.appendLine("pipewireCheck=${if (File(System.getenv("XDG_RUNTIME_DIR") ?: "", "pipewire-0").exists()) "ok" else "warning: socket not visible"}")
            report.appendLine("XDG_SESSION_TYPE=$sessionType")
            report.appendLine("XDG_CURRENT_DESKTOP=$desktop")
            report.appendLine("WAYLAND_DISPLAY=$wayland")

            if (host == null || web == null) {
                report.appendLine("result=failed: bundled host or web bundle is missing")
                callback(report.toString(), false)
                return@Thread
            }
            val builder = createProcessBuilder(host, web)
            val result = probe(builder)
            report.append(result.details)
            callback(report.toString(), result.ok)
        }, "spw-folia-for-linux-environment-check").apply { isDaemon = true; start() }
    }

    fun diagnosticSummary(): String = buildString {
        appendLine("sessionType=${System.getenv("XDG_SESSION_TYPE") ?: ""}")
        appendLine("desktop=${System.getenv("XDG_CURRENT_DESKTOP") ?: System.getenv("XDG_SESSION_DESKTOP") ?: ""}")
        appendLine("waylandDisplay=${System.getenv("WAYLAND_DISPLAY") ?: ""}")
        appendLine("pressureVessel=${isPressureVessel()}")
        appendLine("pressureVesselRuntime=${System.getenv("PRESSURE_VESSEL_RUNTIME") ?: ""}")
        appendLine("runtimeLauncher=${resolveRuntimeLauncher()?.absolutePath ?: "missing"}")
        appendLine("host=${resolveHost()?.absolutePath ?: "missing"}")
        appendLine("web=${resolveWeb()?.absolutePath ?: "missing"}")
    }

    private fun readOutput(p: Process) {
        runCatching { BufferedReader(InputStreamReader(p.inputStream, StandardCharsets.UTF_8)).forEachLine(::handleLine) }
            .onFailure { if (!stopping) log("host output failed: ${it.message}") }
    }

    private fun readError(p: Process) {
        runCatching {
            BufferedReader(InputStreamReader(p.errorStream, StandardCharsets.UTF_8)).forEachLine {
                if (it.isNotBlank()) log("host stderr: $it")
            }
        }.onFailure { if (!stopping) log("host stderr failed: ${it.message}") }
    }

    private fun handleLine(line: String) {
        when (Json.stringField(line, "t")) {
            "ready" -> { ready = true; startPump() }
            "settings" -> Json.rawField(line, "settings")?.let { onSettingsFromPage?.invoke(it) }
            "control" -> {
                val action = Json.stringField(line, "action") ?: ""
                val positionMs = Json.rawField(line, "positionMs")?.toLongOrNull()
                log("control received from Folia page: action=$action positionMs=${positionMs ?: "-"}")
                controlHandler?.invoke(action, positionMs)
            }
            "closed" -> onClosed?.invoke(Json.stringField(line, "reason") ?: "closed")
            "log" -> log("host: ${Json.stringField(line, "msg") ?: line}")
        }
    }

    private fun startPump() {
        pump?.shutdownNow()
        pump = Executors.newSingleThreadScheduledExecutor { r -> Thread(r, "spw-folia-for-linux-state-pump").apply { isDaemon = true } }
        pump!!.scheduleAtFixedRate({
            if (!ready || !isRunning()) return@scheduleAtFixedRate
            snapshotProvider?.invoke()?.let { s -> sendLine("{\"t\":\"state\",\"posMs\":${s.posMs},\"durationMs\":${s.durationMs},\"playing\":${s.playing},\"rate\":${s.rate},\"tsMs\":${System.currentTimeMillis()}}") }
            lyricsProvider?.invoke()?.let {
                if (it != lastLyrics) {
                    lastLyrics = it
                    sendLine("{\"t\":\"lyrics\",\"lyrics\":$it}")
                }
            }
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
        }, "spw-folia-for-linux-host-input").apply { isDaemon = true; start() }
    }

    private fun sendLine(line: String) { queue?.offer(line) }

    private fun cleanup(expected: Process, reason: String) {
        if (process !== expected) return
        pump?.shutdownNow(); pump = null; queue = null; writer = null; ready = false; process = null
        onClosed?.invoke(reason)
    }

    private fun resolveHost(): File? {
        val envHost = System.getenv("SPW_FOLIA_HOST")
            ?.takeIf { it.isNotBlank() }
            ?.let(::File)
        val candidates = listOfNotNull(
            File(pluginPath, "native/spw-folia-host"),
            File(pluginPath, "host/spw-folia-host"),
            envHost
        )

        for (candidate in candidates) {
            if (!candidate.isFile) {
                log("host candidate missing: ${candidate.absolutePath}")
                continue
            }
            if (!candidate.canExecute()) {
                val repaired = runCatching { candidate.setExecutable(true, false) }.getOrDefault(false)
                log("host candidate is not executable: ${candidate.absolutePath}; chmod=$repaired")
            }
            if (candidate.canExecute()) {
                log("Linux host selected: ${candidate.absolutePath}")
                return candidate
            }
            log("host candidate remains non-executable: ${candidate.absolutePath}")
        }
        log("Linux host executable not found; pluginPath=${pluginPath.absolutePath}")
        return null
    }

    private fun resolveWeb(): File? {
        val web = File(pluginPath, "web")
        return if (web.isDirectory && File(web, "index.html").isFile) {
            log("Folia web bundle selected: ${web.absolutePath}")
            web
        } else {
            log("Folia web bundle not found: ${web.absolutePath}")
            null
        }
    }

    private fun createProcessBuilder(host: File, web: File): ProcessBuilder {
        val launcher = resolveRuntimeLauncher()
        val command = if (launcher != null && isPressureVessel()) {
            buildList {
                add(launcher.absolutePath)
                add("--host")
                add("--env")
                add("QT_QPA_PLATFORM=wayland")
                listOf(
                    "WAYLAND_DISPLAY",
                    "XDG_RUNTIME_DIR",
                    "XDG_CURRENT_DESKTOP",
                    "XDG_SESSION_DESKTOP",
                    "XDG_SESSION_TYPE",
                    "DBUS_SESSION_BUS_ADDRESS",
                    "DISPLAY",
                ).forEach { key ->
                    if (!System.getenv(key).isNullOrBlank()) {
                        add("--pass-env=$key")
                    }
                }
                add("--")
                add(host.absolutePath)
                add("--bundle")
                add(web.absolutePath)
            }.also { log("using Steam Runtime host launcher: ${launcher.absolutePath}") }
        } else {
            listOf(host.absolutePath, "--bundle", web.absolutePath)
                .also { log("using direct Linux host launch: ${host.absolutePath}") }
        }
        return ProcessBuilder(command)
            .directory(pluginPath.absoluteFile)
            .also { it.environment()["QT_QPA_PLATFORM"] = "wayland" }
    }

    private fun resolveRuntimeLauncher(): File? {
        val envLauncher = System.getenv("SPW_FOLIA_RUNTIME_LAUNCHER")
            ?.takeIf { it.isNotBlank() }
            ?.let(::File)
        val pathCandidates = System.getenv("PATH")
            ?.split(File.pathSeparator)
            ?.filter { it.isNotBlank() }
            ?.map { File(it, "steam-runtime-launch-client") }
            ?: emptyList()
        val candidates = listOfNotNull(
            envLauncher,
            *pathCandidates.toTypedArray(),
            File("/usr/lib/pressure-vessel/from-host/bin/steam-runtime-launch-client"),
            File("/run/host/usr/lib/pressure-vessel/from-host/bin/steam-runtime-launch-client"),
            File("/usr/lib/pressure-vessel/bin/steam-runtime-launch-client"),
        )
        return candidates.firstOrNull { it.isFile && it.canExecute() }
    }

    private fun isPressureVessel(): Boolean = !System.getenv("PRESSURE_VESSEL_RUNTIME").isNullOrBlank() ||
        !System.getenv("PRESSURE_VESSEL_APP_ID").isNullOrBlank() ||
        File("/run/host/usr/lib/pressure-vessel").isDirectory

    private data class ProbeResult(val ok: Boolean, val details: String)

    private fun probe(builder: ProcessBuilder): ProbeResult {
        val process = runCatching { builder.start() }.getOrElse {
            return ProbeResult(false, "result=failed: spawn ${it::class.java.simpleName}: ${it.message}\n")
        }
        val stdout = StringBuilder()
        val stderr = StringBuilder()
        val ready = CountDownLatch(1)
        val outputThread = Thread({
            runCatching {
                BufferedReader(InputStreamReader(process.inputStream, StandardCharsets.UTF_8)).forEachLine {
                    stdout.appendLine(it)
                    if (it.contains("\"t\":\"ready\"")) ready.countDown()
                }
            }
        }, "spw-folia-for-linux-diagnostic-output").apply { isDaemon = true; start() }
        Thread({
            runCatching {
                BufferedReader(InputStreamReader(process.errorStream, StandardCharsets.UTF_8)).forEachLine {
                    stderr.appendLine(it)
                }
            }
        }, "spw-folia-for-linux-diagnostic-error").apply { isDaemon = true; start() }

        val handshake = runCatching { ready.await(5, TimeUnit.SECONDS) }.getOrDefault(false)
        if (handshake) {
            runCatching {
                OutputStreamWriter(process.outputStream, StandardCharsets.UTF_8).buffered().use {
                    it.append("{\"t\":\"quit\"}\n").flush()
                }
            }
        } else {
            process.destroyForcibly()
        }
        runCatching { process.waitFor(2, TimeUnit.SECONDS) }
        outputThread.join(250)
        val details = buildString {
            appendLine("result=${if (handshake) "ok: host handshake" else "failed: host did not handshake"}")
            append("exitCode=${runCatching { process.exitValue() }.getOrDefault(-1)}\n")
            if (stdout.isNotBlank()) append("stdout=$stdout")
            if (stderr.isNotBlank()) append("stderr=$stderr")
        }
        return ProbeResult(handshake, details)
    }

    private companion object { const val POISON = "\u0000spw-folia-stop" }
}
