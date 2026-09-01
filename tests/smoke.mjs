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
import { performActivity } from "../src/commands/performActivity.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { acceptCareerOpportunity } from "../src/commands/careerOpportunities.js";
import { scheduleUnitDuty } from "../src/commands/scheduleUnitDuty.js";
import { calculateUnitReadiness } from "../src/services/unitReadiness.js";


function advanceResolvingDecisions(store, totalDays) {
  let remaining = totalDays;
  let guard = 0;
  while (remaining > 0) {
    if (++guard > totalDays * 4 + 100) throw new Error("advanceResolvingDecisions guard exceeded");
    const personId = store.getState().playerPersonId;
    const gameplayBefore = personId ? selectGameplay(store.getState(), store.getIndexes(), registries, personId) : null;
    if (gameplayBefore?.pendingDecisions?.length) {
      const decision = gameplayBefore.pendingDecisions[0];
      const choiceId = decision.choices[0]?.id;
      if (!choiceId) throw new Error(`Pending decision ${decision.id} has no choices`);
      const resolved = resolveDecision(store, registries, personId, decision.id, choiceId);
      assert.equal(resolved.ok, true);
      continue;
    }
    const result = advanceWorldDays(store, remaining);
    assert.equal(result.ok, true);
    const advanced = result.data?.days ?? 0;
    assert.ok(advanced > 0, `Expected time to advance, got ${advanced}`);
    remaining -= advanced;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function advanceThroughDays(store, days) {
  let remaining = days;
  let guard = 0;
  while (remaining > 0) {
    if (++guard > days * 4 + 100) throw new Error("advanceThroughDays guard exceeded");
    const result = advanceWorldDays(store, remaining);
    remaining -= result.data.days;
    if (result.code === "time_interrupted") {
      const state = store.getState();
      const personId = state.playerPersonId;
      const decision = selectGameplay(state, store.getIndexes(), registries, personId).pendingDecisions[0];
      if (!decision) throw new Error("Time interrupted without a pending decision.");
      resolveDecision(store, registries, personId, decision.id, decision.choices[0].id);
    }
  }
}
const appSource = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const domSource = fs.readFileSync(path.join(root, "src/ui/dom.js"), "utf8");
const navigationSource = fs.readFileSync(path.join(root, "src/ui/navigation.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const id of [...`${appSource}\n${domSource}`.matchAll(/\$\("#([^"]+)"\)/g)].map(match => match[1])) {
  assert.match(htmlSource, new RegExp(`id=["']${id}["']`), `index.html missing #${id} required by app.js`);
}
assert.match(htmlSource, /WAR SIM · v0\.4\.3/);
assert.match(htmlSource, /id="world-seed"/);
assert.match(htmlSource, /id="reroll-seed"/);
assert.doesNotMatch(appSource, /!assignment\.chain\.some\(x => x\.unitId === selectedUnitId\)/);
assert.equal([...htmlSource.matchAll(/class="game-view" data-view="([^"]+)"/g)].length, 5, "five real primary views must exist");
for (const view of ["career","unit","personnel","orders","more"]) assert.match(htmlSource, new RegExp(`data-view=["']${view}["']`));
assert.match(navigationSource, /function setActiveView\(/);
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
assert.equal(sameA.schemaVersion, 16);
assert.equal(sameA.gameVersion, "0.4.3.10.3");
assert.equal(sameA.world.generation.generatorVersion, 3);
assert.equal(Object.keys(sameA.entities.units).length, 13 + registries.formations.get(sameA.world.formationIdentityId).lineage.length);
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
  assert.equal(payload.worldState.schemaVersion, 16);
  assert.equal(payload.worldState.gameVersion, "0.4.3.10.3");
  assert.equal(payload.worldState.entities.people[payload.worldState.playerPersonId].affiliation.unitId, beforeUnit);
  assert.equal(payload.worldState.world.generation.legacyWorld, true);
  assert.equal(validateWorldState(payload.worldState, registries).ok, true);
}

// Existing reenlistment behavior survives the generator refactor.
let service = selectServiceCareer(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.reenlistmentWindowOpen, false);
advanceResolvingDecisions(store, 930);
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
  advanceResolvingDecisions(adminStore, 30);
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
  advanceResolvingDecisions(etsStore, days);
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
  advanceResolvingDecisions(a, 30);
  for (let i=0;i<30;i++) advanceResolvingDecisions(b,1);
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

// Data-driven activity gameplay consumes time, improves skills, records history, and remains valid.
{
  const gameplaySeed = 86420;
  const gameplayStore = createStateStore(createInitialWorldState({ seed: gameplaySeed }));
  createPlayerCareer(gameplayStore, registries, { firstName:"Game", lastName:"Play", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:gameplaySeed });
  const personId = gameplayStore.getState().playerPersonId;
  const before = selectGameplay(gameplayStore.getState(), gameplayStore.getIndexes(), registries, personId);
  assert.equal(before.activities.length, registries.activities.size);
  const marksmanshipBefore = before.skills.find(s => s.id === "skill_marksmanship").value;
  const dateBefore = gameplayStore.getState().world.date;
  const result = performActivity(gameplayStore, registries, personId, "activity_range");
  assert.equal(result.ok, true);
  const after = selectGameplay(gameplayStore.getState(), gameplayStore.getIndexes(), registries, personId);
  assert.ok(after.skills.find(s => s.id === "skill_marksmanship").value > marksmanshipBefore);
  assert.equal(after.recentActivities[0].activityDefinitionId, "activity_range");
  assert.notEqual(gameplayStore.getState().world.date, dateBefore);
  assert.equal(Object.keys(gameplayStore.getState().entities.performanceRecords).length, 1);
  assert.equal(validateWorldState(gameplayStore.getState(), registries).ok, true);
}

// Skill profiles exist exactly once for every generated/replacement person.
{
  const world = createInitialWorldState({ seed: 919191 });
  assert.equal(Object.keys(world.entities.skillProfiles).length, Object.keys(world.entities.people).length);
  assert.equal(new Set(Object.values(world.entities.skillProfiles).map(p => p.personId)).size, Object.keys(world.entities.people).length);
}


// Generated billet specialty assignments are driven by generation-profile definitions.
{
  const world = createInitialWorldState({ seed: 13579 });
  for (const person of Object.values(world.entities.people)) {
    const billet = world.entities.billets[person.affiliation.billetId];
    const profile = registries.generationProfiles.get(world.world.generation.generationProfileId);
    const expectedSpecialtyId = profile.billetSpecialtyIdsByDefinitionId[billet.definitionId];
    assert.equal(person.affiliation.specialtyId, expectedSpecialtyId, `${person.id} specialty must match billet mapping`);
  }
}

// Generic decision records resolve through definition choices and effects.
{
  const decisionSeed = 112233;
  const decisionStore = createStateStore(createInitialWorldState({ seed: decisionSeed }));
  createPlayerCareer(decisionStore, registries, { firstName:"Choice", lastName:"Test", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:decisionSeed });
  const personId = decisionStore.getState().playerPersonId;
  const beforeLeadership = selectGameplay(decisionStore.getState(), decisionStore.getIndexes(), registries, personId).skills.find(s => s.id === "skill_leadership").value;
  const eventId = "gameevt_test_choice";
  decisionStore.mutate(draft => { draft.entities.gameplayEventRecords[eventId] = { id:eventId, schemaVersion:1, definitionId:"event_training_leadership_moment", personId, unitId:draft.entities.people[personId].affiliation.unitId, activityId:"activity_squad_drills", gameDate:draft.world.date, elapsedDays:draft.world.clock.elapsedDays, status:"pending", selectedChoiceId:null, resolvedDate:null }; }, ["activities"]);
  assert.equal(selectGameplay(decisionStore.getState(), decisionStore.getIndexes(), registries, personId).pendingDecisions.length, 1);
  assert.equal(resolveDecision(decisionStore, registries, personId, eventId, "choice_help_teammate").ok, true);
  const after = selectGameplay(decisionStore.getState(), decisionStore.getIndexes(), registries, personId);
  assert.equal(after.pendingDecisions.length, 0);
  assert.ok(after.skills.find(s => s.id === "skill_leadership").value >= beforeLeadership + 2);
  assert.equal(validateWorldState(decisionStore.getState(), registries).ok, true);
}

// Low-level assignment uses store.mutate and works with generated billet IDs.
{
  const low = createStateStore(createInitialWorldState({ seed: 555 }));
  const vacant = Object.values(low.getState().entities.billets).find(b => b.status === "vacant");
  const npc = Object.values(low.getState().entities.people).find(p => p.affiliation.unitId !== vacant.unitId);
  assert.equal(assignPersonToBillet(low, registries, npc.id, vacant.id).ok, true);
  assert.equal(low.getState().entities.billets[vacant.id].assignedPersonId, npc.id);
}



// v0.4.2.1 career-gameplay foundation: schedule, objectives, cooldowns, readiness, opportunities, deadlines, and billet authority.
{
  const seed = 410001;
  const gameStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(gameStore, registries, { firstName:"V041", lastName:"Gameplay", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = gameStore.getState().playerPersonId;
  let gameplay = selectGameplay(gameStore.getState(), gameStore.getIndexes(), registries, personId);
  assert.equal(gameplay.objectives.length, registries.careerObjectives.values().filter(def => def.phase === "onboarding").length);
  assert.ok(gameplay.objectives.some(item => item.definitionId === "objective_report_unit" && item.status === "completed"));
  assert.ok(gameplay.upcomingSchedule.length >= 2, "new careers must expose meaningful significant duties without showing every routine background event");
  assert.equal(Object.keys(gameStore.getState().entities.unitTrainingProfiles).length, Object.keys(gameStore.getState().entities.units).length);
  const activeSchedule = (gameStore.getIndexes().scheduleRecordsByPersonId.get(personId) ?? []).map(id => gameStore.getState().entities.scheduleRecords[id]).filter(r => ["scheduled","in_progress"].includes(r.status)).sort((a,b)=>a.startElapsedDay-b.startElapsedDay);
  assert.ok(activeSchedule.length >= 6, "canonical schedule must still contain routine background duties");
  assert.ok(activeSchedule.some(record => record.calendarVisibility === "background"), "canonical schedule must retain background duties");
  const blockingSchedule=activeSchedule.filter(record=>record.blocksFocusedActivities !== false && record.calendarVisibility !== "background");
  for (let i=1;i<blockingSchedule.length;i++) assert.ok(blockingSchedule[i-1].endElapsedDay < blockingSchedule[i].startElapsedDay, `blocking schedule overlap ${blockingSchedule[i-1].id}/${blockingSchedule[i].id}`);

  const readinessBefore = calculateUnitReadiness(gameStore.getState(), gameStore.getIndexes(), registries, gameStore.getState().entities.people[personId].affiliation.unitId);
  assert.ok(readinessBefore && Object.keys(readinessBefore.components).length === 6);
  assert.equal(performActivity(gameStore, registries, personId, "activity_pt").ok, true);
  gameplay = selectGameplay(gameStore.getState(), gameStore.getIndexes(), registries, personId);
  const pt = gameplay.activities.find(item => item.id === "activity_pt");
  assert.equal(pt.eligible, false);
  assert.equal(pt.availabilityState, "recovering");
  assert.ok(pt.cooldownRemaining >= 1);
  assert.throws(() => performActivity(gameStore, registries, personId, "activity_pt"), /cooldown/i);
  assert.ok(gameplay.objectives.some(item => item.definitionId === "objective_complete_training" && item.status === "completed"));
  assert.equal(validateWorldState(gameStore.getState(), registries).ok, true);
}

// Career opportunities appear through time, create actionable school orders, reserve school dates,
// cancel only conflicting personal duty participation, and complete through normal time advancement.
{
  const seed = 410002;
  const opportunityStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(opportunityStore, registries, { firstName:"School", lastName:"Pipeline", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = opportunityStore.getState().playerPersonId;
  advanceResolvingDecisions(opportunityStore, 46);
  let gameplay = selectGameplay(opportunityStore.getState(), opportunityStore.getIndexes(), registries, personId);
  const airborne = gameplay.opportunities.find(item => item.definitionId === "opportunity_airborne_school" && item.status === "open");
  assert.ok(airborne, "Airborne opportunity should appear after its service requirement");
  const acceptedAt = opportunityStore.getState().world.clock.elapsedDays;
  const accept = acceptCareerOpportunity(opportunityStore, registries, airborne.id);
  assert.equal(accept.ok, true);
  gameplay = selectGameplay(opportunityStore.getState(), opportunityStore.getIndexes(), registries, personId);
  const accepted = gameplay.opportunities.find(item => item.id === airborne.id);
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.reportElapsedDay, acceptedAt + registries.opportunities.get(accepted.definitionId).reportDelayDays, "school orders should honor their report-delay rule instead of waiting for a huge schedule gap");
  assert.ok(Object.values(opportunityStore.getState().entities.scheduleRecords).some(record => record.personId === personId && record.status === "cancelled" && record.replacedByOpportunityRecordId === airborne.id), "school orders should cancel conflicting personal duty participation");
  const schoolOrder = opportunityStore.getState().entities.orderRecords[accepted.orderId];
  assert.equal(schoolOrder.status, "pending");
  advanceResolvingDecisions(opportunityStore, accepted.reportElapsedDay - opportunityStore.getState().world.clock.elapsedDays);
  assert.equal(opportunityStore.getState().entities.opportunityRecords[airborne.id].status, "in_progress");
  assert.equal(opportunityStore.getState().entities.orderRecords[accepted.orderId].status, "executing");
  const remaining = opportunityStore.getState().entities.opportunityRecords[airborne.id].completeElapsedDay - opportunityStore.getState().world.clock.elapsedDays;
  if (remaining > 0) advanceResolvingDecisions(opportunityStore, remaining);
  assert.equal(opportunityStore.getState().entities.opportunityRecords[airborne.id].status, "completed");
  assert.equal(opportunityStore.getState().entities.orderRecords[accepted.orderId].status, "completed");
  assert.ok(Object.values(opportunityStore.getState().entities.qualificationRecords).some(record => record.personId === personId && record.schoolId === "school_airborne"));
  assert.equal(validateWorldState(opportunityStore.getState(), registries).ok, true);
}

// Non-blocking decisions can expire to a definition-driven default, while blocking decisions still halt time.
{
  const seed = 410003;
  const deadlineStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(deadlineStore, registries, { firstName:"Decision", lastName:"Deadline", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = deadlineStore.getState().playerPersonId;
  deadlineStore.mutate(draft => { draft.entities.gameplayEventRecords.gameevt_deadline = { id:"gameevt_deadline", schemaVersion:2, definitionId:"event_squad_friction", personId, unitId:draft.entities.people[personId].affiliation.unitId, activityId:"duty_squad_drills", gameDate:draft.world.date, elapsedDays:draft.world.clock.elapsedDays, status:"pending", selectedChoiceId:null, resolvedDate:null, expiresElapsedDay:draft.world.clock.elapsedDays+2 }; }, ["activities"]);
  const result = advanceWorldDays(deadlineStore, 2);
  assert.equal(result.code, "time_advanced", "non-blocking decision deadlines must not freeze time");
  const event = deadlineStore.getState().entities.gameplayEventRecords.gameevt_deadline;
  assert.equal(event.status, "resolved");
  assert.equal(event.selectedChoiceId, registries.gameplayEvents.get(event.definitionId).defaultChoiceId);
  assert.equal(event.resolutionSource, "deadline_default");
}

// Command actions are granted by billet-role authority metadata, not by rank-specific command code.
{
  const seed = 410004;
  const authorityStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(authorityStore, registries, { firstName:"Authority", lastName:"Check", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const playerId = authorityStore.getState().playerPersonId;
  assert.throws(() => scheduleUnitDuty(authorityStore, registries, playerId, "duty_pt"), /does not authorize/i);
  const leader = Object.values(authorityStore.getState().entities.people).find(person => {
    const billet = authorityStore.getState().entities.billets[person.affiliation.billetId];
    const def = billet ? registries.billets.get(billet.definitionId) : null;
    const role = def ? registries.roles.get(def.roleId) : null;
    return (role?.authorityIds ?? []).includes("authority_schedule_unit_training");
  });
  assert.ok(leader, "generated organization should contain an authorized leader");
  const scheduled = scheduleUnitDuty(authorityStore, registries, leader.id, "duty_pt");
  assert.equal(scheduled.ok, true);
  const record = authorityStore.getState().entities.scheduleRecords[scheduled.data.scheduleRecordId];
  assert.equal(record.personId, leader.id);
  assert.equal(record.sourceType, "command");
  assert.equal(validateWorldState(authorityStore.getState(), registries).ok, true);
}

// Schema-12 careers migrate into v0.4.2.1 without moving the player, and receive the new gameplay scaffolding.
{
  const seed = 410005;
  const sourceStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(sourceStore, registries, { firstName:"Legacy", lastName:"Twelve", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const legacy = structuredClone(sourceStore.getState());
  legacy.schemaVersion = 12; legacy.gameVersion = "0.4.0.3"; legacy.world.scheduler = null;
  delete legacy.entities.unitTrainingProfiles; delete legacy.entities.scheduleRecords; delete legacy.entities.opportunityRecords; delete legacy.entities.objectiveRecords;
  for (const unit of Object.values(legacy.entities.units)) delete unit.readinessModelId;
  const beforeUnit = legacy.entities.people[legacy.playerPersonId].affiliation.unitId;
  const payload = migratePayload({ saveFormatVersion:3, saveId:"schema12-v041", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.4.0.3", worldState:legacy });
  assert.equal(payload.worldState.schemaVersion, 16);
  assert.equal(payload.worldState.gameVersion, "0.4.3.10.3");
  assert.equal(payload.worldState.entities.people[payload.worldState.playerPersonId].affiliation.unitId, beforeUnit);
  assert.equal(Object.keys(payload.worldState.entities.unitTrainingProfiles).length, Object.keys(payload.worldState.entities.units).length);
  assert.ok(Object.values(payload.worldState.entities.scheduleRecords).some(record => record.personId === payload.worldState.playerPersonId));
  assert.equal(Object.values(payload.worldState.entities.objectiveRecords).filter(record => record.personId === payload.worldState.playerPersonId).length, registries.careerObjectives.values().filter(def => def.phase === "onboarding").length);
  assert.equal(validateWorldState(payload.worldState, registries).ok, true);
}

console.log("War Sim v0.4.3.2 soldier and unit gameplay smoke test passed");
