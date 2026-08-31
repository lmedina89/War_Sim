# War Sim v0.3.1 — Living Military Organization

Built directly on the verified v0.3.0 Service Career & Contracts checkpoint. This release expands the military around the player without replacing the proven career/UI controller.

## Added in v0.3.1

- A full **Alpha Company** runtime structure: company HQ, three rifle platoons, and three squads per platoon.
- **91 authorized billets** across the company, with the player's original 2nd Squad IDs preserved for save compatibility.
- Company leadership billets: Company Commander, Executive Officer, First Sergeant, and Company Operations Specialist.
- Platoon HQ billets: Platoon Leader and Platoon Sergeant.
- Expanded rank definitions through SFC/1SG plus 2LT/1LT/CPT so leadership is represented by canonical ranks instead of fake labels.
- Roughly ninety persistent NPC personnel in a new career, all normal Person entities assigned through canonical Billets.
- Existing Unit & Chain of Command UI can now browse other platoons and squads and inspect their personnel.
- Initial **NPC personnel lifecycle**: off-player personnel gain experience as world time advances, readiness/fatigue update, and junior enlisted personnel can progress through early ranks. NPC promotion history is recorded canonically.
- Off-screen personnel use higher simulation tiers, preserving the existing scalability strategy.
- World schema **7** with automatic schema 6 → 7 migration. Existing v0.3.0 careers retain the player's squad/career records while the surrounding company is populated around them.

## Preserved

Everything from v0.3.0 remains: MOS/specialty framework, Active/Reserve/Guard definitions, contracts, ETS, reenlistment offers/bonuses, service periods, Orders, Career Inbox, promotions, schools/awards, relationships, multi-slot saves, deterministic RNG, world clock, validation, migrations, incremental indexes, and the v0.2.x organization UI.

## Architecture rules

Definitions are immutable registries; runtime entities are normalized and ID-referenced. The player is a normal Person. Billets own positions, people fill billets, units own hierarchy, commands/services own mutations, selectors own reads, historical records are append-only, indexes are derived and not serialized, and off-screen simulation must remain tiered. New features extend the stable UI/controller instead of replacing it.

# Long-term roadmap

The roadmap is intentionally ordered so later warfare is driven by real underlying systems rather than disconnected scripted events.

### v0.3.2 — Military Administration & Personnel Actions
Standardize assignment, reassignment, promotion/demotion, PCS, TDY, school, deployment, hospitalization, return-to-duty, separation, retirement, death, and personnel statuses. Route career-changing actions through the canonical Orders pipeline. Add vacancy/replacement and transfer services.

### v0.4.x — MOS, Training & Career Expansion
Enable multiple playable specialties with data-driven prerequisites, training pipelines, schools, qualifications, eligible billets, MOS reclassification, components, and inter-service-transfer workflows. Preserve one Person and continuous service history across changes.

### v0.5.x — Locations, Installations & PCS
Add world → nation → region → installation → facility/location contracts. Give people and units real locations, home stations, PCS/TDY travel, reporting dates, overseas assignments, and deployment origins/destinations.

### v0.6.x — Equipment & Logistics
Expand authorized/on-hand equipment, condition, maintenance, loss/destruction, ammunition, fuel, food, medical supply, spare parts, resupply, and logistics flows. Readiness must derive from real resources rather than arbitrary percentages.

### v0.7.x — Skills, Training & Individual Capability
Add data-driven skills such as marksmanship, fitness, leadership, medical, navigation, tactics, mechanical, communications, driving, and survival. MOS, schools, experience, and training modify capability.

### v0.8.x — Unit Training & Readiness
Model individual/team/squad/platoon/company training and calculate readiness from personnel, equipment, supply, training, leadership, cohesion, and morale.

### v0.9.x — Military AI
Add tiered decision-making for individuals, squads, platoons, companies, and eventually higher headquarters. Keep simulation frequency appropriate to each tier so nation-scale worlds remain practical.

### v1.0 — Nation & Economy
Population, workforce, treasury, revenue/expenses, military budget, industrial capacity, resources, infrastructure, manpower, military payroll, and replacement pools.

### v1.1 — World & Geography
Regions, borders, terrain, cities, roads, infrastructure, strategic locations, distances, and movement contracts. Build the world model before depending on a graphical map.

### v1.2 — Diplomacy & Geopolitics
Nation relationships, alliances, rivalries, treaties, sanctions, territorial disputes, crises, political objectives, and escalation so wars have systemic causes.

### v1.3 — Operational Military Simulation
Battalions, brigades, divisions, corps/armies, missions, command relationships, operational movement, sustainment, deployment, and campaign-level decisions.

### v1.4 — Tactical Combat
Resolve combat from personnel, skills, weapons, ammunition, vehicles, leadership, morale, training, terrain, weather, logistics, unit structure, and orders. Combat should be an outcome of the simulation, not a disconnected minigame.

## North-star career experience

A single persistent character should eventually be able to enlist, choose a specialty, train, join a unit, build relationships, deploy, fight, be wounded, attend schools, promote, lead increasingly large formations, reenlist, reclassify, PCS, transfer components/services, commission, separate, retire, or die while the larger military and world continue evolving around them.
