# War Sim v0.4.2.1 — School Availability, Service Record Consolidation & Combat-Capability Foundation

War Sim v0.4.2.1 begins the next major gameplay layer after the v0.4.1.x soldier/unit foundation: a durable, definition-driven Army career record that can eventually feed unit capability and conflict simulation. The stable v0.4.1.8 controller/UI architecture is preserved; this release extends it rather than replacing it.

## v0.4.2.1 changes

- Preserves **world schema 15**, **save format 3**, and **generator v3**; this is a same-schema feature/stability update.
- Blocks player-selected home-station activities whenever the player is actively attending military school; selector and command paths both enforce it.
- Groups school graduation with linked qualifications and badges in personnel/service-record presentation while keeping each canonical record separate underneath.
- Makes personnel-profile Recent Career Activity compact, archiveable, restorable, and presentation-only so durable career history is never deleted.
- Hardens Current Situation text wrapping for long MOS/unit chains on narrow mobile screens.
- Adds definition-driven capability, platform-class, and light-infantry doctrine registries for future land/air/sea combat modeling.
- Adds a derived **Unit Capability Inventory** selector and Unit-view panel. Current small-arms effectiveness is traced to real equipment instances, equipment condition, assigned personnel, and operator marksmanship skill.
- Capability output preserves provenance back to contributing Soldier/equipment records and distinguishes assigned, operational, and crewed equipment.
- Supply beyond the current unit condition model, explosives, ground vehicles, armored vehicles, aviation, maritime platforms, mission matching, opposing forces, casualty generation, and battle resolution are intentionally **not** implemented yet; the new foundation is designed for those extensions.
- Retains the full v0.4.2 Army Service Record foundation: military education, school requests/opportunities/orders, deterministic NPC prior-service histories, and schema-14 → 15 migration/backfill.

## Current content represented by the foundation

The first catalog deliberately stays small while the architecture is proven: Airborne School, Basic Leader Course, Service Rifle / Carbine qualification, Airborne qualification, Basic Leader Course graduation, Parachutist Badge, Army Service Ribbon, NCO Professional Development Ribbon, Army Good Conduct Medal, plus the existing campaign/combat definitions retained for future use.

The design is intentionally extensible: future Air Assault, Ranger, Sniper, Sapper, Pathfinder, MOS/specialty courses, badges, tabs, decorations, campaign/service awards, identification badges, weapon qualifications, and other Army credentials can be added through definitions and shared rule engines rather than special-case UI code.

## Architecture direction

The service record is not merely collectible decoration. The intended future chain is:

**school/training/experience → capabilities → individual readiness/proficiency → collective unit capability → mission/conflict resolution → operational history/award eligibility**

Credentials remain separate from underlying capabilities. A Ranger Tab, for example, will be evidence of completed training whose developed capabilities can matter to a future mission; combat will not use arbitrary “badge = +combat” magic numbers.

Unit type, doctrine, personnel mix, leadership, qualifications, collective proficiency, experience, equipment, sustainment, readiness, mission, terrain, enemy, and uncertainty are planned as distinct future combat inputs.

## Compatibility

- Runtime: **0.4.2.1**
- World schema: **15**
- Save format: **3**
- Generator: **v3**

Schema-versioned migration remains authoritative. v0.4.2.1 preserves the deterministic scheduler, qualification history, school absence rules, activity scope, Unit view, save/checksum pipeline, and other verified v0.4.1.8 systems.

See `SOFTWARE_QUALITY_REPORT.md` for exact release-gate results.
