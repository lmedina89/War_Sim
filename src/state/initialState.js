import { registries } from "../data/registries.js";
import { generateCareerStartWorld } from "../services/worldGeneration.js";

const ENTITY_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances","careerEvents",
  "assignmentRecords","promotionRecords","awardRecords","qualificationRecords","deploymentRecords",
  "casualtyRecords","memorialRecords","relationshipRecords","notificationRecords","actionRecords","orderRecords",
  "contractRecords","servicePeriodRecords","reenlistmentOfferRecords","careerChangeRequestRecords","interServiceTransferRecords",
  "personnelActionRecords","replacementRequestRecords"
];

function emptyEntities() {
  return Object.fromEntries(ENTITY_STORES.map(name => [name, {}]));
}

export function createInitialWorldState({
  seed = 0x4f1bbcdc,
  scenarioId = "career_start_army_active_11b_new_enlistee"
} = {}) {
  const normalizedSeed = Number(seed) >>> 0 || 0x6d2b79f5;
  const state = {
    schemaVersion: 11,
    gameVersion: "0.3.2.3",
    playerPersonId: null,
    world: {
      date: "2046-02-10",
      seed: normalizedSeed,
      rngState: normalizedSeed,
      nextEntitySequence: 1,
      clock: { elapsedDays: 0, paused: true, speed: 1 },
      nationIds: ["nation_demo"],
      careerStartUnitByBranchId: {},
      generation: null
    },
    entities: emptyEntities()
  };
  return generateCareerStartWorld(state, registries, scenarioId);
}
