# War Sim v0.4.3.3.1 — On-Device Career Polish

War Sim v0.4.3.3.1 is a narrow mobile/on-device polish release built directly from the exact packaged v0.4.3.3 baseline. It keeps world schema 16, save format 3, and generator v3. It does not add the planned v0.4.4 interactive-duty framework; it improves clarity and presentation of systems already present in v0.4.3.3.

Runtime **0.4.3.3.1**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.3.1 changes

### DD214-style mobile containment

- Long UNIT and DECORATIONS / BADGES values now wrap inside their DD214-style metric cards instead of running off the right edge on narrow phones.
- DD214 metric containers are explicitly width-contained and use mobile-safe wrapping.

### Promotion progress visibility

- The Records screen now labels the advancement panel **Promotion Progress**.
- Promotion Progress shows CURRENT rank, NEXT rank, and ELIGIBLE / IN PROGRESS status.
- Experience, time in service, and time in grade progress remain visible against their actual requirements.
- Required qualification / PME gates are now listed explicitly with held/missing status.
- Remaining blockers are shown in a dedicated section.
- Career Home now includes a direct **Promotion: <rank> · View Progress / Eligible** control that opens the Records promotion section.

### Relationship readability and provenance

- Trust, Respect, and Rapport continue to use their canonical -100..100 values.
- Signed relationship bars now render around a visible neutral midpoint with a non-linear display displacement, making small early-career differences such as +1, 0, and -2 visually distinguishable without changing the underlying values.
- Recent relationship memories now show the exact recorded Trust / Respect / Rapport deltas that caused a change.
- Existing event definitions already affect these dimensions differently (for example teammate help favors Trust/Rapport while counseling primarily affects Respect); this patch preserves those canonical effects and makes them understandable in the UI.

### Tier-1 NPC Soldier Identity

- Every Digital Personnel Record now displays the Soldier's canonical SVG rank insignia on the personnel identification plate.
- Tier-1 NPCs only receive a **View Uniform** control inside their Digital Personnel Record.
- Their uniform is generated from that NPC's canonical rank, ribbons/medals, badges/tabs, and current rifle qualification. No cosmetic awards are fabricated for display.
- The player continues to use the existing Soldier Identity uniform view; lower-detail Tier-2/3 NPCs do not receive the Tier-1 uniform drill-down.

### Award provenance

- Award selectors now expose the canonical award-record reason.
- Soldier Identity award cards display **WHY EARNED** when a reason exists.
- Career/personnel award records surface award provenance where available.
- New award notifications include the award reason.
- The Army Achievement Medal remains sustained-performance driven: the current model grants one after each eight qualifying performance records scoring 90 or higher. The teammate-help decision does not directly grant an AAM.

### Existing v0.4.3.3 foundation preserved

- Save-index recovery and manual backup restoration.
- Transactional state mutation and rollback behavior.
- Strengthened canonical validation including qualification-attempt records.
- MSG / positional-1SG promotion logic.
- Fresh-start airborne assignment consistency.
- Named formations and formation insignia.
- High-fidelity Army rank SVG library.
- Awards, qualifications, schools, reenlistment, unit readiness, relationships, personnel, orders, service records, and mobile app navigation.

## QA summary

- **21/21** test scripts pass on the final clean rerun.
- New `tests/on-device-polish.mjs` covers DD214 containment rules, promotion-gate exposure, relationship provenance, Tier-1 NPC uniform/rank wiring, and AAM award-reason behavior.
- **300** deterministic generated-world seeds validated.
- **10,000-person** stress/index audit passes.
- Final `quality.mjs` stress index build: approximately **15.31 ms** in this container run.
- **114/114** JS/MJS files pass `node --check`.
- Static production-source sweep finds no `eval`, `new Function`, `.innerHTML =`, or `document.write`.
- `src/core/saveSystem.js` is byte-identical to the exact packaged v0.4.3.3 baseline (SHA-256 `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`).
- A 390×844 headless Chromium smoke attempt again timed out in the container with DBus/headless-environment errors and produced no reliable screenshot; it is explicitly not counted as passed.

## Still intentionally out of scope

v0.4.3.3.1 does not add deployments/combat, new MOS career starts, Ranger/Special Forces selection pipelines, deep equipment, interactive schools, campaign generation, or the reusable interactive duty/event framework planned for v0.4.4.
