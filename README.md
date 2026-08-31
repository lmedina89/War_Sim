# War Sim v0.3.0 — Service Career & Contracts

Built directly on the verified v0.2.1 Unit & Chain of Command checkpoint. This release extends the working career/UI controller rather than replacing it.

## Added

- Generic, data-driven military specialty registry. Army careers display specialties as **MOS** while the underlying model can later support Ratings, AFSCs, and other service terminology.
- Initial Army specialty definitions for **11B Infantryman**, **12B Combat Engineer**, and **92A Automated Logistical Specialist**. 11B is playable now; 12B and 92A remain defined but disabled until compatible training/unit pipelines exist.
- Service component definitions for **Active Duty**, **Army Reserve**, and **Army National Guard**. Active Duty is playable now; Reserve and Guard are framework-ready and intentionally disabled until their organization/service rules are implemented.
- Selectable **3-year, 4-year, and 6-year enlistment contracts**.
- Canonical `contractRecords` with start date, ETS/end date, term, component, specialty, bonus, type, and status.
- Canonical `servicePeriodRecords` so a single Person can retain multiple periods of service over a lifetime.
- Enlistment bonuses derived from specialty data and contract multipliers.
- Player-facing **Service Career** panel showing component, MOS, career field, active contract, ETS, days remaining, and bonus.
- **Reenlistment window** during the final 180 days of a contract.
- Data-driven reenlistment offers with multiple contract lengths and calculated bonuses.
- Accepting an offer creates a new contract record, closes the old contract, creates a permanent career event and reenlistment order, updates the Career Inbox, and preserves history.
- New indexed lookups for contracts, service periods, and reenlistment offers.
- Reserved canonical collections for future MOS-change requests and inter-service transfers: `careerChangeRequestRecords` and `interServiceTransferRecords`.
- World schema **6**, with automatic schema 5 → 6 migration so v0.2.1 saves continue forward.

## Preserved from v0.2.1

- New Career and existing career UX
- Training, time advancement, promotion, Airborne, and BLC
- Achievement popups and Career Inbox
- Six manual save slots plus autosave
- Company → Platoon → Squad organization browser
- My Assignment, Unit Personnel, personnel profiles, readiness/strength views
- Canonical billets and Orders
- Deterministic RNG, canonical world clock, command results, action records, incremental indexes, validation, and migrations

## Architecture rules

Definitions remain immutable registries and runtime records remain normalized and ID-referenced. The player remains a normal Person entity. UI reads through selectors and commands/services own mutations. Historical service and contract records are preserved rather than overwritten. New branch/MOS/component content should be added through definitions and compatible organization/training pipelines instead of hard-coded UI logic.

## Current intentional limits

Only the Army 11B Active Duty path is playable because the current runtime organization is an infantry squad. Other MOSs/components are already represented in data but are disabled in the career form until they have valid billets, training, and organization rules. Inter-service transfer and MOS-change record types are foundational in v0.3.0; their full player workflows come after additional branch/unit definitions exist.

## Next milestone

Expand assignments/duty stations and training pipelines, then enable additional specialties/components and the player-facing MOS-change/inter-service-transfer workflows without breaking the normalized career history model.
