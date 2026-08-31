# War Sim v0.4.1.7 — Mobile UX & Career Page Consolidation

War Sim v0.4.1.7 is a presentation-focused stabilization update built on the verified v0.4.1.6 training foundation. It keeps **world schema 14** and **save format 3**. The simulation rules from v0.4.1.6 are intentionally preserved; this release focuses on mobile usability, history presentation, and making important career opportunities impossible to miss.

## v0.4.1.7 changes

- **Long Career page reduction**
  - The Activities panel is now a remembered disclosure panel and can be collapsed without losing state.
  - Activity Log shows a short recent preview by default with Show More / Recent Only controls.
  - Recent Unit Training uses the same bounded-preview pattern.
- **Presentation-only archive controls**
  - Individual Activity Log and Recent Unit Training entries can be archived from the current UI, similar to Personnel Dispatches.
  - Archived UI entries do **not** delete or mutate canonical simulation records; archive state is local presentation state scoped to the player.
  - Archived entries can be restored.
- **Routine PT history compression**
  - Repeated Unit Physical Training records are summarized in Recent Unit Training instead of filling the page with one card per routine PT occurrence.
  - The canonical scheduled-duty records remain intact for simulation/history use.
- **Career opportunity visibility and navigation**
  - Major career/school opportunities now join the high-visibility popup queue.
  - The popup action changes to **Open Opportunity** and takes the player directly to the matching opportunity card.
  - Career-opportunity dispatches also expose a working Open Opportunity action.
  - Opening an opportunity highlights the target card briefly.
- **Mobile modal hardening**
  - Long AAR/personnel/save dialogs are bounded by the dynamic mobile viewport and scroll internally.
  - Modal header/Close controls remain reachable while scrolling long content.
  - Safe-area bottom padding is included.
- **Narrow-screen wrapping fixes**
  - Current Duty stacks vertically on narrow phones instead of letting duty name/date fields collide.
  - Long military labels, qualifications, orders, opportunity text, status blocks, and record values wrap rather than spill outside their cards.
  - Activity/duty history rows reflow cleanly on narrow screens.

## Compatibility

- Runtime: **0.4.1.7**
- Save format: **3**
- World schema: **14**
- Existing schema-14 careers are normalized to the current runtime version on load.
- Legacy schema migrations remain supported through the existing migration chain.

## Architecture note

History archiving in this release is deliberately a **UI concern only**. War Sim continues to preserve canonical activity, duty, qualification, career, and notification records so those records remain available to future service-record, capability, readiness, and combat-simulation systems.
