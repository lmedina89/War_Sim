# War Sim v0.4.3.22 — Product Hardening 5: Interaction & State Consistency

Built directly from the exact verified v0.4.3.21 Product Hardening 4 package. Runtime **0.4.3.22**, world schema **16**, save format **3**, generator **v3**.

## Scope

This release hardens rapid/repeated interaction behavior only. Gameplay rules, simulation outcomes, RNG, world schema, save format, career progression, and the accepted architecture remain unchanged.

## Changes

- Added semantic interaction guards at the controller command boundary so rapid duplicate activation of the same action is suppressed.
- Time advance, activities, opportunities, decisions, school requests, promotion, reenlistment, duty scheduling, and Inbox mutations use stable interaction keys.
- Hardened queued Achievement/Opportunity acknowledgement so a rapid second tap cannot consume the next newly displayed notice.
- Preserved the state store's existing atomic rollback behavior for command failures.
- Added permanent `tests/interaction-state-hardening.mjs`.
- Strengthened `tests/browser-regression.py` with a real rapid duplicate Advance activation check that verifies world time moves only once and only one result dialog is produced.

## Compatibility

Existing compatible saves remain loadable. World schema **16**, save format **3**, and generator **v3** are unchanged.
