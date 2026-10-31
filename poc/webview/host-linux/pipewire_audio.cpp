#include "pipewire_audio.h"

#include <pipewire/pipewire.h>
#include <spa/param/audio/raw-utils.h>
#include <spa/param/format-utils.h>
#include <QDateTime>
#include <QJsonArray>
#include <algorithm>
#include <cmath>
#include <complex>
#include <vector>

namespace {
constexpr size_t FftSize = 2048;
constexpr size_t SpectrumBins = FftSize / 2;
constexpr double Pi = 3.14159265358979323846;
constexpr double MinDecibels = -100.0;
constexpr double MaxDecibels = -30.0;
constexpr double Smoothing = 0.6;

void fft(std::array<std::complex<float>, FftSize>& values) {
    for (size_t i = 1, j = 0; i < FftSize; ++i) {
        size_t bit = FftSize >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) std::swap(values[i], values[j]);
    }
    for (size_t length = 2; length <= FftSize; length <<= 1) {
        const auto angle = std::complex<float>(std::cos(-2.0 * Pi / length), std::sin(-2.0 * Pi / length));
        for (size_t start = 0; start < FftSize; start += length) {
            std::complex<float> factor(1.0f, 0.0f);
            for (size_t offset = 0; offset < length / 2; ++offset) {
                const auto even = values[start + offset];
                const auto odd = values[start + offset + length / 2] * factor;
                values[start + offset] = even + odd;
                values[start + offset + length / 2] = even - odd;
                factor *= angle;
            }
        }
    }
}
}

PipeWireAudio::PipeWireAudio(QObject* parent) : QObject(parent) {}

PipeWireAudio::~PipeWireAudio() {
    if (loop_) pw_thread_loop_lock(loop_);
    if (stream_) pw_stream_destroy(stream_);
    if (core_) pw_core_disconnect(core_);
    if (context_) pw_context_destroy(context_);
    if (loop_) {
        pw_thread_loop_unlock(loop_);
        pw_thread_loop_stop(loop_);
        pw_thread_loop_destroy(loop_);
    }
    pw_deinit();
}

bool PipeWireAudio::start() {
    pw_init(nullptr, nullptr);
    loop_ = pw_thread_loop_new("spw-folia-audio", nullptr);
    if (!loop_) return false;
    context_ = pw_context_new(pw_thread_loop_get_loop(loop_), nullptr, 0);
    if (!context_ || pw_thread_loop_start(loop_) < 0) return false;

    pw_thread_loop_lock(loop_);
    core_ = pw_context_connect(context_, nullptr, 0);
    if (!core_) { pw_thread_loop_unlock(loop_); return false; }
    auto* properties = pw_properties_new(
        PW_KEY_MEDIA_TYPE, "Audio",
        PW_KEY_MEDIA_CATEGORY, "Capture",
        PW_KEY_MEDIA_ROLE, "Music",
        PW_KEY_STREAM_CAPTURE_SINK, "true",
        PW_KEY_STREAM_MONITOR, "true",
        nullptr);
    stream_ = pw_stream_new(core_, "Folia audio capture", properties);
    if (!stream_) { pw_thread_loop_unlock(loop_); return false; }

    static pw_stream_events events{};
    events.version = PW_VERSION_STREAM_EVENTS;
    events.process = &PipeWireAudio::process;
    pw_stream_add_listener(stream_, &listener_, &events, this);

    spa_audio_info_raw format{};
    format.format = SPA_AUDIO_FORMAT_F32;
    format.rate = 48000;
    format.channels = 1;
    uint8_t podBuffer[1024];
    spa_pod_builder builder = SPA_POD_BUILDER_INIT(podBuffer, sizeof(podBuffer));
    const spa_pod* params[] = {spa_format_audio_raw_build(&builder, SPA_PARAM_EnumFormat, &format)};
    const auto result = pw_stream_connect(
        stream_, PW_DIRECTION_INPUT, PW_ID_ANY,
        static_cast<pw_stream_flags>(PW_STREAM_FLAG_AUTOCONNECT | PW_STREAM_FLAG_MAP_BUFFERS | PW_STREAM_FLAG_RT_PROCESS),
        params, 1);
    pw_thread_loop_unlock(loop_);
    return result >= 0;
}

void PipeWireAudio::process(void* data) { static_cast<PipeWireAudio*>(data)->readAvailable(); }

void PipeWireAudio::readAvailable() {
    pw_buffer* buffer = nullptr;
    while ((buffer = pw_stream_dequeue_buffer(stream_)) != nullptr) {
        spa_buffer* spaBuffer = buffer->buffer;
        if (spaBuffer && spaBuffer->n_datas > 0 && spaBuffer->datas[0].data) {
            auto& plane = spaBuffer->datas[0];
            const auto bytes = plane.chunk ? plane.chunk->size : 0;
            const auto count = bytes / sizeof(float);
            const auto* source = reinterpret_cast<const float*>(
                static_cast<const uint8_t*>(plane.data) + (plane.chunk ? plane.chunk->offset : 0));
            std::lock_guard lock(samplesMutex_);
            for (size_t i = 0; i < count; ++i) {
                samples_[writeIndex_] = std::isfinite(source[i]) ? std::clamp(source[i], -1.0f, 1.0f) : 0.0f;
                writeIndex_ = (writeIndex_ + 1) % samples_.size();
            }
        }
        pw_stream_queue_buffer(stream_, buffer);
    }
}

QJsonObject PipeWireAudio::frame(bool playing) {
    std::array<float, FftSize> input{};
    {
        std::lock_guard lock(samplesMutex_);
        for (size_t i = 0; i < FftSize; ++i) input[i] = samples_[(writeIndex_ + samples_.size() - FftSize + i) % samples_.size()];
    }

    const auto nowMs = QDateTime::currentMSecsSinceEpoch();
    double energy = 0.0;
    std::array<std::complex<float>, FftSize> bins{};
    for (size_t i = 0; i < FftSize; ++i) {
        const auto window = 0.5 - 0.5 * std::cos(2.0 * Pi * i / (FftSize - 1));
        const auto sample = input[i] * static_cast<float>(window);
        bins[i] = {sample, 0.0f};
        energy += double(input[i]) * input[i];
    }
    fft(bins);

    const auto rms = std::sqrt(energy / FftSize);
    if (!playing || rms < 2e-5) {
        const auto breath = (std::sin(static_cast<double>(nowMs) / 2000.0) + 1.0) * 20.0;
        QJsonArray bands;
        for (int i = 0; i < 5; ++i) bands.append(breath);
        return {
            {"type", "audio"},
            {"power", breath},
            {"spectrum", QJsonArray{}},
            {"bands", bands},
            {"sentAtMs", nowMs}
        };
    }

    QJsonArray spectrum;
    std::array<double, 5> sums{};
    std::array<int, 5> counts{};
    constexpr double bandRanges[][2] = {
        {20.0, 150.0}, {150.0, 400.0}, {400.0, 1200.0},
        {1000.0, 3500.0}, {3500.0, 12000.0}
    };
    const auto binHz = 48000.0 / static_cast<double>(FftSize);
    for (int i = 0; i < int(SpectrumBins); ++i) {
        const auto magnitude = i == 0
            ? std::abs(bins[0]) / static_cast<double>(FftSize / 2)
            : 2.0 * std::abs(bins[size_t(i)]) / static_cast<double>(FftSize / 2);
        const auto smoothed = Smoothing * smoothedMagnitudes_[size_t(i)] + (1.0 - Smoothing) * magnitude;
        smoothedMagnitudes_[size_t(i)] = static_cast<float>(smoothed);
        const auto decibels = 20.0 * std::log10(smoothed + 1e-12);
        const auto level = std::clamp(
            (decibels - MinDecibels) / (MaxDecibels - MinDecibels) * 255.0, 0.0, 255.0);
        spectrum.append(int(std::round(level)));
        const auto hz = static_cast<double>(i) * binHz;
        for (int band = 0; band < 5; ++band) {
            if (hz >= bandRanges[band][0] && hz <= bandRanges[band][1]) {
                sums[band] += level;
                ++counts[band];
            }
        }
    }
    QJsonArray bands;
    constexpr double boosts[] = {1.8, 2.0, 2.0, 1.5, 2.0};
    std::array<double, 5> raw{};
    for (int i = 0; i < 5; ++i) raw[size_t(i)] = counts[i] ? sums[i] / counts[i] : 0.0;
    for (int i = 0; i < 5; ++i) {
        const auto normalized = raw[size_t(i)] / 255.0;
        bands.append(std::pow(std::clamp(normalized, 0.0, 1.0), boosts[i]) * 255.0);
    }
    const auto powerRaw = (raw[0] + raw[1]) * 0.5 / 255.0;
    return {
        {"type", "audio"},
        {"power", std::pow(std::clamp(powerRaw, 0.0, 1.0), 3.0) * 255.0},
        {"spectrum", spectrum},
        {"bands", bands},
        {"sentAtMs", nowMs}
    };
}
