import { createExternalId } from "./ids.js";
import { fnv1a32, stableStringify } from "./checksum.js";
import { migratePayload, CURRENT_SAVE_FORMAT_VERSION } from "./migrations.js";
import { validateWorldState } from "./validator.js";
import { registries } from "../data/registries.js";

const INDEX_KEY = "warSim_save_index_v3";
const SLOT_PREFIX = "warSim_save_v3_";
const BACKUP_PREFIX = "warSim_save_backup_v3_";
const LEGACY_KEY = "warSim_save";
export const MANUAL_SAVE_SLOTS = Object.freeze(["slot_01", "slot_02", "slot_03", "slot_04", "slot_05", "slot_06"]);
export const AUTOSAVE_SLOT = "autosave";
const ALL_SAVE_SLOTS = Object.freeze([...MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT]);

function getSaveStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
      throw new Error("Storage API is unavailable.");
    }
    return storage;
  } catch (error) {
    throw new Error("Save storage is unavailable in this browser session. Your current career is still running, but saves cannot be read or written until storage access is restored.", { cause: error });
  }
}

function readIndex() {
  try {
    const parsed = JSON.parse(getSaveStorage().getItem(INDEX_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function writeIndex(index) { getSaveStorage().setItem(INDEX_KEY, JSON.stringify(index)); }
function slotKey(slotId) { return `${SLOT_PREFIX}${slotId}`; }
function backupKey(slotId) { return `${BACKUP_PREFIX}${slotId}`; }

function buildMetadata(state, slotId, savedAt, saveId) {
  const player = state.playerPersonId ? state.entities.people[state.playerPersonId] : null;
  return {
    slotId,
    saveId,
    characterName: player?.identity.displayName ?? "No active career",
    rankId: player?.affiliation.rankId ?? null,
    branchId: player?.affiliation.branchId ?? null,
    componentId: player?.affiliation.componentId ?? null,
    specialtyId: player?.affiliation.specialtyId ?? null,
    unitName: player?.affiliation.unitId ? state.entities.units[player.affiliation.unitId]?.name ?? null : null,
    gameDate: state.world.date,
    gameVersion: state.gameVersion,
    worldSchemaVersion: state.schemaVersion,
    savedAt
  };
}

function verifyAndMigrateRaw(raw) {
  if (!raw) throw new Error("Save payload is missing.");
  let payload;
  try { payload = JSON.parse(raw); }
  catch (error) { throw new Error("Save data is not valid JSON.", { cause: error }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Save payload is not a valid object.");
  const suppliedChecksum = payload.checksum;
  const { checksum, ...base } = payload;
  if (suppliedChecksum && fnv1a32(stableStringify(base)) !== suppliedChecksum) throw new Error("Save integrity check failed.");
  const migrated = migratePayload(payload);
  const validation = validateWorldState(migrated.worldState, registries);
  if (!validation.ok) throw new Error(`Save validation failed: ${validation.errors.join(" | ")}`);
  return migrated;
}

function metadataFromRaw(raw, slotId, { recoveredFromBackup = false } = {}) {
  const payload = verifyAndMigrateRaw(raw);
  return {
    ...buildMetadata(payload.worldState, slotId, payload.savedAt ?? payload.createdAt ?? null, payload.saveId ?? null),
    recoveredFromBackup,
    loadable: true,
    loadIssue: recoveredFromBackup ? "recovery" : null
  };
}

function classifyLoadError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown save error.");
  if (/Unsupported save format:/i.test(message) || /Unsupported world schema:/i.test(message)) {
    return {
      kind: "incompatible",
      userMessage: "This save was created by an unsupported version of War Sim and cannot be loaded by this build. Update War Sim or load a compatible backup."
    };
  }
  if (/integrity check failed/i.test(message)) return { kind: "corrupted", userMessage: "Save integrity check failed. This save appears to be damaged." };
  if (/not valid JSON|not a valid object|payload is missing/i.test(message)) return { kind: "corrupted", userMessage: "This save contains damaged or incomplete data." };
  if (/Save validation failed:/i.test(message)) return { kind: "corrupted", userMessage: "This save contains invalid world data and cannot be loaded safely." };
  return { kind: "corrupted", userMessage: "This save could not be validated and cannot be loaded safely." };
}

function unavailableMetadata(slotId, index, errors) {
  const classifications = errors.filter(Boolean).map(classifyLoadError);
  const incompatible = classifications.some(entry => entry.kind === "incompatible");
  return {
    ...(index[slotId] ?? {}),
    slotId,
    empty: false,
    loadable: false,
    corrupted: !incompatible,
    incompatible,
    loadIssue: incompatible ? "incompatible" : "corrupted",
    loadIssueMessage: incompatible
      ? "This save requires a different War Sim save/schema version."
      : "Save data is damaged and no valid recovery backup is available."
  };
}

function friendlyLoadFailure(primaryError, backupError = null) {
  const primary = primaryError ? classifyLoadError(primaryError) : null;
  const backup = backupError ? classifyLoadError(backupError) : null;
  if (backupError) {
    if (primary?.kind === "incompatible" || backup?.kind === "incompatible") {
      return new Error("This save and its recovery backup are not compatible with this War Sim build. Update War Sim or use another save slot.");
    }
    return new Error("The primary save is damaged and its recovery backup is also invalid. This slot cannot be loaded safely.");
  }
  return new Error(primary?.userMessage ?? "This save slot could not be loaded safely.");
}

function inspectSlot(slotId, index = readIndex()) {
  const primaryRaw = getSaveStorage().getItem(slotKey(slotId));
  const backupRaw = slotId === AUTOSAVE_SLOT ? null : getSaveStorage().getItem(backupKey(slotId));
  if (!primaryRaw && !backupRaw) return { metadata: { slotId, empty: true }, source: null };

  if (primaryRaw) {
    try { return { metadata: metadataFromRaw(primaryRaw, slotId), source: "primary" }; }
    catch (primaryError) {
      if (backupRaw) {
        try { return { metadata: metadataFromRaw(backupRaw, slotId, { recoveredFromBackup: true }), source: "backup", primaryError }; }
        catch (backupError) { return { metadata: unavailableMetadata(slotId, index, [primaryError, backupError]), source: null, primaryError, backupError }; }
      }
      return { metadata: unavailableMetadata(slotId, index, [primaryError]), source: null, primaryError };
    }
  }

  try { return { metadata: metadataFromRaw(backupRaw, slotId, { recoveredFromBackup: true }), source: "backup" }; }
  catch (backupError) { return { metadata: unavailableMetadata(slotId, index, [backupError]), source: null, backupError }; }
}

function repairIndexFromStoredSlots() {
  const prior = readIndex();
  const repaired = {};
  const slots = [];
  for (const slotId of ALL_SAVE_SLOTS) {
    const inspected = inspectSlot(slotId, prior);
    slots.push(inspected.metadata);
    if (!inspected.metadata.empty) repaired[slotId] = inspected.metadata;
  }
  try { writeIndex(repaired); }
  catch { /* The payload remains authoritative; index reconstruction will retry later. */ }
  return slots;
}

export function listSaveSlots() {
  importLegacySingleSaveIfNeeded();
  return repairIndexFromStoredSlots();
}

function isQuotaError(error) {
  const name = String(error?.name ?? ""), message = String(error?.message ?? "").toLowerCase();
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || message.includes("quota") || message.includes("storage");
}

function isValidStoredSave(raw) {
  if (!raw) return false;
  try { verifyAndMigrateRaw(raw); return true; }
  catch { return false; }
}

export function saveToSlot(state, slotId) {
  if (!ALL_SAVE_SLOTS.includes(slotId)) throw new Error(`Invalid save slot: ${slotId}`);
  const validation = validateWorldState(state, registries);
  if (!validation.ok) throw new Error(`Save blocked: ${validation.errors.join(" | ")}`);

  const key = slotKey(slotId), backup = backupKey(slotId), previous = getSaveStorage().getItem(key);
  const existingBackup = slotId === AUTOSAVE_SLOT ? null : getSaveStorage().getItem(backup);
  const previousIsValid = isValidStoredSave(previous);
  const existingBackupIsValid = isValidStoredSave(existingBackup);
  const recoveryRaw = previousIsValid ? previous : (existingBackupIsValid ? existingBackup : null);
  const savedAt = new Date().toISOString(), saveId = createExternalId("save");
  const payloadBase = { saveFormatVersion: CURRENT_SAVE_FORMAT_VERSION, saveId, createdAt: savedAt, savedAt, gameVersion: state.gameVersion, worldState: state };
  const checksum = fnv1a32(stableStringify(payloadBase));
  const serialized = JSON.stringify({ ...payloadBase, checksum });
  try {
    if (slotId === AUTOSAVE_SLOT) getSaveStorage().removeItem(backup);
    else if (recoveryRaw && recoveryRaw !== existingBackup) getSaveStorage().setItem(backup, recoveryRaw);
    getSaveStorage().setItem(key, serialized);
  } catch (error) {
    if (isQuotaError(error)) {
      // Never discard the only known-good recovery copy merely to force a new write.
      // When the current primary is valid, it remains safe to drop the duplicate backup
      // and retry because localStorage.setItem is atomic for that primary key.
      if (!previousIsValid && existingBackupIsValid) {
        throw new Error("Save storage is full. Your existing recovery backup was preserved; delete another manual save, then try again.", { cause: error });
      }
      try { getSaveStorage().removeItem(backup); getSaveStorage().setItem(key, serialized); }
      catch (retryError) { throw new Error("Save storage is full. Delete an older manual save, then try again.", { cause: retryError }); }
    } else throw error;
  }

  const metadata = buildMetadata(state, slotId, savedAt, saveId);
  const index = readIndex();
  index[slotId] = metadata;
  try { writeIndex(index); } catch { /* listSaveSlots can rebuild this from the payload. */ }
  return metadata;
}

export function loadFromSlot(slotId) {
  if (!ALL_SAVE_SLOTS.includes(slotId)) throw new Error(`Invalid save slot: ${slotId}`);
  importLegacySingleSaveIfNeeded();
  const primaryRaw = getSaveStorage().getItem(slotKey(slotId));
  const backupRaw = slotId === AUTOSAVE_SLOT ? null : getSaveStorage().getItem(backupKey(slotId));
  if (!primaryRaw && !backupRaw) return null;

  let payload = null;
  let recoveredFromBackup = false;
  let primaryError = null;
  if (primaryRaw) {
    try { payload = verifyAndMigrateRaw(primaryRaw); }
    catch (error) { primaryError = error; }
  }

  if (!payload && backupRaw) {
    try {
      payload = verifyAndMigrateRaw(backupRaw);
      recoveredFromBackup = true;
      try { getSaveStorage().setItem(slotKey(slotId), backupRaw); } catch { /* Recovery can still proceed in-memory. */ }
    } catch (backupError) {
      throw friendlyLoadFailure(primaryError, backupError);
    }
  }

  if (!payload) throw friendlyLoadFailure(primaryError ?? new Error("Save slot could not be loaded."));
  const metadata = {
    ...buildMetadata(payload.worldState, slotId, payload.savedAt ?? payload.createdAt ?? null, payload.saveId ?? null),
    recoveredFromBackup
  };
  const index = readIndex();
  index[slotId] = metadata;
  try { writeIndex(index); } catch { /* Payload is still loadable without the index. */ }
  return { worldState: payload.worldState, metadata };
}

export function deleteSaveSlot(slotId) {
  if (!ALL_SAVE_SLOTS.includes(slotId)) throw new Error(`Invalid save slot: ${slotId}`);
  getSaveStorage().removeItem(slotKey(slotId));
  getSaveStorage().removeItem(backupKey(slotId));
  const index = readIndex();
  delete index[slotId];
  try { writeIndex(index); } catch { /* Deletion itself has already completed. */ }
}

export function importLegacySingleSaveIfNeeded() {
  const legacyRaw = getSaveStorage().getItem(LEGACY_KEY);
  const slotAlreadyExists = localStorage.getItem(slotKey("slot_01")) || localStorage.getItem(backupKey("slot_01"));
  if (slotAlreadyExists || readIndex().slot_01 || !legacyRaw) return false;
  try {
    const legacy = JSON.parse(legacyRaw);
    const migrated = migratePayload(legacy);
    const validation = validateWorldState(migrated.worldState, registries);
    if (!validation.ok) return false;
    saveToSlot(migrated.worldState, "slot_01");
    return true;
  } catch {
    return false;
  }
}
