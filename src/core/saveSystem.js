import { migrateWorldState } from "./migrations.js";

const INDEX_KEY = "warSim_save_index_v3";
const SLOT_PREFIX = "warSim_slot_v3_";
const BACKUP_PREFIX = "warSim_backup_v3_";

export const MANUAL_SLOT_IDS = ["slot_01","slot_02","slot_03","slot_04","slot_05","slot_06"];
export const AUTOSAVE_SLOT_ID = "autosave";

function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "{}"); }
  catch { return {}; }
}

function writeIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listSaveMetadata() {
  const index = readIndex();
  return [...MANUAL_SLOT_IDS, AUTOSAVE_SLOT_ID].map(slotId => index[slotId] ?? { slotId, empty: true });
}

export function saveToSlot(slotId, state, registries) {
  const payloadBody = JSON.stringify(state);
  const payload = {
    saveFormatVersion: 3,
    worldSchemaVersion: state.schemaVersion,
    gameVersion: state.gameVersion,
    savedAt: new Date().toISOString(),
    checksum: checksum(payloadBody),
    worldState: state
  };

  const key = SLOT_PREFIX + slotId;
  const previous = localStorage.getItem(key);
  if (previous) localStorage.setItem(BACKUP_PREFIX + slotId, previous);
  localStorage.setItem(key, JSON.stringify(payload));

  const player = state.entities.people[state.playerPersonId];
  const rank = registries.ranks.get(player.affiliation.rankId);
  const branch = registries.branches.get(player.affiliation.branchId);

  const index = readIndex();
  index[slotId] = {
    slotId,
    empty: false,
    characterName: player.identity.displayName,
    rank: rank.abbreviation,
    branch: branch.name,
    gameDate: state.world.date,
    gameVersion: state.gameVersion,
    worldSchemaVersion: state.schemaVersion,
    savedAt: payload.savedAt
  };
  writeIndex(index);
  return index[slotId];
}

export function loadFromSlot(slotId) {
  const raw = localStorage.getItem(SLOT_PREFIX + slotId);
  if (!raw) return null;
  const payload = JSON.parse(raw);
  const body = JSON.stringify(payload.worldState);
  if (payload.checksum && checksum(body) !== payload.checksum) {
    throw new Error(`Save integrity check failed for ${slotId}.`);
  }
  return migrateWorldState(payload.worldState);
}

export function deleteSlot(slotId) {
  localStorage.removeItem(SLOT_PREFIX + slotId);
  const index = readIndex();
  delete index[slotId];
  writeIndex(index);
}
