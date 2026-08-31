# War Sim v0.4.0.3 — Military Visual Identity Overhaul

War Sim v0.4.0.3 is a presentation and interaction release built directly on the known-good v0.4.0.2 simulation foundation. It deliberately does **not** add deployment, combat, new branches, new MOS pipelines, or a save-schema migration. The goal is to make the systems that already work feel like one coherent military personnel and operations application instead of a generic management dashboard.

## What changed

### Persistent Current Situation display
A compact, always-available situation strip now summarizes the player's real canonical state across the five primary views:
- rank and name
- MOS/specialty
- assignment chain
- world date
- personnel status
- assigned/authorized strength
- unit readiness
- unit morale

The strip is derived from existing selectors/indexes; it does not maintain a second copy of gameplay state.

### Military service-record Career presentation
- career identity uses a digital military service-record header
- stable human-readable record references derive from canonical record/person IDs
- existing rank/pay grade/MOS/unit information receives stronger visual hierarchy
- contract, awards/education, and permanent service-record sections can collapse to reduce mobile scrolling
- disclosure state is stored only as local UI preference and never enters canonical world/save state

### Tactical Unit / command presentation
- selected organizations render as a compact command-status block
- personnel fill, vacancies, readiness, and morale use shared military metric components
- chain-of-command browsing remains independent from the Personnel filter
- unit children retain explicit player-unit context
- roster interaction still opens canonical personnel records

### Personnel roster and personnel files
- Personnel view uses denser roster-file rows rather than large repeated cards
- status/readiness/morale use shared generic renderers
- the detailed personnel record includes a dog-tag-inspired identity plate using only real state values
- personnel file shows assignment, condition, assigned primary equipment, proficiency, qualifications, and awards
- assignment breadcrumbs and **Open Unit** provide explicit cross-navigation to the Unit view
- no decorative fake blood type, religion, service number, nation, or other unsupported data is fabricated

### Operations & Orders board
- canonical orders render as military-document records with stable reference numbers
- issue/effective dates and order status use shared presentation primitives
- an order with a valid unit reference can explicitly open that unit in the Unit view
- no deployment/mission details are invented when the simulation does not contain them

### Message Center
- Inbox is presented as a personnel dispatch/message center
- each notification has a stable reference derived from its canonical ID
- unread/read state is visually distinct
- Acknowledge and Archive preserve the v0.4.0.2 notification semantics: clearing read messages archives them rather than deleting canonical history

### AAR / SITREP presentation
- After Action Reports include a stable AAR reference
- time-advance summaries use a stable SITREP-style reference
- performance grades, before/after changes, and significant events keep the existing v0.4.0.2 data-driven feedback system

### Unified presentation definitions
New immutable registries define:
- personnel/unit/order status presentation
- military document presentation metadata

Existing registries continue to define:
- feedback priority/tone
- performance ratings
- relationship bands

Runtime renderers resolve these definitions generically. Normal UI code does not contain Army/11B/rank/weapon content IDs or branch-specific HTML.

### Mobile and accessibility
- more compact personnel density
- fixed navigation continues to respect iPhone safe areas
- narrow screens reflow command metrics, status blocks, and record strips
- long names/assignments are constrained safely
- reduced-motion behavior remains supported
- native buttons remain the primary interaction surface

## Architecture rules preserved

- definitions/registries describe content and presentation
- canonical world entities remain authoritative
- selectors/indexes supply view data
- UI never owns simulation state
- no `Math.random()` in runtime source
- no `innerHTML =`, `eval`, `new Function`, or `document.write`
- stable IDs, not display names, drive logic
- derived indexes are not serialized
- existing Unit and Personnel selection states remain independent
- presentation preferences stay outside save-state schema

## Compatibility

- Save format: **3**
- World schema: **12**
- Runtime version: **0.4.0.3**
- v0.4.0.2 schema-12 saves normalize to 0.4.0.3 without a schema migration
- older supported schema-11 careers still migrate through the existing 11 → 12 pipeline

## Deliberately not included

This is a visual/interaction release. It does not add:
- deployment simulation
- tactical combat
- national/world-map simulation
- new playable MOS pipelines
- new service branches
- logistics/economy systems

Those remain later gameplay milestones so this release can be validated independently from simulation expansion.

## Quality verification

See `SOFTWARE_QUALITY_REPORT.md` for the independent quality audit and packaged-copy verification.
