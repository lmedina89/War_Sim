import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { buildIndexes } from "../src/indexes/buildIndexes.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { saveToSlot, loadFromSlot, listSaveSlots } from "../src/core/saveSystem.js";
import { performActivity } from "../src/commands/performActivity.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { migratePayload } from "../src/core/migrations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const jsFiles = walk(srcRoot).filter(file => file.endsWith(".js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(srcRoot, "app.js"), "utf8");

// Import graph integrity: every relative static import resolves.
for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(file), match[1]);
    assert.ok(fs.existsSync(resolved), `${path.relative(root,file)} has unresolved import ${match[1]}`);
  }
}

// DOM integrity and accessibility basics.
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "index.html must not contain duplicate IDs");
for (const id of [...app.matchAll(/\$\("#([^"]+)"\)/g)].map(m => m[1])) assert.ok(ids.includes(id), `app.js requires missing DOM id #${id}`);
assert.match(html, /viewport-fit=cover/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /aria-current="page"/);
assert.equal([...html.matchAll(/class="game-view" data-view=/g)].length, 5);
assert.ok(ids.includes("return-my-unit") && ids.includes("view-selected-personnel") && ids.includes("personnel-my-unit"), "unit/personnel scope controls must exist");
assert.ok(ids.includes("person-dog-tag"), "personnel identification plate must exist");
assert.match(app, /selectedOrganizationUnitId/, "Unit view must own organization selection state");
assert.match(app, /personnelFilterUnitId/, "Personnel view must own independent filter state");
assert.doesNotMatch(app, /selectedUnitId/, "legacy shared Unit/Personnel selection state must not return");
assert.match(app, /renderUnitRoster\(state, indexes, selectedOrganizationUnitId\)/, "Unit roster must follow selected organization scope");

// Security / containment hygiene: no eval-style execution, document.write, or HTML injection in runtime UI.
for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/, `${path.relative(root,file)} contains dynamic code execution`);
  assert.doesNotMatch(source, /\.innerHTML\s*=/, `${path.relative(root,file)} should use DOM text APIs instead of innerHTML assignment`);
  assert.doesNotMatch(source, /Math\.random\s*\(/, `${path.relative(root,file)} bypasses deterministic RNG`);
}
assert.match(app, /function safeRender\(/, "top-level UI render containment is required");

// Runtime architecture must not know concrete Army/11B/rank/weapon IDs. Data and legacy migration code may.
const runtimeFiles = jsFiles.filter(file => !file.includes(`${path.sep}data${path.sep}`) && !file.endsWith(`${path.sep}core${path.sep}migrations.js`) && !file.endsWith(`${path.sep}services${path.sep}organizationSeed.js`));
const forbiddenConcreteIds = /branch_army|specialty_army_11b|rank_army_[eo]\d|weapon_service_rifle|billet_automatic_rifleman/;
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, forbiddenConcreteIds, `${path.relative(root,file)} contains concrete content IDs that belong in definitions/profiles`);
}

// Selector efficiency guard: hot UI selectors must not scan the entire people collection.
for (const file of walk(path.join(srcRoot, "selectors")).filter(file => file.endsWith(".js"))) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /Object\.values\(state\.entities\.people/, `${path.relative(root,file)} performs a global people scan instead of using indexes`);
}

// Definition and generated-world integrity across a broader seed sweep than smoke tests.
const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));
for (let seed=1001; seed<=1300; seed++) {
  const world = createInitialWorldState({ seed });
  const validation = validateWorldState(world, registries);
  assert.equal(validation.ok, true, `seed ${seed}: ${validation.errors.join(" | ")}`);
  assert.equal(Object.keys(world.entities.billets).length, 91);
  assert.equal(Object.keys(world.entities.people).length, 90);
}

// v0.4 core gameplay integrity: registry-driven skills/activities and deterministic activity outcomes.
assert.equal(registries.skills.size, 5);
assert.ok(registries.activities.size >= 5);
assert.ok(registries.gameplayEvents.size >= 4);
assert.ok(registries.eventTables.size >= 3);
{
  const seed = 404040;
  const a = createStateStore(createInitialWorldState({ seed }));
  const b = createStateStore(createInitialWorldState({ seed }));
  const input = { firstName:"Deterministic", lastName:"Activity", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed };
  createPlayerCareer(a, registries, input); createPlayerCareer(b, registries, input);
  for (let i=0;i<20;i++) { performActivity(a, registries, a.getState().playerPersonId, "activity_pt"); performActivity(b, registries, b.getState().playerPersonId, "activity_pt"); }
  assert.deepEqual(a.getState(), b.getState(), "identical seeds + identical activities must remain deterministic");
  const gameplay = selectGameplay(a.getState(), a.getIndexes(), registries, a.getState().playerPersonId);
  assert.equal(gameplay.recentActivities.length, 5);
  assert.ok(gameplay.skills.find(x=>x.id==="skill_fitness").value > 35);
  assert.equal(validateWorldState(a.getState(), registries).ok, true);
}

// Current schema migration preserves v0.3.2.3 careers and adds skill profiles without regeneration.
{
  const legacy = createInitialWorldState({ seed: 606060 });
  legacy.schemaVersion = 11; legacy.gameVersion = "0.3.2.3";
  delete legacy.entities.skillProfiles; delete legacy.entities.activityRecords; delete legacy.entities.performanceRecords; delete legacy.entities.gameplayEventRecords;
  const beforeNames = Object.values(legacy.entities.people).map(p=>p.identity.displayName);
  const payload = migratePayload({ saveFormatVersion:3, saveId:"quality-legacy", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.3.2.3", worldState:legacy });
  assert.equal(payload.worldState.schemaVersion, 12);
  assert.equal(payload.worldState.gameVersion, "0.4.0.1");
  assert.deepEqual(Object.values(payload.worldState.entities.people).map(p=>p.identity.displayName), beforeNames);
  assert.equal(Object.keys(payload.worldState.entities.skillProfiles).length, Object.keys(payload.worldState.entities.people).length);
  assert.equal(validateWorldState(payload.worldState, registries).ok, true);
}

// Browser-save round trip with an in-memory localStorage stand-in.
{
  const storage = new Map();
  globalThis.localStorage = {
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  };
  const saveStore = createStateStore(createInitialWorldState({ seed: 20260322 }));
  createPlayerCareer(saveStore, registries, { firstName:"Quality", lastName:"Check", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:20260322 });
  const meta = saveToSlot(saveStore.getState(), "slot_01");
  assert.equal(meta.characterName, "Quality Check");
  assert.ok(meta.specialtyId); assert.ok(meta.unitName);
  const loaded = loadFromSlot("slot_01");
  assert.deepEqual(loaded.worldState, saveStore.getState(), "save/load round trip must preserve canonical state");
  assert.equal(listSaveSlots().find(x=>x.slotId==="slot_01").empty, undefined);
  const rawKey = [...storage.keys()].find(k => k.endsWith("slot_01") && !k.includes("backup"));
  const corrupted = JSON.parse(storage.get(rawKey)); corrupted.worldState.world.date = "2099-01-01"; storage.set(rawKey, JSON.stringify(corrupted));
  assert.throws(() => loadFromSlot("slot_01"), /integrity check failed/i);
}

// Index scaling benchmark with 10k people: protects against accidental quadratic index construction.
const large = createInitialWorldState({ seed: 9999 });
const template = Object.values(large.entities.people)[0];
large.entities.people = {};
for (let i=0; i<10000; i++) {
  const id = `stress_person_${String(i).padStart(5,"0")}`;
  large.entities.people[id] = { ...structuredClone(template), id, identity:{...template.identity, displayName:`Stress Person ${i}`} };
}
const started = performance.now();
const indexes = buildIndexes(large);
const elapsedMs = performance.now() - started;
assert.equal(indexes.peopleByUnitId.get(template.affiliation.unitId).length, 10000);
assert.ok(elapsedMs < 2000, `10k-person index build unexpectedly slow: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  result:"PASS",
  sourceFiles:jsFiles.length,
  generatedWorldSeedsValidated:300,
  stressPeople:10000,
  indexBuildMs:Number(elapsedMs.toFixed(2)),
  primaryViews:5,
  deterministicRngAudit:true,
  concreteRuntimeIdAudit:true,
  domIntegrity:true,
  importGraphIntegrity:true,
  renderContainment:true,
  independentUnitPersonnelState:true,
  militaryPresentationDom:true,
  gameplayDefinitions:true,
  deterministicActivities:true,
  selectorIndexAudit:true,
  schema12Migration:true
}, null, 2));
