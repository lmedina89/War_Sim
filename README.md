# War Sim v0.4.3 — Awards & Soldier Identity

War Sim v0.4.3 expands the existing Army Service Record foundation into a visible soldier-identity layer. It preserves world schema 16, save format 3, generator v3, and the established v0.4.2.2 simulation architecture while extending award definitions, insignia rendering, uniform presentation, loadout-derived combat profiling, mobile disclosure behavior, and a DD214-style service-record preview.

## v0.4.3 highlights

- Runtime **0.4.3**, world schema **16**, save format **3**, generator **v3**.
- Existing `awardRecords` remain canonical. No duplicate uniform-only or DD214-only award store was introduced.
- Award definitions now include precedence, display metadata, eligibility descriptions, DD214 labels, repeatability, and repeat-award device rules.
- Expanded Army-oriented award catalog includes service ribbons/medals, commendations, campaign/service placeholders, combat/special-skill badges, and a tab foundation.
- Reusable SVG insignia renderer draws ribbon patterns, Parachutist/Air Assault/infantry-style badges, tabs, and derived marksmanship qualification badges without image downloads or emoji dependencies.
- Uniform display is generated from canonical awards and current qualification records.
- Repeat awards collapse into one uniform item with a device/count presentation instead of duplicating ribbon-rack slots.
- Service Rifle/Carbine qualification derives Marksman, Sharpshooter, or Expert qualification-badge presentation from the latest qualifying record.
- New Soldier Identity section places **Service Uniform** and **Combat Loadout** together while keeping their semantics separate.
- Combat profile derives Accuracy, Firepower, Mobility, Reliability, and Overall values from actual equipped-weapon statistics, equipment condition, readiness, fatigue, health, and marksmanship qualification.
- Award Catalog shows earned/locked state and the modeled eligibility path for every current award definition.
- DD214-style preview summarizes current service identity, dates, decorations/badges, qualification badge, and military education from canonical state. It is intentionally labeled as a game preview rather than an official DD Form 214 reproduction.
- New-player operational careers receive the Army Service Ribbon on the assumption that initial entry training was completed before operational-unit assignment.
- Army Good Conduct Medal progression is evaluated in three-year qualifying active-enlisted-service blocks.
- AAM/ARCOM commendation foundations can be generated from sustained high performance using deterministic performance-record thresholds.
- Long Career-page Duty Schedule and Opportunities panels are now collapsible to reduce mobile scrolling while preserving the information.

## Architecture rules retained

The release follows an **earn once → record once → display everywhere** rule. School completion can create education, qualification, and award records; the Uniform and Awards displays read those existing records; the DD214-style preview consumes the same canonical records. Renewable weapon qualifications stay in `qualificationRecords` and are rendered as derived qualification insignia rather than being duplicated as permanent awards.

Insignia artwork is presentation-only. Award gameplay logic references metadata such as `display.iconId`, `display.kind`, `precedence`, and `uniformLocation`; the SVG renderer owns the visual geometry. This allows badge/ribbon art to improve later without changing save data.

## Compatibility

v0.4.3 intentionally keeps **world schema 16** because the new fields are definition/presentation metadata and new award records remain compatible with the existing award-record shape. Save-format version remains **3**. Same-schema loaded saves are normalized to runtime version 0.4.3 by the existing migration pipeline.

The previously audited v0.4.2.2 save-recovery defects are **not fixed in this release by request**. Manual-slot backup copies are still written but do not yet have an automatic recovery path, and corrupted save-index reconstruction remains deferred to a later stability patch.

## QA

The release passes all 15 test scripts, including the new awards/soldier-identity regression suite, 300 deterministic generated-world validations, a 10,000-person index stress audit, import/DOM integrity checks, migration and save-storage regressions, service-record tests, mobile UX tests, living-career/unit tests, and gameplay smoke tests. All JS/MJS files pass `node --check`, and the source contains no `eval`, `new Function`, `innerHTML` assignment, or `document.write` usage.
