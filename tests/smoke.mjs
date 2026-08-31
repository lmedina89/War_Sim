import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { buildIndexes } from "../src/indexes/buildIndexes.js";
import { validateDefinitions, validateWorldState } from "../src/core/validator.js";
import { selectCurrentSquad } from "../src/selectors/selectCurrentSquad.js";
import { selectOrganizationView } from "../src/selectors/selectOrganizationView.js";

const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));

const state = createInitialWorldState({ firstName: "Luis", lastName: "Medina" });
const validation = validateWorldState(state, registries);
assert.equal(validation.ok, true, validation.errors.join("\n"));

const indexes = buildIndexes(state);
assert.equal(indexes.unitsByParentId.get("unit_company_001")[0], "unit_platoon_001");
assert.equal(indexes.unitsByParentId.get("unit_platoon_001")[0], "unit_sq_001");
assert.equal(indexes.billetsByUnitId.get("unit_sq_001").length, 9);
assert.equal(indexes.billetByAssignedPersonId.get("pers_player"), "billet_009");

const squad = selectCurrentSquad(state, indexes, registries, "pers_player");
assert.equal(squad.authorizedStrength, 9);
assert.equal(squad.assignedStrength, 9);
assert.equal(squad.vacancies, 0);
assert.equal(squad.members.find(m => m.personId === "pers_player").role, "Rifleman");

const company = selectOrganizationView(state, indexes, registries, "unit_company_001");
assert.equal(company.echelon, "Company");
assert.deepEqual(company.childUnitIds, ["unit_platoon_001"]);

const platoon = selectOrganizationView(state, indexes, registries, "unit_platoon_001");
assert.equal(platoon.echelon, "Platoon");
assert.deepEqual(platoon.childUnitIds, ["unit_sq_001"]);

console.log("War Sim v0.2.0 smoke test passed");
