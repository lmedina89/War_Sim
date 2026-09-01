# War Sim v0.4.3.7 — Software Quality Report

## Release identity

- Version: **0.4.3.7 — Consolidated UI Architecture + Mobile Hardening**
- Baseline: exact packaged **v0.4.3.6**
- World schema: **16**
- Save format: **3**
- Generator: **v3**
- Scope: preserve the v0.4.3.6 Personnel Profile refactor and harden mobile presentation/containment only

## Real-device defect addressed

An iPhone screenshot exposed horizontal overflow in Soldier Identity → Awards & Insignia: a long `WHY EARNED` value for the Army Service Ribbon extended beyond its metric/card boundary.

Root cause was the shared `.mil-metric > strong` rule forcing `white-space: nowrap`. Existing containment rules already supplied `min-width:0` / `overflow-wrap` in several surfaces, but the explicit no-wrap value rule overrode the intended behavior for long dynamic text.

The fix is data-agnostic rather than ribbon-specific:

- shared military metric values now permit normal wrapping and `overflow-wrap:anywhere`;
- Award/Insignia cards explicitly constrain dynamic metric values to their card width;
- Award Catalog copy/title grid children are explicitly shrinkable and wrap safely;
- existing mobile rules for DD214 fields, record strips, situation text, unit metrics, school cards, dialogs, and navigation remain preserved.

No award text was shortened or altered.

## Consolidated architecture scope

The v0.4.3.6 Personnel Profile extraction is retained unchanged. `src/ui/dialogs/personProfile.js` remains presentation-only and canonical state/selector ownership remains behind the `app.js` composition root and injected profile context.

This release does not perform another app.js architecture extraction. That separation is intentional so the mobile hardening has a small, auditable blast radius.

## Automated QA

**PASS — 26/26 test scripts** in the source worktree.

New `tests/mobile-ui-hardening.mjs` permanently checks:

- current runtime/HTML release identity;
- shared military metric values cannot regress to `white-space:nowrap`;
- long Soldier Identity `WHY EARNED` content is generated through the same dynamic metric path;
- insignia cards have explicit width/wrapping containment;
- Award Catalog grid copy/title content is shrinkable/wrappable;
- existing narrow-screen containment gates remain present for record strips, DD214 values, situation text, school titles, unit metrics, and dialogs.

## Full quality harness

`tests/quality.mjs`: **PASS**

- Runtime source modules: **99**
- Deterministic generated worlds validated: **300**
- Synthetic stress population: **10,000 people**
- Observed 10,000-person index build: **10.38 ms** in this container run (informational, environment-dependent)
- Deterministic RNG audit: PASS
- DOM integrity: PASS
- Static import graph: PASS
- Render containment: PASS
- canonical scheduler/opportunity/readiness/activity checks: PASS
- selector/index audits: PASS
- migration/same-schema normalization checks: PASS
- stable record-reference and cross-navigation checks: PASS

## Syntax and source hygiene

- Runtime JS modules: **99**
- Test modules: **26**
- JS/MJS files checked: **125**
- All **125/125** pass `node --check`.
- Static source sweep is clean for `eval(`, `new Function`, `document.write`, and runtime `.innerHTML =` assignment.
- `src/app.js` remains **115,299 bytes / 809 lines**; this release does not grow or restructure it.
- `src/ui/styles.css` is **75,067 bytes / 837 lines** after the containment hardening.

## White-space audit

Remaining `white-space:nowrap` rules were inspected. They are limited to intentional fixed/compact presentation surfaces such as the seed-control button, roster ellipsis rows, fixed navigation labels, timestamps, and desktop duty-history presentation. Existing mobile overrides convert dynamic duty text and situation content to wrapping behavior where required. Dynamic `.mil-metric > strong` values no longer use nowrap.

## Baseline containment

Compared with exact v0.4.3.6, intended runtime changes are limited to:

- `src/ui/styles.css` — mobile/dynamic-text containment fix;
- `src/state/initialState.js` — runtime version stamp only;
- `src/core/migrations.js` — same-schema runtime-version normalization only;
- `index.html` — displayed runtime version only.

`src/app.js`, commands, services, selectors, definitions, and save-system implementation remain unchanged from v0.4.3.6.

Test changes consist of current-version expectation normalization plus the new mobile-hardening suite. README/quality documentation are release metadata.

## Save-system containment

`src/core/saveSystem.js` remains byte-identical.

SHA-256: `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

No save format, save key, slot, checksum, backup, or persistence behavior changed.

## Compatibility and scope

World schema remains **16**, save format remains **3**, and generator remains **v3**. Existing schema-16 saves remain compatible through the existing same-schema normalization path.

No gameplay rules, career progression, awards logic, commands, services, selectors, world generation, or planned v0.4.4 feature work were changed.

## Device verification note

Automated/source-level QA can verify the CSS contract and regression structure, but final Safari viewport/rendering behavior should still be confirmed on the target iPhone. The specific real-device regression to retest is Soldier → Awards → Army Service Ribbon `WHY EARNED`, followed by a quick scan of Catalog, Record/DD214, Personnel Profile, Unit, Orders, and dialogs for horizontal scrolling.

## Exact packaged-artifact verification

The release candidate ZIP was extracted into a clean directory and verified independently after packaging. The extracted artifact passed **26/26 test scripts** and **125/125 JS/MJS syntax checks**. The packaged `quality.mjs` run again validated **300 deterministic generated worlds** and the **10,000-person** stress/index case; the observed packaged-copy index build was **18 ms** in this environment. Archive integrity reported no compressed-data errors.
