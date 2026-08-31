import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { generateReenlistmentOffers, acceptReenlistmentOffer } from "../src/commands/reenlistment.js";
import { selectCurrentSquad } from "../src/selectors/selectCurrentSquad.js";
import { selectUnitPersonnel } from "../src/selectors/selectAssignmentView.js";
import { selectServiceCareer } from "../src/selectors/selectServiceCareer.js";
import { migratePayload } from "../src/core/migrations.js";
import { separatePersonAdministrative, processPersonnelAdministration } from "../src/services/personnelAdministration.js";
import { selectPersonnelAdministration } from "../src/selectors/selectPersonnelAdministration.js";
import { assignPersonToBillet } from "../src/commands/assignPersonToBillet.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const id of [...appSource.matchAll(/\$\("#([^"]+)"\)/g)].map(match => match[1])) {
  assert.match(htmlSource, new RegExp(`id=["']${id}["']`), `index.html missing #${id} required by app.js`);
}
assert.match(htmlSource, /WAR SIM · v0\.3\.2\.3/);
assert.match(htmlSource, /id="world-seed"/);
assert.match(htmlSource, /id="reroll-seed"/);
assert.doesNotMatch(appSource, /!assignment\.chain\.some\(x => x\.unitId === selectedUnitId\)/);
assert.equal([...htmlSource.matchAll(/class="game-view" data-view="([^"]+)"/g)].length, 5, "five real primary views must exist");
for (const view of ["career","unit","personnel","orders","more"]) assert.match(htmlSource, new RegExp(`data-view=["']${view}["']`));
assert.match(appSource, /function setActiveView\(/);
assert.doesNotMatch(appSource, /scrollIntoView\(/, "primary navigation must switch views rather than scroll anchors");
assert.match(htmlSource, /id="return-my-unit"/);
assert.match(htmlSource, /id="view-selected-personnel"/);
assert.match(htmlSource, /id="personnel-my-unit"/);
assert.match(htmlSource, /id="person-dog-tag"/);
assert.match(appSource, /selectedOrganizationUnitId/);
assert.match(appSource, /personnelFilterUnitId/);
assert.doesNotMatch(appSource, /selectedUnitId/);
assert.match(appSource, /function collectUnitPersonnel\(/);
assert.match(appSource, /renderUnitRoster\(state, indexes, selectedOrganizationUnitId\)/);

// Generation and simulation randomness must stay centralized; no direct Math.random() calls.
for (const file of fs.readdirSync(path.join(root, "src"), { recursive: true }).filter(name => name.endsWith(".js"))) {
  const source = fs.readFileSync(path.join(root, "src", file), "utf8");
  assert.doesNotMatch(source, /Math\.random\s*\(/, `${file} must not call Math.random()`);
}

const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));
assert.equal(registries.careerStartScenarios.size, 1);
assert.equal(registries.generationProfiles.size, 1);

// Same seed reproduces the same generated world exactly.
const sameA = createInitialWorldState({ seed: 123456789 });
const sameB = createInitialWorldState({ seed: 123456789 });
assert.deepEqual(sameA, sameB, "same seed must reproduce the same generated world");
assert.equal(sameA.schemaVersion, 11);
assert.equal(sameA.gameVersion, "0.3.2.3");
assert.equal(sameA.world.generation.generatorVersion, 1);
assert.equal(Object.keys(sameA.entities.units).length, 13);
assert.equal(Object.keys(sameA.entities.billets).length, 91);
assert.equal(Object.keys(sameA.entities.people).length, 90);
assert.equal(Object.values(sameA.entities.billets).filter(b => b.status === "vacant").length, 1);
assert.equal(new Set(Object.values(sameA.entities.people).map(p => p.identity.displayName)).size, 90);
assert.equal(validateWorldState(sameA, registries).ok, true);

// Different seeds must create meaningful diversity while every generated world remains valid.
const startingUnits = new Set();
const rosterFingerprints = new Set();
for (let seed = 1; seed <= 120; seed++) {
  const world = createInitialWorldState({ seed });
  const validation = validateWorldState(world, registries);
  assert.equal(validation.ok, true, `seed ${seed}: ${validation.errors.join(" | ")}`);
  assert.equal(Object.keys(world.entities.billets).length, 91);
  assert.equal(Object.keys(world.entities.people).length, 90);
  const startBillet = world.entities.billets[world.world.generation.startingBilletId];
  assert.equal(startBillet.status, "vacant");
  assert.equal(startBillet.definitionId, "billet_rifleman");
  startingUnits.add(startBillet.unitId);
  rosterFingerprints.add(Object.values(world.entities.people).slice(0, 8).map(p => p.identity.displayName).join("|"));
}
assert.ok(startingUnits.size >= 7, `expected starting assignment diversity, got ${startingUnits.size} unique squads`);
assert.ok(rosterFingerprints.size >= 100, "different seeds should produce different rosters");

const squadIds = ["unit_sq_11", "unit_sq_001", "unit_sq_13", "unit_sq_21", "unit_sq_22", "unit_sq_23", "unit_sq_31", "unit_sq_32", "unit_sq_33"];

// Explicit seed controls player assignment and roster; player fills exactly the generated vacancy.
const seed = 987654321;
const store = createStateStore(createInitialWorldState({ seed }));
const expectedBilletId = store.getState().world.generation.startingBilletId;
const expectedUnitId = store.getState().entities.billets[expectedBilletId].unitId;
const created = createPlayerCareer(store, registries, {
  firstName: "Luis", lastName: "Medina", branchId: "branch_army", componentId: "component_active",
  specialtyId: "specialty_army_11b", contractDefinitionId: "contract_army_3y", seed
});
assert.equal(created.ok, true);
let state = store.getState();
const player = state.entities.people[state.playerPersonId];
assert.equal(player.affiliation.billetId, expectedBilletId);
assert.equal(player.affiliation.unitId, expectedUnitId);
assert.equal(state.entities.billets[expectedBilletId].assignedPersonId, player.id);
const playerEquipment = state.entities.equipmentInstances[state.entities.loadouts[player.loadoutId].slots.primaryWeaponInstanceId];
assert.equal(playerEquipment.definitionId, registries.billets.get(state.entities.billets[expectedBilletId].definitionId).primaryEquipmentDefinitionId);
assert.equal(Object.keys(state.entities.people).length, 91);
for (const unitId of squadIds) assert.equal(selectUnitPersonnel(state, store.getIndexes(), registries, unitId).length, 9, `${unitId} must have 9 personnel after career creation`);
const squadsContainingPlayer = squadIds.filter(unitId => selectUnitPersonnel(state, store.getIndexes(), registries, unitId).some(p => p.isPlayer));
assert.deepEqual(squadsContainingPlayer, [expectedUnitId]);
const squad = selectCurrentSquad(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(squad.assignedStrength, 9);
assert.equal(squad.members.filter(x => x.isPlayer).length, 1);
assert.equal(validateWorldState(state, registries).ok, true);

// Reusing the same explicit seed with a different player name reproduces the same NPC world and assignment.
const replayStore = createStateStore(createInitialWorldState({ seed: 1 }));
createPlayerCareer(replayStore, registries, { firstName:"Replay", lastName:"Test", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_3y", seed });
const replay = replayStore.getState();
assert.equal(replay.entities.people[replay.playerPersonId].affiliation.billetId, expectedBilletId);
const npcNamesA = Object.values(state.entities.people).filter(p => p.id !== state.playerPersonId).map(p => p.identity.displayName).sort();
const npcNamesB = Object.values(replay.entities.people).filter(p => p.id !== replay.playerPersonId).map(p => p.identity.displayName).sort();
assert.deepEqual(npcNamesA, npcNamesB);

// Existing schema-10 saves migrate forward without regenerating or moving the career.
{
  const legacy = structuredClone(state);
  legacy.schemaVersion = 10;
  legacy.gameVersion = "0.3.2";
  delete legacy.world.generation;
  const beforeUnit = legacy.entities.people[legacy.playerPersonId].affiliation.unitId;
  const payload = migratePayload({ saveFormatVersion:3, saveId:"schema10", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.3.2", worldState:legacy });
  assert.equal(payload.worldState.schemaVersion, 11);
  assert.equal(payload.worldState.gameVersion, "0.3.2.3");
  assert.equal(payload.worldState.entities.people[payload.worldState.playerPersonId].affiliation.unitId, beforeUnit);
  assert.equal(payload.worldState.world.generation.legacyWorld, true);
  assert.equal(validateWorldState(payload.worldState, registries).ok, true);
}

// Existing reenlistment behavior survives the generator refactor.
let service = selectServiceCareer(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.reenlistmentWindowOpen, false);
advanceWorldDays(store, 930);
service = selectServiceCareer(store.getState(), store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.reenlistmentWindowOpen, true);
const offers = generateReenlistmentOffers(store, registries, state.playerPersonId);
assert.equal(offers.data.offerIds.length, 3);
assert.equal(acceptReenlistmentOffer(store, registries, offers.data.offerIds[1]).ok, true);
assert.equal(validateWorldState(store.getState(), registries).ok, true);

// Personnel administration still creates and fills durable vacancies.
{
  const adminSeed = 24680;
  const adminStore = createStateStore(createInitialWorldState({ seed: adminSeed }));
  createPlayerCareer(adminStore, registries, { firstName:"Admin", lastName:"Test", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_3y", seed:adminSeed });
  const adminState = adminStore.getState();
  const npc = Object.values(adminState.entities.people).find(p => p.id !== adminState.playerPersonId && p.affiliation.unitId !== adminState.entities.people[adminState.playerPersonId].affiliation.unitId);
  const vacatedBilletId = npc.affiliation.billetId;
  adminStore.mutate(draft => { separatePersonAdministrative(draft, npc.id, "administrative_separation"); processPersonnelAdministration(draft, registries); }, ["people","billets","history","orders","notifications","career","admin"]);
  let adminView = selectPersonnelAdministration(adminStore.getState(), adminStore.getIndexes(), registries);
  assert.equal(adminStore.getState().entities.billets[vacatedBilletId].status, "vacant");
  assert.equal(adminView.openRequests.some(r => r.billetId === vacatedBilletId), true);
  advanceWorldDays(adminStore, 30);
  adminView = selectPersonnelAdministration(adminStore.getState(), adminStore.getIndexes(), registries);
  assert.equal(adminStore.getState().entities.billets[vacatedBilletId].status, "filled");
  assert.equal(adminView.openRequests.some(r => r.billetId === vacatedBilletId), false);
  const replacementId = adminStore.getState().entities.billets[vacatedBilletId].assignedPersonId;
  const replacement = adminStore.getState().entities.people[replacementId];
  const vacatedDef = registries.billets.get(adminStore.getState().entities.billets[vacatedBilletId].definitionId);
  const replacementEq = adminStore.getState().entities.equipmentInstances[adminStore.getState().entities.loadouts[replacement.loadoutId].slots.primaryWeaponInstanceId];
  assert.equal(replacement.affiliation.branchId, adminStore.getState().entities.units[replacement.affiliation.unitId].branchId);
  assert.ok(registries.specialties.get(replacement.affiliation.specialtyId).eligibleBilletDefinitionIds.includes(adminStore.getState().entities.billets[vacatedBilletId].definitionId));
  assert.equal(replacementEq.definitionId, vacatedDef.primaryEquipmentDefinitionId);
  assert.equal(validateWorldState(adminStore.getState(), registries).ok, true);
}

// ETS is effective on the contract end date, not one day later.
{
  const etsSeed = 777;
  const etsStore = createStateStore(createInitialWorldState({ seed: etsSeed }));
  createPlayerCareer(etsStore, registries, { firstName:"ETS", lastName:"Exact", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_3y", seed:etsSeed });
  const personId = etsStore.getState().playerPersonId;
  const contractId = etsStore.getState().entities.serviceRecords[etsStore.getState().entities.people[personId].serviceRecordId].currentContractId;
  const endDate = etsStore.getState().entities.contractRecords[contractId].endDate;
  const days = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${etsStore.getState().world.date}T00:00:00Z`)) / 86400000);
  advanceWorldDays(etsStore, days);
  assert.equal(etsStore.getState().world.date, endDate);
  assert.equal(etsStore.getState().entities.people[personId].condition.status, "separated");
}

// Monthly personnel simulation is time-step independent for 30x1 day vs 1x30 days.
{
  const stepSeed = 424242;
  const a = createStateStore(createInitialWorldState({ seed: stepSeed }));
  const b = createStateStore(createInitialWorldState({ seed: stepSeed }));
  createPlayerCareer(a, registries, { firstName:"Step", lastName:"A", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:stepSeed });
  createPlayerCareer(b, registries, { firstName:"Step", lastName:"B", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:stepSeed });
  advanceWorldDays(a, 30);
  for (let i=0;i<30;i++) advanceWorldDays(b,1);
  const npcIdsA = Object.keys(a.getState().entities.people).filter(id => id.startsWith("pers_gen_")).sort();
  const npcIdsB = Object.keys(b.getState().entities.people).filter(id => id.startsWith("pers_gen_")).sort();
  assert.deepEqual(npcIdsA, npcIdsB);
  for (const id of npcIdsA) {
    const pa=a.getState().entities.people[id], pb=b.getState().entities.people[id];
    assert.equal(pa.career.experience,pb.career.experience,`${id} XP step independence`);
    assert.equal(pa.condition.fatigue,pb.condition.fatigue,`${id} fatigue step independence`);
    assert.equal(pa.condition.readiness,pb.condition.readiness,`${id} readiness step independence`);
    assert.equal(pa.affiliation.rankId,pb.affiliation.rankId,`${id} rank step independence`);
  }
}

// Low-level assignment uses store.mutate and works with generated billet IDs.
{
  const low = createStateStore(createInitialWorldState({ seed: 555 }));
  const vacant = Object.values(low.getState().entities.billets).find(b => b.status === "vacant");
  const npc = Object.values(low.getState().entities.people).find(p => p.affiliation.unitId !== vacant.unitId);
  assert.equal(assignPersonToBillet(low, registries, npc.id, vacant.id).ok, true);
  assert.equal(low.getState().entities.billets[vacant.id].assignedPersonId, npc.id);
}

console.log("War Sim v0.3.2.3 military interface + unit browsing smoke test passed");
