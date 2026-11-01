# spw-folia-for-linux project site

This is the repository's static project page. It has no build step and no runtime dependency: GitHub
Pages receives the contents of this directory as-is. A local HTTP server is useful when testing video
range requests, but the page itself is plain HTML, CSS, JavaScript and bundled assets.

The public site is deployed to `https://tseshongfeeshur.github.io/spw-folia-for-linux/` by
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml). The deployment model is documented in
[`docs/github-pages.md`](../docs/github-pages.md).

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Current Linux-only product page, permissions, entry points and installation boundary. |
| `style.css` | Page styling and responsive layout. |
| `main.js` | Style gallery, scroll reveals, counters, lazy video playback and lightbox. |
| `assets/styles/` | Folia style thumbnails used by the gallery. |
| `assets/video/` | Historical visualizer and walkthrough recordings. |
| `assets/stills/` | Historical settings and menu screenshots. |
| `tools/` | Older capture/encoding utilities retained for asset provenance. |

## Important asset note

The videos and screenshots were captured from the former Windows implementation. The current page marks
them as historical material so they are not mistaken for proof of Linux window, tray, transparency or
playback-control behavior. Current support is defined by the root README and `docs/linux-runtime.md`.

The old capture utilities depend on the deleted Windows/WebView2 capture server and are not the Linux
release pipeline. Do not use them as a current build instruction. To rebuild current plugin web assets,
use the Folia checkout at `work/folia/folia-major-main` and the commands in the root README and
`docs/release.md`.

## Local preview

```sh
cd site
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/`. The page is intentionally self-contained and makes no network request
for its rendering or content.

## Licensing

The page text and repository-owned assets are covered by the project license. Folia-rendered images and
videos are derived from the Folia project; see the footer, `LICENSE` and `THIRD_PARTY_NOTICES.md`.
