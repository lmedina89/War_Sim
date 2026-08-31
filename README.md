# War Sim v0.4.2 — Army Service Record & Career Achievement Foundation

War Sim v0.4.2 begins the next major gameplay layer after the v0.4.1.x soldier/unit foundation: a durable, definition-driven Army career record that can eventually feed unit capability and conflict simulation. The stable v0.4.1.8 controller/UI architecture is preserved; this release extends it rather than replacing it.

## v0.4.2 changes

- World schema advances to **15** while save format remains **3**. Fresh-world generator advances to **v3**.
- Adds canonical `militaryEducationRecords`, separate from qualifications and awards, so school attendance/graduation has its own durable history.
- School completion now records military education, associated qualifications, awards/badges, dates, source opportunity, and career history without collapsing those concepts into one generic record.
- School definitions now carry reusable, data-driven eligibility rules, opportunity sources, completion effects, and future-facing capability-contribution metadata.
- Adds a **Career Development / Military Schools** catalog showing available, locked, completed, and active schools with prerequisite reasons.
- Eligible players can **Request Volunteer Slot** for a school. Requests enter the same canonical opportunity → orders → attendance → outcome → credential/history pipeline as other opportunity sources.
- Existing random school opportunities remain supported, but now record/explain their opportunity source instead of being the only conceptual path.
- The Career Service Record is reorganized into Military Education, Qualifications, Badges & Tabs, and Ribbons/Medals/Decorations with summary counts.
- NPCs receive deterministic prior-service histories derived from rank, time in service, specialty context, and the world seed. Experienced NCOs no longer universally appear with empty service records.
- Prior-service generation can seed appropriate Army Service Ribbon, service-rifle qualification, Basic Leader Course history, NCO Professional Development Ribbon, Army Good Conduct Medal, and rarer Airborne/Parachutist records while preserving deterministic generation and eligibility constraints.
- Existing schema-14 careers migrate to schema 15, backfill school education history from legacy school-linked qualifications where possible, and deterministically seed plausible NPC prior-service history. The player’s earned history is not fabricated.
- Qualification, school, and award definitions now include stable record-group/capability metadata intended for the future capability engine; v0.4.2 does **not** yet implement combat bonuses from badges.

## Current content represented by the foundation

The first catalog deliberately stays small while the architecture is proven: Airborne School, Basic Leader Course, Service Rifle / Carbine qualification, Airborne qualification, Basic Leader Course graduation, Parachutist Badge, Army Service Ribbon, NCO Professional Development Ribbon, Army Good Conduct Medal, plus the existing campaign/combat definitions retained for future use.

The design is intentionally extensible: future Air Assault, Ranger, Sniper, Sapper, Pathfinder, MOS/specialty courses, badges, tabs, decorations, campaign/service awards, identification badges, weapon qualifications, and other Army credentials can be added through definitions and shared rule engines rather than special-case UI code.

## Architecture direction

The service record is not merely collectible decoration. The intended future chain is:

**school/training/experience → capabilities → individual readiness/proficiency → collective unit capability → mission/conflict resolution → operational history/award eligibility**

Credentials remain separate from underlying capabilities. A Ranger Tab, for example, will be evidence of completed training whose developed capabilities can matter to a future mission; combat will not use arbitrary “badge = +combat” magic numbers.

Unit type, doctrine, personnel mix, leadership, qualifications, collective proficiency, experience, equipment, sustainment, readiness, mission, terrain, enemy, and uncertainty are planned as distinct future combat inputs.

## Compatibility

- Runtime: **0.4.2**
- World schema: **15**
- Save format: **3**
- Generator: **v3**

Schema-versioned migration remains authoritative. v0.4.2 preserves the deterministic scheduler, qualification history, school absence rules, activity scope, Unit view, save/checksum pipeline, and other verified v0.4.1.8 systems.

See `SOFTWARE_QUALITY_REPORT.md` for exact release-gate results.
