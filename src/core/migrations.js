export const CURRENT_SAVE_FORMAT_VERSION = 3;
export const CURRENT_WORLD_SCHEMA_VERSION = 3;

function migrateWorldV2ToV3(worldState) {
  const next = structuredClone(worldState);
  next.schemaVersion = 3;
  next.gameVersion = "0.1.2";
  next.world.seed = Number.isInteger(next.world.seed) ? next.world.seed : 0x4f1bbcdc;
  next.world.rngState = Number.isInteger(next.world.rngState) ? next.world.rngState : next.world.seed;
  next.world.nextEntitySequence = Number.isInteger(next.world.nextEntitySequence) ? next.world.nextEntitySequence : 1000;
  next.world.clock = next.world.clock ?? { elapsedDays: 0, paused: true, speed: 1 };
  next.entities.notificationRecords = next.entities.notificationRecords ?? {};
  next.entities.actionRecords = next.entities.actionRecords ?? {};
  return next;
}

export function migratePayload(payload) {
  let next = structuredClone(payload);
  if (next.saveFormatVersion === 2) {
    next = { saveFormatVersion: 3, saveId: next.saveId ?? null, createdAt: next.savedAt ?? new Date().toISOString(), savedAt: next.savedAt ?? new Date().toISOString(), gameVersion: "0.1.2", worldState: migrateWorldV2ToV3(next.worldState) };
  }
  if (next.saveFormatVersion !== CURRENT_SAVE_FORMAT_VERSION) throw new Error(`Unsupported save format: ${next.saveFormatVersion}`);
  if (next.worldState.schemaVersion === 2) next.worldState = migrateWorldV2ToV3(next.worldState);
  if (next.worldState.schemaVersion !== CURRENT_WORLD_SCHEMA_VERSION) throw new Error(`Unsupported world schema: ${next.worldState.schemaVersion}`);
  next.gameVersion = "0.1.2";
  next.worldState.gameVersion = "0.1.2";
  return next;
}
