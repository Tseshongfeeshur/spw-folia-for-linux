# Archive — historical release evidence

Everything in this directory is **history, not documentation**. It is kept only so that an artifact
published months ago can still be traced to the claims made about it; nothing here describes how the
project works today. Current documentation lives one level up in [`docs/`](../).

If you are looking for how to use or build the plugin, read the [README](../../README.md) instead.
If you want to know what changed in a release, the per-release notes and the downloadable
`.spmod` + `SHA256SUMS.txt` are on [GitHub Releases](https://github.com/tseshongfeeshur/spw-folia/releases),
and [`docs/release.md`](../release.md) keeps a compact artifact ledger.

## Contents

- `release-notes-v*.md` — release bodies for the Windows implementation from v0.1.0 through v0.4.6.
  v0.1.5 is explicitly marked as a local, unpublished build; v0.1.11 is a retrospective note for
  the fix carried into v0.2.0; v0.4.4 was never a release in the original sequence. v0.1.8's notes
  describe a build that was never published. Superseded by the Releases page.
- `verification-v*.md` (13) — per-version end-to-end verification reports (style sweeps, offline and
  packaging assertions, crash repros), including the unpublished v0.1.5 and v0.1.11 local builds. Read
  one when you need the evidence behind a specific fix.
- `verification-live-preview.md` — the task-14 report behind the live settings preview.
- `verification-live-preview-ui.md` — the task-15 follow-up (real renderer inside the settings iframe);
  the historical contract is [`live-preview-iframe.md`](live-preview-iframe.md).
- `plugin-integration.md` — the task-7 write-up of the plugin ↔ helper integration milestone; the
  current contract is [`docs/protocol.md`](../protocol.md).
- `acceptance.md`, `acceptance-run.md`, `acceptance-report.md` — the v0.1.0 QA plan, its mid-flight
  snapshot and the final acceptance matrix.
- `release-candidate.md` — the v0.1.0 release-candidate payload validation (19/19 PASS).
- `hook-poc.md`, `re-host.md` — reverse-engineering notes for the SPW 1.19.0 menu hook; the distilled,
  historical summary is [`hook-target.md`](hook-target.md).
- `webview-spike.md` — the WebView2-vs-JCEF decision record, style scan, DPI and beat-FX findings;
  historical host summary is [`host-app.md`](host-app.md).

Files here are frozen: they keep their original wording and their `docs/<name>.md` cross-links have
been rewritten to `docs/archive/` paths so they still resolve. Do not update them to track code
changes — add a new document under `docs/` instead.

All release notes in this directory describe the former Windows implementation. Mentions of WebView2,
WASAPI, Windows paths, private hooks, transparency, mouse passthrough, queue controls and `.exe` files
are historical facts about those artifacts, not supported features of v0.5.0. The current Linux package
does use the separate public Workshop `HookRegistrar` adapter for its SPW 1.19.3 menu entry; do not
confuse that permissioned API with the private Windows hook documented here.
