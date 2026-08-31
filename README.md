# War Sim v0.4.3.1 — Mobile App UX Overhaul

War Sim v0.4.3.1 is a presentation-focused follow-up to v0.4.3. It preserves the v0.4.3 Awards & Soldier Identity design language and all canonical simulation systems while reorganizing long browser-style pages into shorter app-style screens. World schema remains 16, save format 3, and generator v3.

## v0.4.3.1 highlights

- Runtime **0.4.3.1**, world schema **16**, save format **3**, generator **v3**.
- Preserves the existing olive/charcoal military visual identity, uniform renderer, SVG ribbons/badges/tabs, card styling, document rails, status treatments, and fixed bottom navigation.
- Career is split into **Home / Actions / Soldier / Records / Inbox** screens so unrelated systems are no longer stacked into one extremely long page.
- Unit is split into **Unit / Roster / Ready / Admin** screens.
- Personnel is split into **Roster / Bonds** screens.
- Soldier Identity is split into **Uniform / Loadout / Awards / Catalog / Record** tabs. The same v0.4.3 uniform, ribbon rack, loadout, insignia cards, award catalog, and DD214-style preview are retained; only one focused identity view is shown at a time.
- App sub-screen selection is presentation-only and remembered through local UI state. It does not alter canonical world/save state.
- Opportunity deep links now automatically switch to the correct Career sub-screen before focusing the referenced record.
- Personnel cross-navigation automatically opens the Roster sub-screen instead of landing on a previously selected relationship screen.
- Inbox unread state is mirrored into the Career Inbox tab while preserving the existing primary Career attention badge.
- Mobile spacing is tighter, the hero is shortened, touch targets remain approximately 44px minimum, and tab strips are horizontally resilient on narrow phones.
- Reduced-motion behavior remains supported.

## Preserved v0.4.3 systems

The v0.4.3 Awards & Soldier Identity architecture is unchanged: canonical `awardRecords`, qualification-derived marksmanship insignia, SVG insignia rendering, repeat-award devices/counts, award eligibility metadata, uniform rendering, loadout-derived combat profile, Army Service Ribbon progression, Good Conduct Medal progression, commendation foundations, and DD214-style preview remain intact.

The architectural rule remains **earn once → record once → display everywhere**. This release changes navigation and presentation, not the source of truth for awards, qualifications, education, service history, equipment, or career state.

## Compatibility

No world-schema change was required. Same-schema careers are normalized to runtime version 0.4.3.1 through the existing migration path. The UI screen/tab choices are local presentation preferences and are intentionally not written into save-game state.

The previously audited v0.4.2.2 save-recovery defects remain deliberately deferred: manual backup copies still lack an automatic restore/fallback path, corrupted save-index reconstruction remains unresolved, and the previously identified validator-hardening work remains future stability scope.

## QA

The packaged release passes **16/16 test scripts**, including a new dedicated mobile-app-navigation regression suite. The core quality suite still validates 300 deterministic generated worlds and a 10,000-person index stress case. All **107 JS/MJS files** in `src/` and `tests/` pass `node --check`. Import graph, DOM integrity, migration, save-storage, award/soldier-identity, service-record, living-career/unit, gameplay, mobile disclosure, and cross-navigation regressions all pass. Source JS contains no `eval`, `new Function`, `innerHTML` assignment, or `document.write` usage.
