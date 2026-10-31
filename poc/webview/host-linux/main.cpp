#include <QApplication>
#include <QBuffer>
#include <QFileInfo>
#include <QFile>
#include <QMimeDatabase>
#include <QMap>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMenu>
#include <QSocketNotifier>
#include <QSystemTrayIcon>
#include <QTimer>
#include <QUrl>
#include <QWebEnginePage>
#include <QWebEngineScript>
#include <QWebEngineScriptCollection>
#include <QWebEngineProfile>
#include <QWebEngineUrlRequestJob>
#include <QWebEngineUrlScheme>
#include <QWebEngineUrlSchemeHandler>
#include <QWebEngineView>
#include <QWindow>

#include <cstdio>
#include <cstring>
#include <iostream>
#include <unistd.h>

#include "pipewire_audio.h"

namespace {
constexpr auto Prefix = "__SPW__:";

class BundleHandler final : public QWebEngineUrlSchemeHandler {
public:
    explicit BundleHandler(QString root, QObject* parent = nullptr)
        : QWebEngineUrlSchemeHandler(parent), root_(QFileInfo(root).canonicalFilePath()) {}

    void requestStarted(QWebEngineUrlRequestJob* job) override {
        auto relative = QUrl::fromPercentEncoding(job->requestUrl().path().toUtf8());
        while (relative.startsWith('/')) relative.remove(0, 1);
        const auto path = QFileInfo(root_ + "/" + relative).canonicalFilePath();
        if (path.isEmpty() || !path.startsWith(root_ + "/") || !QFileInfo(path).isFile()) {
            job->fail(QWebEngineUrlRequestJob::UrlNotFound);
            return;
        }
        QFile file(path);
        if (!file.open(QIODevice::ReadOnly)) {
            job->fail(QWebEngineUrlRequestJob::RequestFailed);
            return;
        }
        auto* body = new QBuffer(job);
        body->setData(file.readAll());
        body->open(QIODevice::ReadOnly);
        job->reply(QMimeDatabase().mimeTypeForFile(path).name().toLatin1(), body);
    }

private:
    QString root_;
};

class Page final : public QWebEnginePage {
    Q_OBJECT
public:
    explicit Page(QObject* parent = nullptr) : QWebEnginePage(parent) {}
signals:
    void bridgeMessage(const QJsonObject& message);
protected:
    void javaScriptConsoleMessage(JavaScriptConsoleMessageLevel, const QString& message,
                                  int, const QString&) override {
        if (!message.startsWith(Prefix)) return;
        const auto doc = QJsonDocument::fromJson(message.mid(int(std::strlen(Prefix))).toUtf8());
        if (doc.isObject()) emit bridgeMessage(doc.object());
    }
};

class Host final : public QObject {
public:
    Host(const QString& bundle, QObject* parent = nullptr)
        : QObject(parent), bundle_(QFileInfo(bundle).canonicalFilePath()), handler_(bundle_, this) {
        QWebEngineProfile::defaultProfile()->installUrlSchemeHandler("folia", &handler_);
        tray_.setIcon(QIcon::fromTheme("audio-x-generic"));
        tray_.setToolTip("Folia");
        auto* menu = new QMenu;
        menu->addAction("Show / Hide", this, &Host::toggleWindow);
        menu->addAction("Quit", qApp, &QApplication::quit);
        tray_.setContextMenu(menu);
        tray_.show();

        stdinNotifier_ = new QSocketNotifier(fileno(stdin), QSocketNotifier::Read, this);
        connect(stdinNotifier_, &QSocketNotifier::activated, this, &Host::readStdin);
        if (audio_.start()) {
            audioTimer_.setInterval(33);
            connect(&audioTimer_, &QTimer::timeout, this, [this] {
                auto frame = audio_.frame(playing_);
                frame.insert("t", "audio");
                frame.remove("type");
                cacheAndDeliver(frame);
            });
            audioTimer_.start();
        } else emitLine({{"t", "log"}, {"level", "warning"}, {"msg", "PipeWire audio capture unavailable"}});
        emitLine({{"t", "ready"}, {"protocol", 1}});
    }

    void readStdin() {
        char buffer[4096];
        const auto count = ::read(fileno(stdin), buffer, sizeof(buffer));
        if (count <= 0) { qApp->quit(); return; }
        stdinBuffer_.append(buffer, int(count));
        while (true) {
            const auto newline = stdinBuffer_.indexOf('\n');
            if (newline < 0) break;
            const auto line = stdinBuffer_.left(newline).trimmed();
            stdinBuffer_.remove(0, newline + 1);
            const auto doc = QJsonDocument::fromJson(line);
            if (doc.isObject()) handle(doc.object());
        }
    }

private:
    void handle(const QJsonObject& message) {
        const auto type = message.value("t").toString();
        if (type == "hello") { cacheAndDeliver(message); ensureWindow(); return; }
        if (type == "quit") { emitLine({{"t", "closed"}, {"reason", "quit"}}); qApp->quit(); return; }
        if (type == "action" && message.value("action").toString() == "toggle") { toggleWindow(); return; }
        if (type == "state") playing_ = message.value("playing").toBool(false);
        if (type == "state" || type == "lyrics" || type == "track" || type == "settings" || type == "config" || type == "audio")
            cacheAndDeliver(message);
    }

    void ensureWindow() {
        if (view_) { view_->show(); view_->raise(); view_->activateWindow(); return; }
        view_ = new QWebEngineView;
        page_ = new Page(view_);
        view_->setPage(page_);
        connect(page_, &Page::bridgeMessage, this, &Host::fromPage);
        connect(page_, &QWebEnginePage::loadFinished, this, [this](bool ok) {
            pageLoaded_ = ok;
            if (ok) for (const auto& message : latest_.values()) deliver(message);
        });
        QFile shim(bundle_ + "/_host/shim.js");
        if (shim.open(QIODevice::ReadOnly)) {
            QWebEngineScript script;
            script.setName("spw-folia-linux-shim");
            script.setInjectionPoint(QWebEngineScript::DocumentCreation);
            script.setWorldId(QWebEngineScript::MainWorld);
            script.setRunsOnSubFrames(false);
            script.setSourceCode(QString::fromUtf8(shim.readAll()));
            page_->scripts().insert(script);
        } else {
            emitLine({{"t", "log"}, {"msg", "Linux bridge shim missing from web/_host/shim.js"}, {"level", "error"}});
        }
        QWebEngineScript settingsScript;
        settingsScript.setName("spw-folia-settings-ui-loader");
        settingsScript.setInjectionPoint(QWebEngineScript::DocumentCreation);
        settingsScript.setWorldId(QWebEngineScript::MainWorld);
        settingsScript.setRunsOnSubFrames(false);
        settingsScript.setSourceCode(
            "(function(){if(window.top!==window)return;var load=function(){if(document.querySelector('[data-spw-settings-entry]'))return;"
            "var s=document.createElement('script');s.type='module';s.src='folia://app/settings/settings-ui.js';"
            "s.setAttribute('data-spw-settings-entry','');document.head.appendChild(s);};"
            "if(document.head)load();else document.addEventListener('DOMContentLoaded',load,{once:true});})();");
        page_->scripts().insert(settingsScript);
        view_->setAttribute(Qt::WA_DeleteOnClose);
        connect(view_, &QObject::destroyed, this, [this] { view_ = nullptr; page_ = nullptr; });
        view_->resize(1280, 720);
        view_->load(QUrl("folia://app/index.html"));
        view_->show();
    }

    void toggleWindow() {
        if (!view_) { ensureWindow(); return; }
        if (view_->isVisible()) view_->hide();
        else { view_->show(); view_->raise(); view_->activateWindow(); }
    }

    void cacheAndDeliver(const QJsonObject& message) {
        auto pageMessage = message;
        pageMessage.insert("type", pageMessage.value("t"));
        pageMessage.remove("t");
        const auto type = pageMessage.value("type").toString();
        latest_.insert(type, pageMessage);
        if (type == "track" && pageMessage.value("track").isObject()) {
            auto track = pageMessage.value("track").toObject();
            track.insert("type", "track");
            latest_.insert("track", track);
        }
        if (type == "lyrics" && pageMessage.value("lyrics").isObject()) {
            auto lyrics = pageMessage.value("lyrics").toObject();
            lyrics.insert("type", "lyrics");
            latest_.insert("lyrics", lyrics);
        }
        if (pageLoaded_) deliver(pageMessage);
    }

    void deliver(const QJsonObject& message) {
        if (!page_) return;
        const auto json = QString::fromUtf8(QJsonDocument(message).toJson(QJsonDocument::Compact).toBase64());
        page_->runJavaScript(QString("window.__SPW_FOLIA_HOST_DELIVER__ && window.__SPW_FOLIA_HOST_DELIVER__(JSON.parse(atob('%1')))").arg(json));
    }

    void fromPage(const QJsonObject& message) {
        const auto type = message.value("type").toString();
        if (type == "control" || type == "settings" || type == "log") {
            QJsonObject out = message;
            out.insert("t", type);
            emitLine(out);
        } else if (type == "action" && message.value("action").toString() == "close") {
            if (view_) view_->hide();
            emitLine({{"t", "closed"}, {"reason", "page"}});
        }
    }

    static void emitLine(const QJsonObject& object) {
        std::cout << QJsonDocument(object).toJson(QJsonDocument::Compact).toStdString() << std::endl;
    }

    QString bundle_;
    BundleHandler handler_;
    QSystemTrayIcon tray_;
    QSocketNotifier* stdinNotifier_ = nullptr;
    QWebEngineView* view_ = nullptr;
    Page* page_ = nullptr;
    PipeWireAudio audio_;
    QTimer audioTimer_;
    QByteArray stdinBuffer_;
    bool pageLoaded_ = false;
    bool playing_ = false;
    QMap<QString, QJsonObject> latest_;
};
}

int main(int argc, char** argv) {
    if (qEnvironmentVariable("QT_QPA_PLATFORM") != "wayland") {
        std::fprintf(stderr, "spw-folia-host requires QT_QPA_PLATFORM=wayland\n");
        return 3;
    }
    QWebEngineUrlScheme scheme("folia");
    scheme.setSyntax(QWebEngineUrlScheme::Syntax::HostAndPort);
    scheme.setDefaultPort(443);
    scheme.setFlags(QWebEngineUrlScheme::SecureScheme | QWebEngineUrlScheme::LocalScheme |
                    QWebEngineUrlScheme::LocalAccessAllowed | QWebEngineUrlScheme::CorsEnabled);
    QWebEngineUrlScheme::registerScheme(scheme);
    QApplication app(argc, argv);
    QString bundle;
    for (int i = 1; i + 1 < argc; ++i) if (QString::fromLocal8Bit(argv[i]) == "--bundle") bundle = QString::fromLocal8Bit(argv[++i]);
    if (bundle.isEmpty() || !QFileInfo(bundle + "/index.html").isFile()) return 2;
    Host host(bundle);
    return app.exec();
}

#include "main.moc"
