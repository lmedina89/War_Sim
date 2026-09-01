# War Sim v0.4.3.20 — Product Hardening 3: Mobile UI Resilience

Built directly from the accepted v0.4.3.19 Product Hardening 2 baseline. Runtime **0.4.3.20**, world schema **16**, save format **3**, generator **v3**.

## Scope

This release is a mobile usability hardening pass only. Gameplay rules, simulation behavior, RNG, world schema, save format, and career progression are unchanged.

## Changes

- Raised breadcrumb/unit-link mobile touch targets from 36 px to 44 px.
- Raised compact-button touch targets from 40 px to 44 px.
- Raised Inbox compact actions from 36 px-equivalent sizing to 44 px.
- Preserved 16 px form controls to avoid iOS focus zoom.
- Preserved dynamic-viewport dialog sizing and iPhone safe-area handling.
- Added permanent `tests/mobile-resilience.mjs`.
- Added permanent `tests/mobile-resilience-browser.py` covering 320x568, 375x667, 390x844, 430x932, and 932x430 landscape.
- Mobile browser audit exercises Career screens, Soldier subtabs, Unit tabs, Personnel tabs, Orders, More, and Save Manager dialog geometry.
