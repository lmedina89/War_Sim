import { createExternalId } from "./ids.js";
import { fnv1a32, stableStringify } from "./checksum.js";
import { migratePayload, CURRENT_SAVE_FORMAT_VERSION } from "./migrations.js";

const INDEX_KEY = "warSim_save_index_v3";
const SLOT_PREFIX = "warSim_save_v3_";
const BACKUP_PREFIX = "warSim_save_backup_v3_";
const LEGACY_KEY = "warSim_save";
export const MANUAL_SAVE_SLOTS = Object.freeze(["slot_01", "slot_02", "slot_03", "slot_04", "slot_05", "slot_06"]);
export const AUTOSAVE_SLOT = "autosave";

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "{}") ?? {}; }
  catch { return {}; }
}
function writeIndex(index) { localStorage.setItem(INDEX_KEY, JSON.stringify(index)); }
function slotKey(slotId) { return `${SLOT_PREFIX}${slotId}`; }
function backupKey(slotId) { return `${BACKUP_PREFIX}${slotId}`; }

function buildMetadata(state, slotId, savedAt, saveId) {
  const player = state.playerPersonId ? state.entities.people[state.playerPersonId] : null;
  return {
    slotId, saveId, characterName: player?.identity.displayName ?? "No active career", rankId: player?.affiliation.rankId ?? null,
    branchId: player?.affiliation.branchId ?? null, gameDate: state.world.date, gameVersion: state.gameVersion,
    worldSchemaVersion: state.schemaVersion, savedAt
  };
}

export function listSaveSlots() {
  importLegacySingleSaveIfNeeded();
  const index = readIndex();
  return [...MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT].map(slotId => index[slotId] ?? { slotId, empty: true });
}

export function saveToSlot(state, slotId) {
  if (![...MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT].includes(slotId)) throw new Error(`Invalid save slot: ${slotId}`);
  const previous = localStorage.getItem(slotKey(slotId));
  if (previous) localStorage.setItem(backupKey(slotId), previous);
  const savedAt = new Date().toISOString(), saveId = createExternalId("save");
  const payloadBase = { saveFormatVersion: CURRENT_SAVE_FORMAT_VERSION, saveId, createdAt: savedAt, savedAt, gameVersion: state.gameVersion, worldState: state };
  const checksum = fnv1a32(stableStringify(payloadBase));
  const payload = { ...payloadBase, checksum };
  localStorage.setItem(slotKey(slotId), JSON.stringify(payload));
  const index = readIndex(); index[slotId] = buildMetadata(state, slotId, savedAt, saveId); writeIndex(index);
  return index[slotId];
}

export function loadFromSlot(slotId) {
  importLegacySingleSaveIfNeeded();
  const raw = localStorage.getItem(slotKey(slotId));
  if (!raw) return null;
  let payload = JSON.parse(raw);
  const suppliedChecksum = payload.checksum;
  const { checksum, ...base } = payload;
  if (suppliedChecksum && fnv1a32(stableStringify(base)) !== suppliedChecksum) throw new Error("Save integrity check failed. The slot was not loaded.");
  payload = migratePayload(payload);
  return { worldState: payload.worldState, metadata: readIndex()[slotId] ?? null };
}

export function deleteSaveSlot(slotId) {
  localStorage.removeItem(slotKey(slotId)); localStorage.removeItem(backupKey(slotId));
  const index = readIndex(); delete index[slotId]; writeIndex(index);
}

export function importLegacySingleSaveIfNeeded() {
  const index = readIndex();
  if (index.slot_01 || !localStorage.getItem(LEGACY_KEY)) return false;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    const migrated = migratePayload(legacy);
    const state = migrated.worldState;
    saveToSlot(state, "slot_01");
    return true;
  } catch { return false; }
}
