# War Sim v0.4.1.6 — Training Results & Schedule Clarity Consolidation

War Sim v0.4.1.6 is the planned consolidation pass for the v0.4.1.x training, scheduling, qualification-result, and availability layer. It keeps world schema 14 and save format 3 while correcting contradictory AAR messaging, making routine Army PT a non-blocking background duty, making true schedule conflicts duration-aware and explainable, and preventing individual training from being presented as a direct collective-unit training gain.

## v0.4.1.6 changes

- **Qualification-aware AARs:** weapon qualification `/40` result is the primary outcome. The generic `/100` training-performance grade is secondary context and can no longer imply that an unqualified attempt passed.
- **Qualification-aware history/messages:** activity history, performance notes, and completion notifications preserve the actual qualified/unqualified result and native score.
- **Outcome-compatible training events:** positive events such as Training Breakthrough and Performance Recognized have definition-driven minimum performance thresholds, preventing a poor result from simultaneously receiving contradictory positive feedback.
- **Routine PT is non-blocking:** routine unit PT is modeled as a background time slice rather than a full-day exclusivity lock. It no longer greys out unrelated focused training.
- **Weekday PT cadence:** garrison/elevated/predeployment routine PT is generated on normal weekdays and kept out of the major-event calendar. Weekend nominal dates are skipped rather than stacked onto Monday.
- **Explicit schedule blocking:** duty definitions own `blocksFocusedActivities`; generated schedule records persist the resolved rule. Significant mandatory events can still block overlapping activities.
- **Explainable conflicts:** activity cards and command errors name the conflicting duty and exact scheduled date/window.
- **Individual vs collective readiness:** player-selected individual PT/range/MOS training develop the Soldier without directly increasing collective unit-training proficiency. Collective activities can still change collective unit proficiency.
- **Causal AAR deltas:** individual activity AARs no longer attribute incidental whole-unit readiness/cohesion recalculation to the individual activity as a direct effect.
- **Background-duty visibility:** the Duty Schedule shows a compact Routine Background Duties summary without crowding the significant-event calendar.
- **School/availability and qualification-history rules from v0.4.1.5 remain intact.**

## Architecture rules preserved

- immutable definition registries and stable IDs
- player and NPCs share the same Person model
- commands/services mutate authoritative state; selectors/view models read
- deterministic seeded RNG; no direct `Math.random()`
- canonical world clock and schema-versioned saves/migrations
- derived indexes are not serialized
- no deployment/combat implementation in this release
- future schools, credentials, unit types, doctrine, capabilities, and combat remain definition-driven rather than special-cased in UI code

## Quality verification

See `SOFTWARE_QUALITY_REPORT.md` for the exact release audit. Automated/static QA cannot prove iPhone Safari pixel rendering; live-device validation remains a separate release check.
