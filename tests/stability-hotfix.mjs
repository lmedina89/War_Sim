import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { migratePayload } from "../src/core/migrations.js";
import { saveToSlot, loadFromSlot } from "../src/core/saveSystem.js";
import { ensureInfantryCompanyStructure } from "../src/services/organizationSeed.js";

function assertAssignmentIntegrity(state, label) {
  const seen = new Set();
  const profile = registries.generationProfiles.get(state.world.generation.generationProfileId);
  for (const billet of Object.values(state.entities.billets)) {
    if (!billet.assignedPersonId) continue;
    const person = state.entities.people[billet.assignedPersonId];
    assert.ok(person, `${label}: ${billet.id} missing assigned person`);
    assert.ok(!seen.has(person.id), `${label}: ${person.id} occupies more than one billet`);
    seen.add(person.id);
    assert.equal(person.affiliation.billetId, billet.id, `${label}: ${person.id} billet back-reference mismatch`);
    assert.equal(person.affiliation.unitId, billet.unitId, `${label}: ${person.id} unit mismatch`);
    const def = registries.billets.get(billet.definitionId);
    const rank = registries.ranks.get(person.affiliation.rankId);
    assert.ok(rank.hierarchyLevel >= def.minimumRankLevel, `${label}: ${person.id}/${def.name} rank ${rank.abbreviation} below ${def.minimumRankLevel}`);
    const expectedSpecialty = profile?.billetSpecialtyIdsByDefinitionId?.[billet.definitionId];
    if (expectedSpecialty) assert.equal(person.affiliation.specialtyId, expectedSpecialty, `${label}: ${person.id}/${def.name} specialty mismatch`);
    const loadout = state.entities.loadouts[person.loadoutId];
    assert.ok(loadout, `${label}: ${person.id} missing loadout`);
    const equipment = state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId];
    assert.ok(equipment, `${label}: ${person.id} missing primary equipment`);
    assert.equal(equipment.ownerPersonId, person.id, `${label}: ${person.id} equipment owner mismatch`);
    assert.equal(equipment.definitionId, def.primaryEquipmentDefinitionId, `${label}: ${person.id}/${def.name} primary equipment mismatch`);
  }
}

function advanceResolving(store, days) {
  let remaining = days;
  let guard = 0;
  while (remaining > 0) {
    assert.ok(++guard < days * 5 + 200, "advance guard exceeded");
    const state = store.getState();
    const gameplay = selectGameplay(state, store.getIndexes(), registries, state.playerPersonId);
    if (gameplay.pendingDecisions.length) {
      const decision = gameplay.pendingDecisions[0];
      const result = resolveDecision(store, registries, state.playerPersonId, decision.id, decision.choices[0].id);
      assert.equal(result.ok, true);
      continue;
    }
    const result = advanceWorldDays(store, remaining);
    assert.equal(result.ok, true);
    assert.ok(result.data.days > 0);
    remaining -= result.data.days;
  }
}

// Release gate: 1,000 deterministic fresh worlds must satisfy assignment invariants.
for (let seed = 1; seed <= 1000; seed++) {
  const world = createInitialWorldState({ seed });
  const validation = validateWorldState(world, registries);
  assert.equal(validation.ok, true, `seed ${seed}: ${validation.errors.join(" | ")}`);
  assertAssignmentIntegrity(world, `seed ${seed}`);
}

// Explicit regression: generated company XO must satisfy the billet's O2 minimum.
{
  const world = createInitialWorldState({ seed: 413 });
  const xoBillet = Object.values(world.entities.billets).find(b => b.definitionId === "billet_executive_officer");
  const xo = world.entities.people[xoBillet.assignedPersonId];
  assert.equal(xo.affiliation.rankId, "rank_army_o2");
}

// Legacy organization seeding path must also create pers_org_002 as a valid O2 XO.
{
  const legacySeedState = {
    world: { date:"2046-02-10", careerStartUnitByBranchId:{} },
    entities: { people:{}, units:{}, billets:{}, serviceRecords:{}, loadouts:{}, equipmentInstances:{} }
  };
  ensureInfantryCompanyStructure(legacySeedState);
  const xoBillet = legacySeedState.entities.billets.billet_hq_co_2;
  const xo = legacySeedState.entities.people[xoBillet.assignedPersonId];
  assert.equal(xo.id, "pers_org_002");
  assert.equal(xo.affiliation.rankId, "rank_army_o2");
}

// Schema-13 migration must execute the training-phase helpers successfully.
{
  const store = createStateStore(createInitialWorldState({ seed: 130014 }));
  createPlayerCareer(store, registries, { firstName:"Schema", lastName:"Thirteen", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:130014 });
  const legacy = structuredClone(store.getState());
  legacy.schemaVersion = 13;
  legacy.gameVersion = "0.4.1";
  delete legacy.world.scheduler.trainingPhaseId;
  legacy.world.scheduler.scheduleTemplateId = "schedule_standard_training_cycle";
  const migrated = migratePayload({ saveFormatVersion:3, saveId:"schema13-hotfix", createdAt:"2026-08-31T00:00:00.000Z", savedAt:"2026-08-31T00:00:00.000Z", gameVersion:"0.4.1", worldState:legacy });
  assert.equal(migrated.worldState.schemaVersion, 14);
  assert.equal(migrated.worldState.gameVersion, "0.4.1.6");
  assert.equal(migrated.worldState.world.scheduler.trainingPhaseId, "training_phase_garrison");
  assert.equal(validateWorldState(migrated.worldState, registries).ok, true);
}

// Same-schema legacy repair: an old O1 company XO is normalized to the lowest valid officer rank.
{
  const legacy = createInitialWorldState({ seed: 141413 });
  const xoBillet = Object.values(legacy.entities.billets).find(b => b.definitionId === "billet_executive_officer");
  const xo = legacy.entities.people[xoBillet.assignedPersonId];
  xo.affiliation.rankId = "rank_army_o1";
  const before = validateWorldState(legacy, registries);
  assert.equal(before.ok, false);
  assert.match(before.errors.join("\n"), /Executive Officer.*requires 1LT.*assigned 2LT/);
  const migrated = migratePayload({ saveFormatVersion:3, saveId:"schema14-rank-repair", createdAt:"2026-08-31T00:00:00.000Z", savedAt:"2026-08-31T00:00:00.000Z", gameVersion:"0.4.1.2", worldState:legacy });
  assert.equal(migrated.worldState.entities.people[xo.id].affiliation.rankId, "rank_army_o2");
  assert.equal(validateWorldState(migrated.worldState, registries).ok, true);
  const rerun = migratePayload(migrated);
  assert.deepEqual(rerun.worldState, migrated.worldState, "migration normalization must be idempotent");
}

// Legacy worlds that skipped older affiliation-field migrations are normalized without weakening validation.
{
  const legacy = createInitialWorldState({ seed: 81413 });
  const sample = Object.values(legacy.entities.people).find(person => person.affiliation.specialtyId === "specialty_army_11b");
  delete sample.affiliation.componentId;
  delete sample.affiliation.specialtyId;
  delete legacy.entities.serviceRecords[sample.serviceRecordId].componentId;
  delete legacy.entities.serviceRecords[sample.serviceRecordId].specialtyId;
  const migrated = migratePayload({ saveFormatVersion:3, saveId:"legacy-affiliation-repair", createdAt:"2026-08-31T00:00:00.000Z", savedAt:"2026-08-31T00:00:00.000Z", gameVersion:"0.3.1.1", worldState:legacy });
  assert.equal(migrated.worldState.entities.people[sample.id].affiliation.componentId, "component_active");
  assert.equal(migrated.worldState.entities.people[sample.id].affiliation.specialtyId, "specialty_army_11b");
  assert.equal(validateWorldState(migrated.worldState, registries).ok, true);
}

// New-career -> advance -> save -> load -> advance release gate.
{
  const storage = new Map();
  globalThis.localStorage = {
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  };
  const store = createStateStore(createInitialWorldState({ seed: 413413 }));
  const created = createPlayerCareer(store, registries, { firstName:"Stability", lastName:"Gate", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:413413 });
  assert.equal(created.ok, true);
  for (const span of [1, 7, 30]) advanceResolving(store, span);
  assert.equal(validateWorldState(store.getState(), registries).ok, true);
  saveToSlot(store.getState(), "slot_01");
  const loaded = loadFromSlot("slot_01");
  assert.deepEqual(loaded.worldState, store.getState(), "hotfix save/load must preserve state exactly");
  const loadedStore = createStateStore(loaded.worldState);
  advanceResolving(loadedStore, 30);
  assert.equal(validateWorldState(loadedStore.getState(), registries).ok, true);
}

console.log("War Sim v0.4.1.6 stability hotfix QA passed");
