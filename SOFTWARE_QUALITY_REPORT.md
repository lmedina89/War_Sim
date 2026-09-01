# War Sim v0.4.3.17 — Software Quality Report

## Release

v0.4.3.17 is UI Architecture Refactor Phase 13, built directly from the verified v0.4.3.16 baseline. Runtime **0.4.3.17**, world schema **16**, save format **3**, generator **v3**.

## Scope containment

Phase 13 extracts only the remaining Tier-1 NPC Person Profile uniform presentation and shared award-repeat device label formatting. `getPersonProfileContext()` intentionally remains in `src/app.js` because it is controller-side state/selector composition.

No gameplay rules, command behavior, personnel lifecycle behavior, save schema, world schema, generator behavior, RNG behavior, career progression, or simulation services were changed.

## Architecture additions

- `src/ui/render/personProfileUniform.js`
- `src/ui/awardPresentation.js`
- `tests/person-profile-presentation.mjs`
- deterministic Tier-1 NPC uniform interaction coverage in `tests/browser-regression.py`

The new uniform renderer is dependency-injected and has no direct imports from commands, services, state, core, or selectors. The shared award-device formatter is presentation-only and has no dependencies.

## Worktree verification

- JS/MJS test suites: **39/39 PASS**
- ES-module syntax checks: **154/154 PASS**
- Runtime relative import targets checked: **247**, missing: **0**
- Runtime source modules: **115**
- Circular imports: **0**
- Deterministic generated worlds validated: **300**
- Stress population: **10,000 people**
- Unsafe runtime-code scan (`eval`, `new Function`, `document.write`, `innerHTML =`): **0 hits**
- Save-system SHA-256: `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9` (unchanged)
- App-wide Chromium regression: **81/81 PASS**
- Browser page exceptions: **0**
- Browser console errors: **0**

The Chromium regression uses a fixed world seed and explicitly finds a Tier-1 NPC personnel file, opens **View Uniform**, verifies the uniform is visible and populated, hides it, and closes the profile.

## app.js reduction

- v0.4.3.16: **32,652 bytes / 497 lines**
- v0.4.3.17: **29,714 bytes / 484 lines**

The remaining `app.js` is primarily application orchestration. Further extraction is not recommended merely to reduce line count.

## Exact package verification

The release candidate ZIP was extracted into a fresh directory and independently rerun through the complete gate:

- **39/39** JS/MJS suites PASS
- **154/154** explicit ES-module syntax checks PASS
- **115** runtime JS modules
- **247/247** relative imports resolved; **0** missing
- **0** circular imports
- **300** deterministic generated worlds PASS
- **10,000-person** stress/index audit PASS
- unsafe runtime-code scan: **0 hits**
- save-system SHA-256 unchanged
- deterministic app-wide Chromium regression: **81/81 PASS**
- browser page exceptions: **0**
- browser console errors: **0**

The final ZIP differs from the verified candidate only by this QA-report status text and is subjected to a final clean-extraction gate before release.
