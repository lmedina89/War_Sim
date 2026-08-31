import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateWorldState } from "../src/core/validator.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { grantTrainingExperience, advanceWorldDays } from "../src/commands/advanceCareer.js";
import { promotePerson } from "../src/commands/promotePerson.js";
import { completeSchool } from "../src/commands/awardQualification.js";
import { recordCasualty } from "../src/commands/recordCasualty.js";
import { nextRandom } from "../src/core/rng.js";
import { migratePayload } from "../src/core/migrations.js";

assert.equal(validateDefinitions(registries).ok, true);
const store = createStateStore(createInitialWorldState({ seed: 12345 }));
assert.equal(validateWorldState(store.getState(), registries).ok, true);
const result = createPlayerCareer(store, registries, { firstName: "Test", lastName: "Player", branchId: "branch_army", seed: 12345 });
const playerId = result.data.personId;
assert.equal(result.code, "career_created");
assert.equal(store.getState().entities.people[playerId].identity.displayName, "Test Player");
assert.equal(store.getIndexes().relationshipsByPersonId.get(playerId).length, 8);
assert.equal(store.getIndexes().notificationsByPersonId.get(playerId).length, 1);
assert.ok(store.getIndexes().actionsByActorPersonId.get(playerId).length >= 1);

grantTrainingExperience(store, playerId, 250); advanceWorldDays(store, 30);
const promo = promotePerson(store, registries, playerId); assert.equal(promo.code, "promoted");
const school = completeSchool(store, registries, playerId, "school_airborne"); assert.equal(school.notifications.length, 2);
assert.equal(store.getIndexes().qualificationsByPersonId.get(playerId).length, 1);
assert.equal(store.getIndexes().awardsByPersonId.get(playerId).length, 1);

const a = createInitialWorldState({ seed: 99 }), b = createInitialWorldState({ seed: 99 });
assert.equal(nextRandom(a), nextRandom(b)); assert.equal(nextRandom(a), nextRandom(b));

recordCasualty(store, "pers_1009", { classification: "kia", circumstances: "test" });
assert.ok(store.getIndexes().memorialByPersonId.get("pers_1009"));
assert.equal(validateWorldState(store.getState(), registries).ok, true);

const oldPayload = { saveFormatVersion: 2, savedAt: "2026-01-01T00:00:00.000Z", gameVersion: "0.1.1", worldState: (() => { const s = createInitialWorldState(); s.schemaVersion = 2; s.gameVersion = "0.1.1"; delete s.world.clock; delete s.world.seed; delete s.world.rngState; delete s.world.nextEntitySequence; delete s.entities.notificationRecords; delete s.entities.actionRecords; return s; })() };
const migrated = migratePayload(oldPayload); assert.equal(migrated.saveFormatVersion, 3); assert.equal(migrated.worldState.schemaVersion, 3);
console.log("War Sim v0.1.2 smoke test passed");
