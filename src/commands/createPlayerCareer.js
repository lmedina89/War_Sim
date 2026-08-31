import { createEntityId } from "../core/ids.js";
import { seedFromText } from "../core/rng.js";
import { commandResult } from "../core/commandResult.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

function normalizeName(value, label) {
  const normalized = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (normalized.length < 1 || normalized.length > 40) throw new Error(`${label} must be 1–40 characters.`);
  if(/[\u0000-\u001F\u007F]/u.test(normalized)) throw new Error(`${label} contains unsupported characters.`);
  return normalized;
}

export function createPlayerCareer(store, registries, input) {
  const state = store.getState();
  if (state.playerPersonId) throw new Error("A player career already exists. Start a new career first.");
  const firstName = normalizeName(input.firstName, "First name");
  const lastName = normalizeName(input.lastName, "Last name");
  const branch = registries.branches.get(input.branchId);
  const rank = registries.ranks.get(branch.startingRankId), role = registries.roles.get(branch.startingRoleId);
  const unitId = state.world.careerStartUnitByBranchId[branch.id], unit = state.entities.units[unitId];
  if (!unit) throw new Error(`No starting unit is configured for ${branch.name}.`);
  const slot = Object.values(state.entities.unitSlots).find(candidate => candidate.unitId === unitId && candidate.status === "vacant" && candidate.roleId === role.id);
  if (!slot) throw new Error(`No vacant ${role.name} slot exists in ${unit.name}.`);
  let personId, noticeId;
  store.mutate(draft => {
    draft.world.seed = Number.isInteger(input.seed) ? (input.seed >>> 0) : seedFromText(`${firstName}|${lastName}|${draft.world.date}`);
    draft.world.rngState = draft.world.seed;
    personId = createEntityId(draft, "pers");
    const serviceRecordId = createEntityId(draft, "service"), loadoutId = createEntityId(draft, "loadout"), equipmentInstanceId = createEntityId(draft, "eq"), assignmentId = createEntityId(draft, "assign"), enlistmentEventId = createEntityId(draft, "career");
    draft.playerPersonId = personId;
    draft.entities.people[personId] = { id: personId, schemaVersion: 2, identity: { firstName, lastName, displayName: `${firstName} ${lastName}` }, affiliation: { nationId: unit.nationId, branchId: branch.id, unitId, roleId: role.id, rankId: rank.id }, career: { enlistmentDate: draft.world.date, experience: 0, prestige: 0 }, condition: { health: 100, morale: 75, fatigue: 0, readiness: 70, status: "active" }, traitIds: [], loadoutId, serviceRecordId, simulationTier: 0 };
    draft.entities.serviceRecords[serviceRecordId] = { id: serviceRecordId, schemaVersion: 1, personId, serviceStatus: "active", entryDate: draft.world.date, separationDate: null };
    draft.entities.equipmentInstances[equipmentInstanceId] = { id: equipmentInstanceId, schemaVersion: 1, definitionId: "weapon_service_rifle", ownerPersonId: personId, condition: 100, upgradeIds: [] };
    draft.entities.loadouts[loadoutId] = { id: loadoutId, schemaVersion: 2, ownerPersonId: personId, slots: { primaryWeaponInstanceId: equipmentInstanceId } };
    draft.entities.unitSlots[slot.id].assignedPersonId = personId; draft.entities.unitSlots[slot.id].status = "filled";
    draft.entities.assignmentRecords[assignmentId] = { id: assignmentId, schemaVersion: 1, personId, unitId, roleId: role.id, startDate: draft.world.date, endDate: null, reason: "initial_assignment" };
    draft.entities.careerEvents[enlistmentEventId] = { id: enlistmentEventId, schemaVersion: 1, personId, type: "enlistment", date: draft.world.date, references: { branchId: branch.id, rankId: rank.id, unitId, roleId: role.id } };
    for (const npc of Object.values(draft.entities.people)) {
      if (npc.id === personId || npc.affiliation.unitId !== unitId) continue;
      const relationshipId = createEntityId(draft, "rel");
      draft.entities.relationshipRecords[relationshipId] = { id: relationshipId, schemaVersion: 1, personAId: personId, personBId: npc.id, familiarity: 5, trust: 0, respect: 0, bond: 0, relationshipType: "squadmate", lastInteractionDate: draft.world.date };
    }
    noticeId = recordNotification(draft, { personId, type: "career_started", title: "Career Started", message: `${firstName} ${lastName} enlisted in the ${branch.name} as ${rank.abbreviation}.`, priority: "normal", references: { branchId: branch.id, rankId: rank.id, unitId } });
    recordAction(draft, { actorPersonId: personId, commandType: "create_player_career", payload: { branchId: branch.id }, resultCode: "career_created" });
  }, ["people", "history", "equipment", "notifications", "actions"]);
  return commandResult({ code: "career_created", message: "Career created.", data: { personId }, notifications: [noticeId] });
}
