# War Sim v0.4.0.3 — Software Quality Report

## Executive result

**PASS — approved for live mobile validation.**

v0.4.0.3 is a presentation/interaction release built on the v0.4.0.2 simulation foundation. No world-schema bump was introduced. The audit focused on preventing the visual overhaul from leaking branch-specific content into runtime code, duplicating simulation state, breaking Unit/Personnel scope isolation, regressing save compatibility, or introducing expensive broad scans.

## Release identity

- Runtime version: **0.4.0.3**
- Save format: **3**
- World schema: **12**
- Primary views: **5** — Career, Unit, Personnel, Orders, More
- JavaScript source modules checked: **69**
- JavaScript source lines: approximately **3,293**

## Verification performed

### Syntax and module graph

**PASS**

- every JS/MJS source and test file passed `node --check`
- every relative static import resolves to an existing file
- no broken module references were found

### DOM/controller integrity

**PASS**

The audit confirms:
- no duplicate DOM IDs
- every `app.js` `#id` dependency exists in `index.html`
- all five primary views still exist
- independent Unit/Personnel navigation controls remain present
- Current Situation display exists
- personnel-file reference and assignment breadcrumbs exist
- AAR/SITREP reference field exists
- persisted disclosure controls exist for major collapsible sections

### Data-driven military presentation

**PASS**

New immutable registries provide:
- standard status presentation definitions
- military document presentation definitions

The audit validates required statuses including active, training, deployed, wounded, missing, POW, separated, retired, deceased, executed, and pending.

The audit validates document types including personnel file, order, AAR, notification, service record, unit status, and career record.

The player-facing visual shell contains no hardcoded `DEPARTMENT OF THE ARMY` / `US ARMY` presentation. Personnel authority labels resolve from canonical branch data at runtime.

### Runtime content hardcoding

**PASS**

Normal runtime modules were scanned for concrete content IDs that belong in data definitions/profiles. No forbidden Army/11B/rank/weapon/billet IDs were found outside approved data or legacy migration/repair areas.

### Determinism / safety hygiene

**PASS**

Runtime source contains no:
- direct `Math.random()`
- `eval()`
- `new Function()`
- `document.write()`
- runtime `.innerHTML =`

The deterministic seeded simulation model remains intact.

### Selector/index efficiency

**PASS**

- hot selectors do not globally scan the people collection
- scoped notification/qualification/reenlistment/billet commands retain indexed lookups
- Unit roster and Personnel browsing continue to use derived indexes
- descendant-unit traversal was tightened to cursor-based queue iteration rather than repeated array shifting

Synthetic index stress:
- **10,000 people**
- packaged-copy index build: approximately **11–17 ms** across repeated verification runs
- threshold: **2,000 ms**

### Generated-world integrity

**PASS**

Formal quality suite:
- **300 generated seeds** validated
- no invalid worlds

Additional packaged-copy sweep:
- **1,000 generated seeds** validated
- **0 failures**
- sweep completed in approximately **802 ms** in the verification run

### Gameplay regression coverage

**PASS**

Existing gameplay tests still cover:
- deterministic activities
- skill progression
- activity/performance/event records
- pending decision resolution
- reenlistment
- personnel vacancy/replacement pipeline
- exact-date ETS
- 30×1-day vs 1×30-day personnel consistency
- generated billet-specialty integrity
- low-level billet assignment

### Save / migration integrity

**PASS**

- schema 11 → 12 migration remains valid
- existing schema-12 v0.4.0.2 saves normalize runtime version to v0.4.0.3 without a schema bump
- save/load round trip preserves canonical state
- checksum corruption is rejected
- disclosure/open-state preferences stay in local UI storage and do not enter canonical world/save state

### Notification/history integrity

**PASS**

- read/clear behavior still archives rather than destroys canonical notifications
- active Inbox may be cleared while archived history remains recoverable through canonical records

### Mobile/accessibility presentation checks

**PASS — static/contract checks**

Confirmed in source:
- `viewport-fit=cover`
- iPhone safe-area handling for fixed navigation/status feedback
- reduced-motion media query
- native buttons for interaction
- focus-visible styling
- narrow-screen reflow rules for situation metrics, command metrics, personnel rows, record strips, AARs, and order status blocks

A real-device visual check remains appropriate because static QA cannot perfectly predict Safari layout rendering.

## Visual architecture added

The release adds or strengthens:
- persistent Current Situation strip
- digital military service-record Career header
- tactical Unit command-status block
- dense military roster files
- dog-tag-inspired detailed personnel record using only real state fields
- explicit Personnel → Unit and Order → Unit cross-navigation
- stable human-readable record references derived from canonical IDs
- operations/orders board styling
- personnel message-center styling
- AAR/SITREP document rails
- military status stamps and metric blocks
- remembered disclosure state outside simulation state
- military confirmation-sheet styling

## Deliberate scope boundary

The audit confirms v0.4.0.3 does **not** introduce:
- deployment simulation
- tactical combat
- world map/national simulation
- new playable branches
- new playable MOS pipelines
- logistics/economy systems

This keeps the release a controlled visual/interaction overhaul rather than a simulation rewrite.

## Remaining manual validation

On the live iPhone build, verify:
1. Current Situation strip does not wrap/clip badly on the narrowest screen you use.
2. Personnel roster rows remain readable and tappable.
3. Dog-tag personnel files open, scroll, and cross-navigate to Unit correctly.
4. Orders with unit references can open the correct unit.
5. Career Contract/Awards/Service Record and Personnel Connections remember open/closed state after refresh.
6. AARs, time summaries, Inbox archive behavior, save/load, and bottom navigation still behave normally.

## Final assessment

**Approved for live mobile validation.** No known simulation, save, deterministic-RNG, organization-scope, or data-driven-architecture regression was found in the audited source tree.
