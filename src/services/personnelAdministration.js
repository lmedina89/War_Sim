import { createEntityId } from "../core/ids.js";
import { daysBetweenIso } from "./dateMath.js";
import { npcIdentityForIndex } from "./organizationSeed.js";
import { recordNotification } from "./recordServices.js";

export const PERSONNEL_STATUSES = Object.freeze([
  "active", "training", "leave", "tdy", "deployed", "hospitalized", "wounded", "missing", "pow", "separated", "retired", "deceased"
]);

const RANK_BY_BILLET = Object.freeze({
  billet_company_commander: "rank_army_o3",
  billet_executive_officer: "rank_army_o1",
  billet_first_sergeant: "rank_army_e8",
  billet_company_clerk: "rank_army_e3",
  billet_platoon_leader: "rank_army_o1",
  billet_platoon_sergeant: "rank_army_e7",
  billet_squad_leader: "rank_army_e5",
  billet_team_leader: "rank_army_e4",
  billet_grenadier: "rank_army_e3",
  billet_automatic_rifleman: "rank_army_e3",
  billet_rifleman: "rank_army_e2"
});

function ensureAdminCollections(draft) {
  draft.entities.personnelActionRecords ??= {};
  draft.entities.replacementRequestRecords ??= {};
}

function recordPersonnelAction(draft, { personId, type, reason, fromUnitId = null, fromBilletId = null, toUnitId = null, toBilletId = null, status = "executed" }) {
  ensureAdminCollections(draft);
  const id = createEntityId(draft, "paction");
  draft.entities.personnelActionRecords[id] = {
    id, schemaVersion: 1, personId, type, reason, status,
    effectiveDate: draft.world.date, fromUnitId, fromBilletId, toUnitId, toBilletId
  };
  return id;
}

function closeOpenAssignments(draft, personId) {
  for (const record of Object.values(draft.entities.assignmentRecords)) {
    if (record.personId === personId && record.endDate == null) record.endDate = draft.world.date;
  }
}

export function changePersonnelStatus(draft, personId, nextStatus, reason = "administrative") {
  if (!PERSONNEL_STATUSES.includes(nextStatus)) throw new Error(`Unsupported personnel status: ${nextStatus}`);
  const person = draft.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const previousStatus = person.condition.status;
  if (previousStatus === nextStatus) return null;
  person.condition.status = nextStatus;
  return recordPersonnelAction(draft, { personId, type: "status_change", reason: `${reason}:${previousStatus}->${nextStatus}` });
}

export function reassignPersonAdministrative(draft, personId, targetBilletId, reason = "reassignment") {
  ensureAdminCollections(draft);
  const person = draft.entities.people[personId], target = draft.entities.billets[targetBilletId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  if (!target) throw new Error(`Unknown billet: ${targetBilletId}`);
  if (target.assignedPersonId && target.assignedPersonId !== personId) throw new Error(`Billet ${targetBilletId} is occupied.`);

  const fromUnitId = person.affiliation.unitId ?? null, fromBilletId = person.affiliation.billetId ?? null;
  if (fromBilletId && draft.entities.billets[fromBilletId]?.assignedPersonId === personId) {
    draft.entities.billets[fromBilletId].assignedPersonId = null;
    draft.entities.billets[fromBilletId].status = "vacant";
  }
  target.assignedPersonId = personId;
  target.status = "filled";
  person.affiliation.unitId = target.unitId;
  person.affiliation.billetId = target.id;
  if (["separated", "retired"].includes(person.condition.status)) person.condition.status = "active";

  closeOpenAssignments(draft, personId);
  const assignmentId = createEntityId(draft, "assign");
  draft.entities.assignmentRecords[assignmentId] = { id: assignmentId, schemaVersion: 2, personId, unitId: target.unitId, billetId: target.id, startDate: draft.world.date, endDate: null, reason };
  const actionId = recordPersonnelAction(draft, { personId, type: "reassignment", reason, fromUnitId, fromBilletId, toUnitId: target.unitId, toBilletId: target.id });
  const orderId = createEntityId(draft, "order");
  draft.entities.orderRecords[orderId] = { id: orderId, schemaVersion: 1, personId, type: "reassignment", status: "executed", issueDate: draft.world.date, effectiveDate: draft.world.date, unitId: target.unitId, billetId: target.id, title: "Reassignment Orders", summary: `Reassigned for ${reason.replaceAll("_", " ")}.` };
  return { assignmentId, actionId, orderId };
}

export function separatePersonAdministrative(draft, personId, reason = "ets") {
  ensureAdminCollections(draft);
  const person = draft.entities.people[personId];
  if (!person || ["separated", "retired", "deceased"].includes(person.condition.status)) return null;
  const oldUnitId = person.affiliation.unitId ?? null, oldBilletId = person.affiliation.billetId ?? null;
  if (oldBilletId && draft.entities.billets[oldBilletId]?.assignedPersonId === personId) {
    draft.entities.billets[oldBilletId].assignedPersonId = null;
    draft.entities.billets[oldBilletId].status = "vacant";
  }
  closeOpenAssignments(draft, personId);
  person.affiliation.unitId = oldUnitId; // retain last assignment for career context; indexes require an active billet
  person.affiliation.billetId = null;
  person.condition.status = reason === "retirement" ? "retired" : "separated";

  const service = draft.entities.serviceRecords[person.serviceRecordId];
  if (service) {
    service.serviceStatus = person.condition.status;
    service.separationDate = draft.world.date;
    if (service.currentContractId && draft.entities.contractRecords[service.currentContractId]?.status === "active") draft.entities.contractRecords[service.currentContractId].status = "expired";
    for (const periodId of service.servicePeriodIds ?? []) {
      const period = draft.entities.servicePeriodRecords[periodId];
      if (period?.endDate == null) { period.endDate = draft.world.date; period.status = "completed"; }
    }
  }
  const actionId = recordPersonnelAction(draft, { personId, type: person.condition.status, reason, fromUnitId: oldUnitId, fromBilletId: oldBilletId });
  const orderId = createEntityId(draft, "order");
  draft.entities.orderRecords[orderId] = { id: orderId, schemaVersion: 1, personId, type: person.condition.status, status: "executed", issueDate: draft.world.date, effectiveDate: draft.world.date, unitId: null, billetId: null, title: person.condition.status === "retired" ? "Retirement Orders" : "Separation Orders", summary: reason === "ets" ? "Separated at expiration of term of service." : `Separated: ${reason.replaceAll("_", " ")}.` };
  if (personId === draft.playerPersonId) recordNotification(draft, { personId, type: "service_separation", title: "Service Complete", message: "Your active contract expired without a reenlistment. You have separated from active service.", priority: "high", references: { orderId } });
  return { actionId, orderId, vacatedBilletId: oldBilletId };
}

function identityNotUsed(draft, startIndex) {
  const used = new Set(Object.values(draft.entities.people).map(p => p.identity.displayName));
  let index = startIndex;
  for (let guard = 0; guard < 500; guard++, index++) {
    const identity = npcIdentityForIndex(index);
    if (!used.has(identity.displayName)) return { identity, index };
  }
  return { identity: { firstName: "Replacement", lastName: String(startIndex), displayName: `Replacement ${startIndex}` }, index: startIndex };
}

function fillReplacement(draft, request) {
  const billet = draft.entities.billets[request.billetId];
  if (!billet || billet.status !== "vacant" || billet.assignedPersonId) { request.status = "cancelled"; return null; }
  const identityResult = identityNotUsed(draft, draft.world.nextEntitySequence + 150);
  const personId = createEntityId(draft, "pers_repl"), serviceId = createEntityId(draft, "service"), loadoutId = createEntityId(draft, "loadout"), eqId = createEntityId(draft, "eq");
  const rankId = RANK_BY_BILLET[billet.definitionId] ?? "rank_army_e2";
  draft.entities.people[personId] = { id: personId, schemaVersion: 4, identity: identityResult.identity, affiliation: { nationId: "nation_demo", branchId: "branch_army", componentId: "component_active", specialtyId: "specialty_army_11b", unitId: billet.unitId, billetId: billet.id, rankId }, career: { enlistmentDate: draft.world.date, experience: 450, prestige: 5, bonusEarnings: 0 }, condition: { health: 100, morale: 72, fatigue: 0, readiness: 70, status: "active" }, traitIds: ["trait_steady"], loadoutId, serviceRecordId: serviceId, simulationTier: 2 };
  draft.entities.serviceRecords[serviceId] = { id: serviceId, schemaVersion: 2, personId, serviceStatus: "active", entryDate: draft.world.date, separationDate: null, branchId: "branch_army", componentId: "component_active", specialtyId: "specialty_army_11b", currentContractId: null, servicePeriodIds: [] };
  draft.entities.equipmentInstances[eqId] = { id: eqId, schemaVersion: 1, definitionId: billet.definitionId === "billet_automatic_rifleman" ? "weapon_auto_rifle" : "weapon_service_rifle", ownerPersonId: personId, condition: 100, upgradeIds: [] };
  draft.entities.loadouts[loadoutId] = { id: loadoutId, schemaVersion: 2, ownerPersonId: personId, slots: { primaryWeaponInstanceId: eqId } };
  billet.assignedPersonId = personId; billet.status = "filled";
  const assignmentId = createEntityId(draft, "assign");
  draft.entities.assignmentRecords[assignmentId] = { id: assignmentId, schemaVersion: 2, personId, unitId: billet.unitId, billetId: billet.id, startDate: draft.world.date, endDate: null, reason: "replacement_arrival" };
  recordPersonnelAction(draft, { personId, type: "replacement_arrival", reason: "fill_vacancy", toUnitId: billet.unitId, toBilletId: billet.id });
  request.status = "filled"; request.filledDate = draft.world.date; request.replacementPersonId = personId;
  return personId;
}

export function processPersonnelAdministration(draft) {
  ensureAdminCollections(draft);
  // Contracts are authoritative for ETS. Expiration separates the member but preserves history.
  for (const contract of Object.values(draft.entities.contractRecords)) {
    if (contract.status !== "active" || daysBetweenIso(contract.endDate, draft.world.date) <= 0) continue;
    separatePersonAdministrative(draft, contract.personId, "ets");
  }

  // Create one durable request per vacant billet. Keep the designated player-start billet open
  // when no player career exists so a new career can always be created.
  const existingOpen = new Set(Object.values(draft.entities.replacementRequestRecords).filter(r => r.status === "open").map(r => r.billetId));
  for (const billet of Object.values(draft.entities.billets)) {
    if (billet.status !== "vacant" || billet.assignedPersonId) continue;
    if (!draft.playerPersonId && billet.id === "billet_player") continue;
    if (existingOpen.has(billet.id)) continue;
    const id = createEntityId(draft, "replreq");
    draft.entities.replacementRequestRecords[id] = { id, schemaVersion: 1, billetId: billet.id, unitId: billet.unitId, requestedDate: draft.world.date, status: "open", filledDate: null, replacementPersonId: null };
    existingOpen.add(billet.id);
  }

  // Replacement latency: requests mature after 30 in-world days.
  for (const request of Object.values(draft.entities.replacementRequestRecords)) {
    if (request.status !== "open") continue;
    if (daysBetweenIso(request.requestedDate, draft.world.date) >= 30) fillReplacement(draft, request);
  }
}
