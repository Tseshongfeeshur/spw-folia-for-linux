#pragma once

#include <QObject>
#include <QJsonObject>
#include <spa/utils/hook.h>
#include <array>
#include <mutex>

struct pw_thread_loop;
struct pw_context;
struct pw_core;
struct pw_stream;
struct spa_hook;

class PipeWireAudio final : public QObject {
    Q_OBJECT
public:
    explicit PipeWireAudio(QObject* parent = nullptr);
    ~PipeWireAudio() override;
    bool start();
    QJsonObject frame(bool playing);

private:
    static void process(void* data);
    void readAvailable();

    pw_thread_loop* loop_ = nullptr;
    pw_context* context_ = nullptr;
    pw_core* core_ = nullptr;
    pw_stream* stream_ = nullptr;
    spa_hook listener_{};
    mutable std::mutex samplesMutex_;
    std::array<float, 4096> samples_{};
    std::array<float, 1024> smoothedMagnitudes_{};
    size_t writeIndex_ = 0;
};
