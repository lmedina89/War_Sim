import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../src/ui/render/unitPersonnel.js", import.meta.url), "utf8");

assert.match(app, /createUnitPersonnelRenderer/, "app.js must compose the extracted Unit/Personnel renderer");
assert.match(app, /getSelectedUnitId:\s*\(\) => selectedOrganizationUnitId/, "Unit selection state must stay owned by app.js");
assert.match(app, /getPersonnelFilterUnitId:\s*\(\) => personnelFilterUnitId/, "Personnel filter state must stay owned by app.js");
assert.match(app, /onScheduleUnitDuty:[\s\S]*scheduleUnitDuty\(store, registries, personId, dutyId\)/, "canonical unit-duty command must stay behind an injected callback");
assert.match(app, /onOpenAssignedUnit:[\s\S]*setActiveView\("unit"\)/, "cross-navigation must stay composed in app.js");

for (const forbidden of ["commands", "services", "state", "core", "selectors"]) {
  assert.doesNotMatch(source, new RegExp(`from\\s+["'][^"']*\\/${forbidden}\\/`), `Unit/Personnel renderer must not import ${forbidden} directly`);
}
assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, "Unit/Personnel renderer must use injected UI archive helpers");
assert.doesNotMatch(source, /\.innerHTML\s*=/, "Unit/Personnel renderer must use safe DOM APIs");
assert.match(source, /function renderUnitRoster\(/);
assert.match(source, /function renderPersonnelBrowser\(/);
assert.match(source, /function renderOrganization\(/);
assert.match(source, /archiveUiRecord\("unit-history"/);
assert.match(source, /onScheduleUnitDuty\(personId, duty\.id\)/);
assert.match(source, /onOpenPerson\(member\.id\)/);

assert.doesNotMatch(app, /function renderUnitRoster\(/, "Unit roster DOM construction should no longer live in app.js");
assert.doesNotMatch(app, /function renderPersonnelBrowser\(/, "Personnel browser DOM construction should no longer live in app.js");
assert.doesNotMatch(app, /function renderOrganization\(/, "Unit organization DOM construction should no longer live in app.js");

console.log("War Sim Unit/Personnel presentation extraction QA passed");
