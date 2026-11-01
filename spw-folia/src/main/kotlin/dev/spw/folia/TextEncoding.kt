package dev.spw.folia

import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

/**
 * Repairs the mojibake produced when UTF-8 metadata is decoded as Windows-1252/Latin-1.
 *
 * The Workshop API exposes JVM Strings, so the original bytes are no longer available by the
 * time a playback callback reaches the plugin. We therefore only apply this when a strict reverse
 * decode produces a string with substantially fewer mojibake markers and at least one non-Latin-1
 * character. Ordinary Chinese, Japanese, emoji, and correctly decoded Latin text are left alone.
 */
internal object TextEncoding {
    private val windows1252 = Charset.forName("windows-1252")
    private val latin1 = StandardCharsets.ISO_8859_1

    fun repair(value: String): String {
        if (value.isEmpty() || mojibakeScore(value) == 0) return value

        decodeCandidate(value, windows1252)?.let { candidate ->
            if (isBetter(value, candidate)) return candidate
        }
        decodeCandidate(value, latin1)?.let { candidate ->
            if (isBetter(value, candidate)) return candidate
        }

        // A correctly decoded CJK segment may be mixed with a damaged title/artist segment. A
        // whole-string encode then fails, so retry independently over encodable runs.
        return repairRuns(value, windows1252).let { cp1252 ->
            if (cp1252 != value) cp1252 else repairRuns(value, latin1)
        }
    }

    private fun decodeCandidate(value: String, source: Charset): String? = try {
        val encoder = source.newEncoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        val encoded = encoder.encode(java.nio.CharBuffer.wrap(value))
        val bytes = ByteArray(encoded.remaining())
        encoded.get(bytes)
        val decoder = StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        decoder.decode(ByteBuffer.wrap(bytes)).toString()
    } catch (_: CharacterCodingException) {
        null
    }

    private fun repairRuns(value: String, source: Charset): String {
        val encoder = source.newEncoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        val out = StringBuilder(value.length)
        var start = 0
        var index = 0
        while (index < value.length) {
            val codePoint = value.codePointAt(index)
            val width = Character.charCount(codePoint)
            val encodable = encoder.canEncode(String(Character.toChars(codePoint)))
            if (!encodable) {
                if (start < index) out.append(repairRun(value.substring(start, index), source))
                out.appendCodePoint(codePoint)
                start = index + width
            }
            index += width
        }
        if (start < value.length) out.append(repairRun(value.substring(start), source))
        val result = out.toString()
        return if (isBetter(value, result)) result else value
    }

    private fun repairRun(run: String, source: Charset): String =
        decodeCandidate(run, source)?.takeIf { isBetter(run, it) } ?: run

    private fun isBetter(original: String, candidate: String): Boolean =
        candidate != original &&
            mojibakeScore(candidate) < mojibakeScore(original) &&
            candidate.any { it.code > 0xff }

    private fun mojibakeScore(value: String): Int = value.count { c ->
        c in '\u0080'..'\u009f' ||
            c in '\u00c2'..'\u00f4' ||
            c == '\u0152' || c == '\u0153' || c == '\u0178' ||
            c == '\u02c6' || c == '\u02dc'
    }

}
