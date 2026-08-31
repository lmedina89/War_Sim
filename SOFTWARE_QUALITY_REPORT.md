# War Sim v0.4.3.3 — Software Quality Report

## Scope and baseline

v0.4.3.3 was built from the exact packaged **v0.4.3.2.2** ZIP as the approved Save Integrity & Career Consistency foundation-repair release.

- Runtime: **0.4.3.3**
- World schema: **16**
- Save format: **3**
- World generator: **v3**
- Baseline v0.4.3.2.2 ZIP SHA-256: `713b8aacf7035a042906c989644190c9a4b7e4251ea8e3df40e65ce1f792afbf`

No deployment/combat or unrelated feature expansion was added.

## Major repairs reviewed

### Save recovery

The previous release wrote manual-save backups but never loaded them, and a damaged metadata index could make valid slot payloads appear empty. v0.4.3.3 now:

- reconstructs slot metadata from actual stored payloads;
- exposes damaged/recoverable slots rather than treating them as empty;
- validates primary and backup payloads before acceptance;
- loads a valid manual backup when the primary is invalid;
- attempts to restore the recovered backup to the primary slot;
- keeps autosave behavior separate from manual-backup behavior;
- validates world state before save writes;
- handles manual-save UI failures locally;
- avoids legacy-single-save import decisions based only on a possibly damaged index.

### Validator strengthening

`qualificationAttemptRecords` is now included in required stores. Additional semantic checks cover:

- world and unit formation references;
- unit ancestry cycles;
- loadout equipment references and ownership;
- equipment definition/owner/condition integrity;
- career-event person/date/type integrity;
- promotion-record person/rank/date integrity;
- qualification and qualification-attempt references and numeric ranges;
- award person/definition/date integrity.

### Transactional state mutation

`stateStore.mutate()` and `replaceState()` now build candidate state/indexes and commit only after successful mutation and index refresh. Tests explicitly verify that thrown mutations and invalid index refreshes do not change committed state/indexes or notify subscribers.

During this work, an existing `assignPersonToBillet` stale-reference defect was detected: it mutated a billet captured from pre-transaction state rather than the draft. The command was corrected to obtain and modify the draft billet inside the transaction.

### Promotion consistency

The rank registry now uses explicit promotion targets. Added `rank_army_e8_msg` (Master Sergeant) as the normal E-8 progression target; existing `rank_army_e8` remains First Sergeant for existing positional/billet compatibility and is marked positional/terminal for automatic promotion purposes.

SSG→SFC and SFC→MSG now require meaningful experience/TIS/TIG plus the currently available BLC leadership qualification scaffold. Officer O1→O2 and O2→O3 also have explicit gates; CPT is terminal in current scope. These are gameplay progression gates, not a complete model of all current Army promotion-board policy.

### Airborne formation consistency

82d Airborne Division is no longer eligible for an unqualified generic fresh 11B start. New starts draw only from 7th Infantry Division, 5th Infantry Division, and 193d Infantry Brigade. Existing careers whose canonical saved formation is 82d are deliberately preserved.

75th Ranger Regiment and 7th Special Forces Group remain registered but default-start-ineligible.

### Rank SVG fidelity

Rank SVGs were redrawn to follow official U.S. Army grade-insignia structure, including PVT/no device, PV2/PFC chevron structures, SPC eagle-on-shield, SGT through 1SG chevron/arc arrangements, MSG, 1SG lozenge, and gold/silver officer bars. The implementation is a game-scale vector recreation rather than copied raster artwork.

Primary reference family used during implementation: official U.S. Army rank chart, U.S. Army Institute of Heraldry enlisted-grade descriptions, and Army officer insignia guidance.

## Automated regression results

**20/20 test scripts PASS** on the final clean rerun:

- availability-qualification-history.mjs
- awards-soldier-identity.mjs
- capability-foundation.mjs
- career-continuity.mjs
- formation-identity.mjs
- foundation-repair.mjs
- living-career-polish.mjs
- living-unit.mjs
- migration-qualification-hotfix.mjs
- mobile-app-navigation.mjs
- mobile-polish-compatibility.mjs
- mobile-ux-consolidation.mjs
- quality.mjs
- rank-insignia-situation.mjs
- save-storage.mjs
- service-record-foundation.mjs
- smoke.mjs
- stability-hotfix.mjs
- training-consolidation.mjs
- unit-interaction-integrity.mjs

The new foundation-repair suite verifies transactional rollback, senior promotion targets/gates, positional 1SG behavior, fresh-start formation rules, existing 82d preservation, required qualification-attempt storage, semantic attempt validation, corrupt-index recovery, and primary-slot recovery from manual backup.

## World generation / stress validation

Final `quality.mjs` PASS:

- **300 generated-world seeds validated**
- **10,000 stress personnel**
- final measured index build: approximately **10.57 ms** in this container run
- deterministic RNG audit PASS
- concrete runtime ID audit PASS
- DOM/import/render containment audits PASS
- unit/personnel-state integrity PASS
- canonical scheduler and readiness integration PASS
- selector/index audit PASS
- same-schema hotfix normalization PASS

Fresh-start formation testing confirms all three currently eligible conventional formations occur across seed sweeps while 82d/Ranger/Special Forces do not appear as generic fresh starts.

## Syntax and static-source checks

- **113** JS/MJS files pass `node --check`.
- Static production-source sweep found no:
  - `eval(...)`
  - `new Function(...)`
  - `.innerHTML = ...`
  - `document.write(...)`

## Compatibility notes

- World schema remains **16** and save format remains **3**.
- Existing same-schema v0.4.3.x normalization is retained.
- Existing 82d careers are not forcibly reassigned.
- Existing First Sergeant rank IDs are retained, avoiding destructive rank-ID migration for company first-sergeant records.
- The six historical formation insignia and six fictional campaign emblems from v0.4.3.2.2 remain registered.

## Remaining risks / intentionally deferred work

- A future airborne reassignment pipeline is still needed so earning Airborne qualification can naturally lead to an airborne assignment; this release only prevents inconsistent fresh starts.
- Promotion gates beyond the represented ranks and full centralized-board/sequence-number policy are outside this release.
- Transactional cloning is intentionally correctness-first; current career-size timing remained practical in local testing, but larger future worlds should continue to be profiled.
- The rank SVGs are high-fidelity game-scale redraws, not certified manufacturing artwork or embedded official raster assets.
- Deployment/combat, deep equipment, Ranger/SF selection, interactive schools, campaign generation, and the interactive duty/event framework remain future work.

## Browser-render smoke

A Chromium headless **390×844** launch was attempted against a local HTTP server after the final code changes. Chromium timed out after 25 seconds with DBus/headless container-environment errors and did not produce a reliable screenshot. This check is explicitly **NOT PASSED / environment-limited** and is not counted as successful QA.

## Result

Within the approved v0.4.3.3 repair scope, the final automated regression, save-recovery, transactional-state, promotion, formation-consistency, validation, generation, stress, syntax, and static-source checks pass. On-device iPhone verification remains recommended before replacing the deployed build.
