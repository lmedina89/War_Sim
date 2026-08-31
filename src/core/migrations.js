import { createInitialWorldState } from "../state/initialState.js";

export function migrateWorldState(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid save state.");

  if (input.schemaVersion === 4) return structuredClone(input);

  // v0.1.2 / world schema 3 -> v0.2.0 / world schema 4
  if (input.schemaVersion === 3) {
    const oldPlayer = input.entities?.people?.[input.playerPersonId];
    const migrated = createInitialWorldState({
      firstName: oldPlayer?.identity?.firstName ?? "Alex",
      lastName: oldPlayer?.identity?.lastName ?? "Morgan"
    });

    // Carry forward the player career identity/progression and historical records where compatible.
    const newPlayer = migrated.entities.people[migrated.playerPersonId];
    if (oldPlayer) {
      newPlayer.affiliation.rankId = oldPlayer.affiliation.rankId ?? newPlayer.affiliation.rankId;
      newPlayer.career = structuredClone(oldPlayer.career ?? newPlayer.career);
      newPlayer.condition = structuredClone(oldPlayer.condition ?? newPlayer.condition);
      newPlayer.simulationTier = oldPlayer.simulationTier ?? 0;
    }

    for (const storeName of [
      "careerEvents","promotionRecords","awardRecords","qualificationRecords",
      "deploymentRecords","casualtyRecords","memorialRecords","notificationRecords","actionRecords"
    ]) {
      migrated.entities[storeName] = structuredClone(input.entities?.[storeName] ?? {});
    }

    migrated.world = structuredClone(input.world ?? migrated.world);
    migrated.rngState = input.rngState ?? migrated.rngState;
    migrated.nextEntitySequence = Math.max(input.nextEntitySequence ?? 0, migrated.nextEntitySequence);
    migrated.schemaVersion = 4;
    migrated.gameVersion = "0.2.0";
    return migrated;
  }

  throw new Error(`No migration path for world schema ${input.schemaVersion}.`);
}
