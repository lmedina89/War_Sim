import { registries } from "../data/registries.js";
import { generateCareerStartWorld } from "../services/worldGeneration.js";

const ENTITY_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances","careerEvents",
  "assignmentRecords","promotionRecords","awardRecords","qualificationRecords","deploymentRecords",
  "casualtyRecords","memorialRecords","relationshipRecords","notificationRecords","actionRecords","orderRecords",
  "contractRecords","servicePeriodRecords","reenlistmentOfferRecords","careerChangeRequestRecords","interServiceTransferRecords",
  "personnelActionRecords","replacementRequestRecords","skillProfiles","activityRecords","performanceRecords","gameplayEventRecords","qualificationAttemptRecords","militaryEducationRecords",
  "unitTrainingProfiles","scheduleRecords","opportunityRecords","objectiveRecords","unitEventRecords","unitReadinessSnapshots","personalityProfiles","relationshipMemoryRecords"
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
    schemaVersion: 16,
    gameVersion: "0.4.3.3.1",
    playerPersonId: null,
    world: {
      date: "2046-02-10",
      seed: normalizedSeed,
      rngState: normalizedSeed,
      nextEntitySequence: 1,
      clock: { elapsedDays: 0, paused: true, speed: 1 },
      nationIds: ["nation_demo"],
      careerStartUnitByBranchId: {},
      generation: null,
      scheduler: null
    },
    entities: emptyEntities()
  };
  return generateCareerStartWorld(state, registries, scenarioId);
}
