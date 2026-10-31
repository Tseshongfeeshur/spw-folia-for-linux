# Historical Windows runtime requirements

> This page belongs to the archived Windows implementation. It is not a requirement list for the
> current Linux-only package.

The former releases required Windows 10/11 x64, Salt Player for Windows, WebView2 Runtime and .NET
Framework 4.8. Depending on the release, they also required `class-transform`, private menu hooks,
WASAPI loopback and Windows-specific installation paths.

For the current package, read [`../linux-runtime.md`](../linux-runtime.md). It requires Linux x86_64,
Wayland, KDE Plasma, Qt6/QtWebEngine and PipeWire.
