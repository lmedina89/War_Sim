import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../src/ui/render/situation.js", import.meta.url), "utf8");

assert.match(app, /createSituationRenderer/, "app.js must compose the extracted Situation renderer");
assert.match(app, /renderSituation\(state,indexes,state\.playerPersonId\)/, "app.js must still control render orchestration");
assert.match(app, /renderPersistentWorldContext\(state\)/, "app.js must still control persistent world-context render timing");
for (const forbidden of ["commands", "services", "state", "core", "selectors"]) {
  assert.doesNotMatch(source, new RegExp(`from\\s+["'][^"']*\\/${forbidden}\\/`), `Situation renderer must not import ${forbidden} directly`);
}
assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, "Situation renderer must not own persistence");
assert.doesNotMatch(source, /\.innerHTML\s*=/, "Situation renderer must use safe DOM APIs");
assert.match(source, /function renderSituation\(/);
assert.match(source, /function renderPersistentWorldContext\(/);
assert.match(source, /function aggregateStrength\(/);
assert.match(source, /createNamedInsignia\(formationView\.formationInsigniaId/);
assert.match(source, /metricBlock\("PERS", `\$\{strength\.assigned\}\/\$\{strength\.authorized\}`\)/);
assert.doesNotMatch(app, /function renderSituation\(/, "Situation DOM construction should no longer live in app.js");
assert.doesNotMatch(app, /function renderPersistentWorldContext\(/, "Persistent world-context DOM construction should no longer live in app.js");
assert.doesNotMatch(app, /function descendantUnitIds\(/, "app.js should not retain duplicate unit traversal helpers");
assert.doesNotMatch(app, /function aggregateStrength\(/, "app.js should not retain duplicate strength aggregation helpers");
assert.doesNotMatch(app, /function collectUnitPersonnel\(/, "app.js should not retain dead Phase 7 personnel helper copies");
assert.match(app, /const playerAssignmentUnitId = unitPersonnelRenderer\.playerAssignmentUnitId;/, "app.js should reuse the Phase 7 assignment helper rather than duplicate it");

console.log("War Sim Situation / world-context presentation extraction QA passed");
