import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { grantTrainingExperience, advanceWorldDays } from "../src/commands/advanceCareer.js";
import { promotePerson } from "../src/commands/promotePerson.js";
import { completeSchool } from "../src/commands/awardQualification.js";
import { recordCasualty } from "../src/commands/recordCasualty.js";
import { selectCurrentSquad } from "../src/selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";

const store = createStateStore(createInitialWorldState());
assert.equal(validateWorldState(store.getState(), registries).ok, true);
assert.equal(store.getState().playerPersonId, null);

const playerId = createPlayerCareer(store, registries, { firstName: "Test", lastName: "Player", branchId: "branch_army" });
assert.ok(playerId);
assert.equal(store.getState().entities.people[playerId].identity.displayName, "Test Player");
assert.equal(selectCurrentSquad(store.getState(), store.getIndexes(), registries, playerId).members.length, 9);
assert.equal(store.getIndexes().relationshipsByPersonId.get(playerId).length, 8);
assert.equal(validateWorldState(store.getState(), registries).ok, true);

let career = selectCareerRecord(store.getState(), store.getIndexes(), registries, playerId);
assert.equal(career.promotion.eligible, false);

grantTrainingExperience(store, playerId, 250);
advanceWorldDays(store, 30);
career = selectCareerRecord(store.getState(), store.getIndexes(), registries, playerId);
assert.equal(career.promotion.eligible, true);
promotePerson(store, registries, playerId);
assert.equal(store.getState().entities.people[playerId].affiliation.rankId, "rank_army_e2");
assert.equal(Object.keys(store.getState().entities.promotionRecords).length, 1);

completeSchool(store, registries, playerId, "school_airborne");
assert.equal(store.getIndexes().qualificationsByPersonId.get(playerId).length, 1);
assert.equal(store.getIndexes().awardsByPersonId.get(playerId).length, 1);
assert.throws(() => completeSchool(store, registries, playerId, "school_airborne"));

const npcId = "pers_1009";
recordCasualty(store, npcId, { classification: "kia", circumstances: "test" });
assert.equal(store.getState().entities.people[npcId].condition.status, "deceased");
assert.ok(store.getIndexes().memorialByPersonId.get(npcId));
assert.equal(validateWorldState(store.getState(), registries).ok, true);

console.log("War Sim v0.1.1 smoke test passed");
