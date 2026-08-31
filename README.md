# War Sim v0.4.3.3 — Save Integrity & Career Consistency

War Sim v0.4.3.3 is a foundation-repair release built directly from the exact packaged v0.4.3.2.2 baseline. It keeps world schema 16, save format 3, and generator v3 while repairing save recovery, strengthening canonical validation, making state mutation transactional, correcting senior-enlisted progression, preventing unqualified fresh Soldiers from starting in an airborne formation, and upgrading Army rank SVG fidelity.

Runtime **0.4.3.3**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.3 changes

### Save recovery and integrity

- Manual save slots no longer depend exclusively on the metadata index. If the index is missing or corrupted, valid slot payloads are rediscovered and their metadata is rebuilt.
- Manual-save backup payloads are now actually used. If a primary manual slot is damaged and its backup is valid, the game can load the backup and restore it to the primary slot.
- Damaged slots remain visible as damaged/recoverable instead of falsely appearing empty.
- `qualificationAttemptRecords` is now a required canonical store.
- Semantic validation now covers formation references and ancestry, loadout/equipment ownership and references, career/promotion records, qualification records, qualification-attempt ranges, award records, and other important canonical relationships.
- Save operations validate world state before writing. The save UI handles write failures locally and reports a usable status message.
- Legacy single-save import now checks actual slot/backup storage before deciding a slot is unused.

### Transactional state mutation

- `stateStore.mutate()` now works on a cloned candidate state and candidate indexes.
- A mutator or index-refresh failure leaves the committed live state and indexes unchanged and does not notify listeners.
- `replaceState()` follows the same build-then-commit principle.
- This safety pass exposed and repaired an older billet-assignment command that had been mutating a captured pre-transaction billet object instead of the draft state.

### Promotion consistency

- Promotion progression now uses explicit `promotionTargetRankId` links instead of assuming every higher hierarchy level is the next automatic promotion.
- Added **Master Sergeant (MSG), E-8** as the normal senior-enlisted progression target from SFC.
- **First Sergeant (1SG), E-8** remains in the registry for existing company leadership billets but is now explicitly positional and is not the automatic promotion after SFC.
- SSG→SFC and SFC→MSG now have meaningful experience, time-in-service, time-in-grade, and current leadership-qualification gates instead of effectively ungated progression.
- 2LT→1LT and 1LT→CPT now have explicit progression gates; CPT is terminal within the currently implemented officer scope.
- Senior promotion thresholds in this build are game progression scaffolding, not a claim to reproduce every current Army centralized-promotion policy rule.

### Formation / airborne consistency

- Fresh unqualified 11B careers no longer start in the **82d Airborne Division**.
- Current fresh-start pool: **7th Infantry Division, 5th Infantry Division, and 193d Infantry Brigade**.
- 82d Airborne Division remains registered and is marked as requiring Airborne qualification for future assignment logic.
- Existing v0.4.3.x careers already assigned to the 82d are preserved for save compatibility; the release does not retroactively move them.
- 75th Ranger Regiment and 7th Special Forces Group remain unavailable as generic starts until proper selection/qualification pipelines exist.

### Rank-insignia fidelity

The uniform remains canonical-`rankId` driven, but the SVG rank library has been redrawn from U.S. Army/TIOH grade-insignia structure for better fidelity at mobile game scale:

- PVT — no grade insignia
- PV2 — one chevron
- PFC — one chevron / one arc
- SPC — eagle-on-shield device
- SGT — three chevrons
- SSG — three chevrons / one arc
- SFC — three chevrons / two arcs
- MSG — three chevrons / three arcs
- 1SG — three chevrons / three arcs / center lozenge
- 2LT — single gold bar
- 1LT — single silver bar
- CPT — joined double silver bars

These are original vector redraws optimized for the game renderer, not embedded raster scans of official insignia artwork.

### Existing v0.4.3.2.2 systems preserved

- Named higher formations and full assignment chains.
- Six historical formation SVG identities and six original future campaign emblems.
- Current Situation mini formation patch.
- Soldier Identity uniform/loadout/awards/catalog/record screens.
- Qualification, school, award, reenlistment, unit readiness, relationships, personnel, orders, and service-record foundations.
- Situation Feed compact/collapsible behavior and mobile app-style navigation.

## QA summary

- **20/20** test scripts pass on a clean rerun.
- New `foundation-repair.mjs` covers transactional rollback, save-index recovery, backup restore, validator strengthening, senior-enlisted progression, terminal/positional rank behavior, fresh-start formation rules, and existing-82d compatibility.
- Dedicated rank/formation tests cover all current rank IDs including MSG and all twelve registered unit/campaign SVG IDs.
- **300** deterministic generated-world seeds validated.
- **10,000-person** stress/index audit passes.
- **113** JS/MJS files pass `node --check`.
- Static production-source sweep passes: no `eval`, `new Function`, `innerHTML =`, or `document.write`.

## Still intentionally out of scope

v0.4.3.3 does not add deployments/combat, new MOS career starts, Ranger/Special Forces selection pipelines, deep equipment, interactive schools, campaign generation, or the planned reusable interactive duty/event framework. Airborne School currently grants its existing qualification/badge; a future reassignment pipeline will be responsible for using that qualification to open airborne assignments.
