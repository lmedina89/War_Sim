# War Sim v0.4.3.10.3 — Browser Startup Recovery Hotfix

War Sim v0.4.3.10.3 is built from the exact user-uploaded v0.4.3.10.2 package. It preserves the Phase 5 and Phase 6 UI refactors and repairs the browser-startup regression that left GitHub Pages showing only the static Military Career shell.

Runtime **0.4.3.10.3**, world schema **16**, save format **3**, generator **v3**.

## Fix

Phase 5 extracted UI archive persistence into `src/ui/historyArchive.js`, but the Person Profile controller still required a low-level `writeUiArchive` callback. The controller did not expose `write()` and `src/app.js` passed an undefined `writeUiArchive` identifier while composing the Person Profile controller. Browser execution therefore threw `ReferenceError: writeUiArchive is not defined` before the initial render.

v0.4.3.10.3 exposes the existing history archive `write()` operation and explicitly binds it in `app.js` before Person Profile composition. No gameplay, world-generation, schema, save-format, command, service, selector, or canonical-record behavior changes.

## Verification improvement

A dedicated startup-runtime binding test now verifies the history controller exposes `write()`, verifies round-trip archive persistence, verifies the app composition binding exists before Person Profile construction, and verifies the callback is injected. The final package is additionally exercised in Chromium with the complete application module graph bundled into the browser DOM; the New Career form must visibly render with zero page errors before release.
