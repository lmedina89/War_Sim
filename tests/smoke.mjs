import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { selectCurrentSquad } from "../src/selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { selectOrganizationView } from "../src/selectors/selectOrganizationView.js";

const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));

const initial = createInitialWorldState();
assert.equal(initial.playerPersonId, null);
assert.equal(Object.keys(initial.entities.units).length, 3);
assert.equal(Object.keys(initial.entities.billets).length, 9);

const store = createStateStore(initial);
const before = validateWorldState(store.getState(), registries);
assert.equal(before.ok, true, before.errors.join("\n"));

const created = createPlayerCareer(store, registries, {
  firstName: "Luis",
  lastName: "Medina",
  branchId: "branch_army"
});
assert.equal(created.ok, true);

const state = store.getState();
const player = state.entities.people[state.playerPersonId];
assert.equal(player.identity.displayName, "Luis Medina");
assert.ok(player.affiliation.billetId);

const validation = validateWorldState(state, registries);
assert.equal(validation.ok, true, validation.errors.join("\n"));

const squad = selectCurrentSquad(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(squad.authorizedStrength, 9);
assert.equal(squad.assignedStrength, 9);
assert.equal(squad.vacancies, 0);
assert.equal(squad.members.find(x => x.isPlayer).role, "Rifleman");

const career = selectCareerRecord(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(career.name, "Luis Medina");
assert.equal(career.role, "Rifleman");

const company = selectOrganizationView(state, store.getIndexes(), registries, "unit_company_001");
assert.deepEqual(company.childUnitIds, ["unit_platoon_001"]);

console.log("War Sim v0.2.0.1 hotfix smoke test passed");
