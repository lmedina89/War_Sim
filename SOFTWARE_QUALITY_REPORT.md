# War Sim v0.4.3 — Software Quality Report

## Release identity

Runtime: **0.4.3**  
World schema: **16**  
Save format: **3**  
Generator: **v3**  
Release focus: **Awards & Soldier Identity**

## Scope reviewed

The v0.4.3 release was reviewed across syntax, import integrity, definition validation, deterministic generation, state/index behavior, award progression, qualification-derived insignia, uniform rendering architecture, loadout-derived combat profiling, mobile disclosure changes, service-record/DD214 preview generation, migration compatibility, save-storage regression coverage, and existing living-career/unit behavior.

## New implementation

The existing canonical `awardRecords` system was retained and extended through richer award definitions rather than replaced. Award definitions now carry precedence, repeatability, device rules, DD214 labels, eligibility descriptions, and presentation metadata. The new `awardProgression` service centralizes award creation for service and commendation pathways. The `selectSoldierIdentity` selector groups repeated awards, derives the current weapon qualification badge, and builds the loadout combat profile without mutating canonical state.

The presentation layer adds a reusable SVG insignia module. Ribbon patterns are generated from definition data, while badge/tab families use reusable vector geometry. Uniform, Award Catalog, and DD214-style preview displays consume canonical award/qualification/service/education records.

## QA results

**PASS — 15/15 test scripts.**

The existing test suite remained green after the release version normalization and UI changes. The dedicated `awards-soldier-identity.mjs` regression adds checks for expanded award-definition metadata, initial Army Service Ribbon creation, repeat-award grouping, Expert Rifle derived qualification state, Parachutist Badge identity display, three-year Good Conduct Medal progression, idempotent service-award evaluation, Soldier Identity DOM integration, DD214-style preview integration, and safe DOM construction conventions.

The core quality suite also reports:

- 300 generated-world seeds validated.
- 10,000-person index stress audit passed.
- Deterministic RNG audit passed.
- Import graph integrity passed.
- DOM integrity passed.
- Selector/index audit passed.
- Migration audits passed.
- Mobile disclosure-state persistence passed.
- No dynamic-code execution (`eval` / `new Function`).
- No `innerHTML` assignment or `document.write` in source JS.
- 106 JS/MJS files passed syntax checking at release QA time.

## Compatibility assessment

No world-schema bump was required. v0.4.3 keeps schema 16 and save format 3 because award visual/eligibility fields are registry-definition metadata, while newly created award records remain compatible with the established canonical award store. Existing saves therefore do not require record duplication or an award migration solely to render the new UI.

## Known deferred issues

The v0.4.2.2 full software-quality audit identified save-recovery weaknesses. Those issues were intentionally **not addressed in v0.4.3** per product direction. In particular, manual-save backups can still be written without a runtime restore/fallback path, and corrupted save-index recovery remains unresolved. Validator-hardening items from that audit also remain future stability work unless already covered by existing validation.

## Design limitations / future expansion

The current award catalog is a deliberately expanded foundation, not an exhaustive implementation of every historical or modern U.S. Army decoration, badge, tab, campaign, device, and component-specific award. Several catalog entries have modeled eligibility descriptions but intentionally wait on future deployment, combat, Air Assault, Ranger, overseas-tour, or expert-testing systems before becoming earnable. This prevents fake award grants unsupported by the simulation.

The Combat Loadout profile in v0.4.3 is a real derived capability profile, but the game does not yet contain a complete battle-resolution engine that consumes every individual profile statistic. Future combat systems should consume this selector rather than invent parallel equipment bonuses.

## Release decision

**Approved for v0.4.3 packaging.** The new feature layer is compatible with the current architecture, covered by dedicated regression tests, and leaves the requested save-recovery work deferred rather than mixing unrelated stability changes into the feature release.
