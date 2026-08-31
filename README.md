# War Sim v0.4.0.2 — Interaction & Visual Polish

War Sim v0.4.0.2 is a focused presentation, feedback, and efficiency release built on the v0.4.0.1 gameplay foundation. It does not add deployment or tactical combat. Its job is to make the systems already present easier to understand, faster to query, and more satisfying to interact with on mobile.

## Player-facing improvements

- Activity AARs now show **before → after values** and the exact delta for each changed stat/skill.
- Performance grades use definition-driven presentation profiles: Exceptional, Strong, Satisfactory, and Poor.
- Gameplay events use definition-driven presentation profiles so routine, attention, and future critical events can be styled consistently without one-off UI rules.
- Time advancement now reports player-facing summaries such as service time accrued, new notifications/orders, status changes, and unit readiness/morale changes. Raw collection names such as `actionRecords` are no longer shown to the player.
- Routine command/status feedback is now a **temporary toast** instead of permanent text left in page flow.
- The Career navigation tab receives an attention badge for unread notifications and pending player decisions.
- Inbox controls are context-aware: Mark All Read / Clear Read disable when there is nothing applicable.
- Individual notification Mark Read / Clear actions now use the normal command/autosave/feedback pipeline.
- Clearing notifications still **archives** canonical notification records; it does not destroy history.
- Relationship presentation is redesigned from a raw bullet list into compact, tappable squad-connection cards with rank, duty position, relationship type, familiarity, trust, and a definition-driven relationship band.
- Personnel cards are denser and use readiness/morale status chips.
- Personnel profiles are reorganized into military ID, status, assignment, condition, and proficiency sections.
- Subtle command-result highlighting, pressed states, focus states, and reduced-motion support improve responsiveness without heavy animation.
- Empty states are styled intentionally rather than appearing as loose page text.

## Data-driven presentation definitions

New immutable registries:

- `feedbackPresentations`
- `performanceRatings`
- `relationshipBands`

Activities and gameplay events reference presentation definitions by stable ID. Relationship trust labels are resolved from definition ranges rather than hard-coded per person. No player-facing presentation string is authoritative simulation state.

## Efficiency cleanup

Several scoped command paths now use existing derived indexes instead of global collection scans:

- notification bulk read/archive
- school-completion duplicate qualification lookup
- reenlistment-offer lookup/decline
- new-career starting billet lookup
- role-based vacant-billet assignment

Time-advance feedback no longer counts every canonical collection before and after each advance. It uses player-scoped indexes and targeted unit snapshots to produce a semantic summary.

## Compatibility

- Save format: **3**
- World schema: **12** (unchanged)
- Runtime version: **0.4.0.2**
- v0.4.0 / v0.4.0.1 schema-12 saves load without a schema migration and normalize to the current runtime version.
- v0.3.2.3 schema-11 saves still migrate through the existing schema-12 migration path.

## Quality gates

The final source tree is checked by both `tests/smoke.mjs` and `tests/quality.mjs`, including:

- syntax validation for every JS/MJS file
- static import resolution
- DOM/controller ID matching and duplicate-ID checks
- definition/reference validation
- deterministic RNG audit / no direct `Math.random()`
- runtime concrete-content-ID audit
- selector and scoped-command index-use guards
- 300-seed formal generated-world validation
- separate 1,000-seed generated-world sweep
- deterministic activity simulation
- exact squad/player organization integrity
- personnel administration and replacement pipeline
- exact-date ETS behavior
- 30×1-day vs 1×30-day simulation consistency
- semantic time-advance summary tests
- relationship presentation metadata tests
- notification archive/history preservation
- same-schema hotfix version normalization
- save/checksum round trip and corruption rejection
- reduced-motion and safe-area CSS checks
- 10,000-person index stress benchmark
- render-error containment

See `SOFTWARE_QUALITY_REPORT.md` for the separate audit report.

## Roadmap

- **v0.4.0.2** — Interaction & Visual Polish (current)
- **v0.4.1** — Training & Readiness Gameplay
- **v0.4.2** — Career & Personnel Gameplay
- **v0.4.3** — Unit Events & Decision Gameplay
- **v0.4.4** — Deployment Preparation Foundation
- **v0.5.x** — Actual Deployment Gameplay

The architecture rule remains unchanged: definitions describe content and presentation; generic services execute rules; canonical records preserve history; derived indexes serve queries; UI code presents state and invokes commands rather than owning simulation truth.
