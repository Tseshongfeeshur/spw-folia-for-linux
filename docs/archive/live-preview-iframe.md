# Historical Windows live-preview contract

> This page describes the former WebView2 settings preview. It is kept as historical design evidence,
> not as the current host contract.

The old preview mirrored the Windows playback page's config, clock, lyrics, cover and audio into an
iframe. The Linux implementation keeps the shared settings idea but loads the page in QtWebEngine and
uses the current JSON-lines protocol.

See [`../protocol.md`](../protocol.md).
