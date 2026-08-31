# War Sim v0.4.1.1 — Living Unit & Training Tempo Polish

War Sim v0.4.1.1 is a focused living-unit and training-tempo update built on v0.4.1. It preserves the soldier/unit gameplay foundation while making normal garrison life less compressed, NPC participation more visible, qualifications durable, readiness trends inspectable, and the training scheduler explicitly phase-driven.

## Release goal

v0.4.1.1 answers two follow-up questions: **is the training rhythm believable, and can the player see that NPC careers continue around them?**

The release deliberately stops before deployment/combat. Instead it builds the reusable systems that deployment and future operations will consume.

## v0.4.1.1 living-unit additions

- data-driven training phases: Garrison, Elevated Readiness, Pre-Deployment Train-Up, Post-Deployment / Reset, and Operational
- Garrison is the default phase; dense recurring training is reserved for higher-tempo phases
- routine PT is processed as background duty rather than filling the visible major-event calendar
- need-aware scheduling can react to equipment/tactical readiness and expiring qualifications
- finite planning horizons with firm/tentative schedule status
- weekday/weekend-aware schedule placement and priority-based conflict resolution
- renewable service-rifle qualification records with qualification date, expiry date, and performance result
- detailed NPC participation for immediate-unit personnel, including performance, fatigue, skills, readiness, equipment wear/repair, and selected relationship effects
- durable significant unit-event history and readiness snapshots/trends
- explicit player-proximity simulation tiers, refreshed when the player's unit context is established
- non-destructive 30/90/365-day NPC progression audit controls in Developer Diagnostics


## Major gameplay systems

### Canonical duty / schedule system
- new immutable duty definitions drive scheduled PT, weapons qualification, squad drills, maintenance, field exercises, and recovery
- a schedule-template definition creates a rolling unit training cycle
- scheduled duties have canonical records with start/end dates, status, source, and outcome-event references
- focused player activities detect mandatory duty conflicts before consuming time
- accepted school opportunities reserve their own dates and cancel/replace conflicting personal duty participation rather than silently double-booking the soldier
- the scheduler extends its planning horizon as the world advances

### Unit training and calculated readiness
Every runtime unit now has one canonical `unitTrainingProfile` with:
- physical readiness
- weapons proficiency
- tactical proficiency
- cohesion
- discipline
- equipment readiness

A registry-driven readiness model combines:
- personnel fill
- individual readiness
- unit training
- cohesion
- equipment readiness
- fatigue/recovery

The Unit screen exposes the breakdown instead of showing only a decorative readiness percentage.

### Fatigue and recovery
- focused training and scheduled duties can increase fatigue
- passive recovery occurs on unscheduled days
- dedicated recovery activities restore fatigue/readiness/health
- high fatigue blocks focused non-recovery activities
- focused activities have cooldowns and repetition-efficiency penalties

### Soldier performance
- recent activity performance is summarized as a rolling performance index
- activity outcomes continue to use skills, health, morale, readiness, fatigue, deterministic RNG, and performance-rating definitions
- AAR records remain canonical and retain before/after values and effects

### Relationships and cohesion
- collective duties can modify squad relationships through the same generic effect pipeline
- unit cohesion is part of the unit-training model and therefore contributes to calculated readiness
- personnel relationships remain canonical records rather than UI-owned values

### Dynamic events and decisions
- scheduled duties reuse the existing weighted event-table engine
- event effects can now target unit-training components generically, so cohesion/equipment events persist in the readiness model instead of temporarily changing a display number
- blocking player decisions interrupt time advancement
- definition-driven non-blocking decisions can expire to a default choice when a deadline is reached
- decision resolution remains deterministic and recorded

### Career opportunities and actionable orders
Existing v0.4.1 opportunity definitions remain:
- Airborne School volunteer slot
- Basic Leader Course seat

Opportunities are definition-driven and evaluate:
- service time
- rank level
- health
- personnel status
- prior school completion

An accepted opportunity:
1. reserves a conflict-free report window
2. creates canonical military orders
3. progresses `open → accepted → in_progress → completed`
4. changes the soldier to training status while attending
5. completes the existing school/qualification/award pipeline
6. completes the associated order

Declined and expired opportunities remain durable history.

### Career objectives / onboarding
New careers receive canonical objectives such as:
- report to assigned unit
- complete an initial training activity
- build personal readiness
- reach promotion eligibility

Objectives derive completion from canonical state/history and are not separate achievement counters owned by the UI.

### Billet-driven command authority
- command authorities are immutable definitions
- role definitions reference authority IDs
- the UI resolves authority labels through the authority registry
- supported command actions validate the actor's billet/role authority, not a rank-specific UI condition
- a rifleman has no command authority simply because the player controls that character

### Better time advancement
Advancing 1 / 7 / 30 days now processes:
- scheduled duties
- passive recovery
- NPC personnel lifecycle
- vacancies/replacements
- opportunity start/completion/expiration
- career-opportunity generation
- unit-training decay
- calculated readiness updates
- career objectives
- gameplay decisions

Time stops when a blocking decision requires player attention.

## Data-driven architecture additions

New or expanded immutable registries:
- duties
- schedule templates
- readiness models
- career opportunities
- career objectives
- command authorities

Career-start scenarios now define:
- schedule template
- readiness model
- default starting skill value
- starting skill overrides

Generation profiles define the readiness model used by generated units.

No normal runtime logic needs to ask whether the character is specifically Army, 11B, a particular rank, or a particular weapon to run these systems.

## Canonical state additions

World schema **13** adds:
- `unitTrainingProfiles`
- `scheduleRecords`
- `opportunityRecords`
- `objectiveRecords`
- `world.scheduler`

All are durable canonical data. Derived indexes are rebuilt after load and are not serialized.

## UI additions

Career:
- Career Objectives
- Current Duty
- Duty Schedule
- Career Opportunities
- activity availability states / conflict reasons
- recent performance index

Unit:
- calculated Readiness Breakdown
- Billet Command Authority

Current Situation:
- current duty is surfaced alongside existing identity/unit/date/status information

The v0.4.0.3 military visual identity remains intact.

## Compatibility

- Save format: **3**
- World schema: **14**
- Runtime version: **0.4.1.1**
- v0.4.0.3 schema-12 careers migrate through schema 13 to schema 14 without moving the player, regenerating personnel, or replacing existing career/contract/activity history
- older supported saves continue through the existing migration chain

## Deliberately not included

v0.4.1.1 does **not** add:
- deployment simulation
- combat
- enemy forces
- world-map strategy
- national economy / geopolitics
- new playable branches
- a broad MOS expansion

Those remain later milestones. v0.4.1.1 strengthens the living-unit and scheduler foundation they will use.

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
