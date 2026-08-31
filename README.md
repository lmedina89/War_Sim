# War Sim v0.4.1.5 — Availability, Qualification History & School Effects Hotfix

War Sim v0.4.1.5 is the final planned v0.4.1.x rules-integrity pass before the Army Service Record expansion. It keeps world schema 14 and save format 3 while separating qualification attempts from the active credential, preventing a lower still-current requalification score from erasing a better active record, preventing a Soldier attending military school from simultaneously receiving home-unit training credit, and adding definition-driven school completion effects.

## v0.4.1.5 fixes

- **Qualification history:** every weapon qualification attempt is retained in `qualificationAttemptRecords`; successful active credentials remain separate.
- **No destructive downgrade:** a lower reattempt while the current credential is still valid is recorded as history but does not overwrite the better active qualification. An expired credential can be renewed by the new valid result.
- **School availability:** Soldiers in an active military-school window are absent from incompatible scheduled home-unit duties. Their unit can continue training without awarding the absent Soldier effects, qualification credit, or performance history.
- **School development effects:** school definitions now own completion effects. Airborne School develops fitness/fieldcraft and experience; Basic Leader Course develops leadership/fieldcraft and experience/prestige. This is the seed of the future capability system, not a badge-as-magic-bonus system.
- **Activity scope remains explicit:** player-selected Weapons Qualification Range is explicitly individual; player-selected Squad Drills remains squad-scoped because the task is inherently collective. Scheduled unit qualification continues to include the scheduled unit participants.
- **Architecture preserved:** no deployment/combat system and no schema bump. The service-record/capability expansion remains targeted for v0.4.2+.

## Architecture rules preserved

- immutable definitions describe content and rules
- stable IDs drive logic; display strings do not
- canonical state remains authoritative
- commands/services mutate state
- selectors/view models read state
- UI owns presentation state only
- deterministic RNG is centralized
- normal runtime modules contain no direct `Math.random()`
- no `innerHTML =`, `eval`, `new Function`, or `document.write`
- indexes support scoped queries and are never serialized
- player and NPC personnel use the same canonical Person model
- history records remain durable
- branch/MOS/rank-specific UI hacks are not used

## Quality verification

See `SOFTWARE_QUALITY_REPORT.md` for the full release audit, migration checks, scheduler/opportunity/readiness integration tests, generated-world validation, long-run simulation sweep, save/checksum tests, and packaged-copy verification.
