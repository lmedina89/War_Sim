import { createEntityId } from "../core/ids.js";
import { randomInt } from "../core/rng.js";
import { daysBetweenIso } from "./dateMath.js";
import { recordNotification } from "./recordServices.js";
import { personnelGenerationDefinition as personnelData } from "../data/personnelGeneration.js";
import { recordUnitEvent } from "./livingUnit.js";

export const PERSONNEL_STATUSES = Object.freeze([
  "active", "training", "leave", "tdy", "deployed", "hospitalized", "wounded", "missing", "pow", "separated", "retired", "deceased"
]);

function ensureAdminCollections(draft) {
  draft.entities.personnelActionRecords ??= {};
  draft.entities.replacementRequestRecords ??= {};
}

function recordPersonnelAction(draft, { personId, type, reason, fromUnitId = null, fromBilletId = null, toUnitId = null, toBilletId = null, status = "executed" }) {
  ensureAdminCollections(draft);
  const id = createEntityId(draft, "paction");
  draft.entities.personnelActionRecords[id] = { id, schemaVersion: 1, personId, type, reason, status, effectiveDate: draft.world.date, fromUnitId, fromBilletId, toUnitId, toBilletId };
  return id;
}

function closeOpenAssignments(draft, personId) {
  for (const record of Object.values(draft.entities.assignmentRecords)) if (record.personId === personId && record.endDate == null) record.endDate = draft.world.date;
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
  if (fromBilletId && draft.entities.billets[fromBilletId]?.assignedPersonId === personId) { draft.entities.billets[fromBilletId].assignedPersonId = null; draft.entities.billets[fromBilletId].status = "vacant"; }
  target.assignedPersonId = personId; target.status = "filled"; person.affiliation.unitId = target.unitId; person.affiliation.billetId = target.id;
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
  if (oldBilletId && draft.entities.billets[oldBilletId]?.assignedPersonId === personId) { draft.entities.billets[oldBilletId].assignedPersonId = null; draft.entities.billets[oldBilletId].status = "vacant"; }
  closeOpenAssignments(draft, personId);
  person.affiliation.unitId = oldUnitId; person.affiliation.billetId = null; person.condition.status = reason === "retirement" ? "retired" : "separated";
  const service = draft.entities.serviceRecords[person.serviceRecordId];
  if (service) {
    service.serviceStatus = person.condition.status; service.separationDate = draft.world.date;
    if (service.currentContractId && draft.entities.contractRecords[service.currentContractId]?.status === "active") draft.entities.contractRecords[service.currentContractId].status = "expired";
    for (const periodId of service.servicePeriodIds ?? []) { const period = draft.entities.servicePeriodRecords[periodId]; if (period?.endDate == null) { period.endDate = draft.world.date; period.status = "completed"; } }
  }
  for (const schedule of Object.values(draft.entities.scheduleRecords ?? {})) {
    if (schedule.personId !== personId || !["scheduled","in_progress"].includes(schedule.status)) continue;
    schedule.status = "cancelled"; schedule.cancelledDate = draft.world.date; schedule.cancellationReason = "service_separation";
  }
  for (const opportunity of Object.values(draft.entities.opportunityRecords ?? {})) {
    if (opportunity.personId !== personId || !["open","accepted","in_progress"].includes(opportunity.status)) continue;
    opportunity.status = "expired"; opportunity.expiredDate = draft.world.date; opportunity.expirationReason = "service_separation";
    const order = opportunity.orderId ? draft.entities.orderRecords?.[opportunity.orderId] : null;
    if (order && ["pending","executing"].includes(order.status)) order.status = "cancelled";
  }
  const actionId = recordPersonnelAction(draft, { personId, type: person.condition.status, reason, fromUnitId: oldUnitId, fromBilletId: oldBilletId });
  const orderId = createEntityId(draft, "order");
  draft.entities.orderRecords[orderId] = { id: orderId, schemaVersion: 1, personId, type: person.condition.status, status: "executed", issueDate: draft.world.date, effectiveDate: draft.world.date, unitId: null, billetId: null, title: person.condition.status === "retired" ? "Retirement Orders" : "Separation Orders", summary: reason === "ets" ? "Separated at expiration of term of service." : `Separated: ${reason.replaceAll("_", " ")}.` };
  if (oldUnitId) recordUnitEvent(draft,{unitId:oldUnitId,type:"personnel_departure",title:`${person.identity.displayName} departed`,summary:person.condition.status === "retired" ? "Retired from service." : "Separated from service.",personId,sourceType:"personnel_action",sourceId:actionId,importance:"significant"});
  if (personId === draft.playerPersonId) recordNotification(draft, { personId, type: "service_separation", title: "Service Complete", message: "Your active contract expired without a reenlistment. You have separated from active service.", priority: "high", references: { orderId } });
  return { actionId, orderId, vacatedBilletId: oldBilletId };
}

function generatedReplacementIdentity(draft) {
  const used = new Set(Object.values(draft.entities.people).map(p => p.identity.displayName));
  const maxAttempts = personnelData.firstNames.length * personnelData.lastNames.length;
  for (let i = 0; i < maxAttempts; i++) {
    const firstName = personnelData.firstNames[randomInt(draft, 0, personnelData.firstNames.length - 1)];
    const lastName = personnelData.lastNames[randomInt(draft, 0, personnelData.lastNames.length - 1)];
    const displayName = `${firstName} ${lastName}`;
    if (used.has(displayName)) continue;
    return { firstName, lastName, displayName };
  }
  const suffix = draft.world.nextEntitySequence;
  return { firstName: "Replacement", lastName: String(suffix), displayName: `Replacement ${suffix}` };
}

function replacementContext(draft, registries, billet) {
  const unit = draft.entities.units[billet.unitId];
  const billetDef = registries.billets.get(billet.definitionId);
  const generation = draft.world.generation ?? {};
  const profile = generation.generationProfileId && registries.generationProfiles.has(generation.generationProfileId)
    ? registries.generationProfiles.get(generation.generationProfileId)
    : registries.generationProfiles.values().find(p => p.branchId === unit.branchId && p.billetRankIdsByDefinitionId?.[billet.definitionId]);
  if (!profile) throw new Error(`No generation profile can replace ${billet.id}.`);
  const rankId = profile.billetRankIdsByDefinitionId?.[billet.definitionId];
  if (!rankId) throw new Error(`Generation profile ${profile.id} has no rank for ${billet.definitionId}.`);
  const scenario = generation.scenarioId && registries.careerStartScenarios.has(generation.scenarioId) ? registries.careerStartScenarios.get(generation.scenarioId) : null;
  const specialtyId = profile.billetSpecialtyIdsByDefinitionId?.[billet.definitionId];
  const specialty = specialtyId && registries.specialties.has(specialtyId) ? registries.specialties.get(specialtyId) : registries.specialties.values().find(s => s.branchId === unit.branchId && (s.eligibleBilletDefinitionIds ?? []).includes(billet.definitionId));
  if (!specialty) throw new Error(`No specialty is configured for ${billet.definitionId}.`);
  const component = scenario && registries.components.has(scenario.componentId) ? registries.components.get(scenario.componentId) : registries.components.values().find(c => c.branchId === unit.branchId && c.careerAvailable);
  if (!component) throw new Error(`No component is available for branch ${unit.branchId}.`);
  return { unit, billetDef, profile, rankId, specialtyId: specialty.id, componentId: component.id, branchId: unit.branchId, nationId: unit.nationId };
}

function fillReplacement(draft, registries, request) {
  const billet = draft.entities.billets[request.billetId];
  if (!billet || billet.status !== "vacant" || billet.assignedPersonId) { request.status = "cancelled"; return null; }
  const context = replacementContext(draft, registries, billet);
  const identity = generatedReplacementIdentity(draft);
  const personId = createEntityId(draft, "pers_repl"), serviceId = createEntityId(draft, "service"), loadoutId = createEntityId(draft, "loadout"), eqId = createEntityId(draft, "eq");
  draft.entities.people[personId] = { id: personId, schemaVersion: 5, identity, affiliation: { nationId: context.nationId, branchId: context.branchId, componentId: context.componentId, specialtyId: context.specialtyId, unitId: billet.unitId, billetId: billet.id, rankId: context.rankId }, career: { enlistmentDate: draft.world.date, experience: randomInt(draft, 350, 700), prestige: randomInt(draft, 3, 10), bonusEarnings: 0 }, condition: { health: randomInt(draft, ...personnelData.healthRange), morale: randomInt(draft, ...personnelData.moraleRange), fatigue: randomInt(draft, ...personnelData.fatigueRange), readiness: randomInt(draft, ...personnelData.readinessRange), status: "active" }, traitIds: [...personnelData.traits], loadoutId, serviceRecordId: serviceId, simulationTier: 2 };
  draft.entities.serviceRecords[serviceId] = { id: serviceId, schemaVersion: 2, personId, serviceStatus: "active", entryDate: draft.world.date, separationDate: null, branchId: context.branchId, componentId: context.componentId, specialtyId: context.specialtyId, currentContractId: null, servicePeriodIds: [] };
  draft.entities.equipmentInstances[eqId] = { id: eqId, schemaVersion: 1, definitionId: context.billetDef.primaryEquipmentDefinitionId, ownerPersonId: personId, condition: randomInt(draft, 94, 100), upgradeIds: [] };
  draft.entities.loadouts[loadoutId] = { id: loadoutId, schemaVersion: 2, ownerPersonId: personId, slots: { primaryWeaponInstanceId: eqId } };
  draft.entities.skillProfiles[`skills_${personId}`] = { id: `skills_${personId}`, schemaVersion: 1, personId, values: Object.fromEntries(registries.skills.values().map(skill => [skill.id, randomInt(draft, 25, 55)])) };
  billet.assignedPersonId = personId; billet.status = "filled";
  const assignmentId = createEntityId(draft, "assign");
  draft.entities.assignmentRecords[assignmentId] = { id: assignmentId, schemaVersion: 2, personId, unitId: billet.unitId, billetId: billet.id, startDate: draft.world.date, endDate: null, reason: "replacement_arrival" };
  const actionId=recordPersonnelAction(draft, { personId, type: "replacement_arrival", reason: "fill_vacancy", toUnitId: billet.unitId, toBilletId: billet.id });
  recordUnitEvent(draft,{unitId:billet.unitId,type:"replacement_arrival",title:`${identity.displayName} assigned`,summary:`Replacement arrived and filled ${context.billetDef.name}.`,personId,sourceType:"personnel_action",sourceId:actionId,importance:"significant"});
  request.status = "filled"; request.filledDate = draft.world.date; request.replacementPersonId = personId;
  return personId;
}

export function processPersonnelAdministration(draft, registries) {
  ensureAdminCollections(draft);
  // ETS is effective on the contract end date. A previously accepted reenlistment
  // activates first on that same date so continuous service never briefly separates.
  for (const service of Object.values(draft.entities.serviceRecords)) {
    if (service.serviceStatus !== "active" || !service.currentContractId) continue;
    let current = draft.entities.contractRecords[service.currentContractId];
    if (!current || current.personId !== service.personId || current.status !== "active") continue;
    while (service.serviceStatus === "active" && current && daysBetweenIso(current.endDate, draft.world.date) >= 0) {
      const successor = Object.values(draft.entities.contractRecords)
        .filter(record => record.personId === service.personId && record.status === "pending" && record.startDate <= current.endDate)
        .sort((a,b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))[0];
      if (!successor) {
        separatePersonAdministrative(draft, service.personId, "ets");
        break;
      }
      current.status = "completed";
      successor.status = "active";
      service.currentContractId = successor.id;
      current = successor;
    }
  }
  const existingOpen = new Set(Object.values(draft.entities.replacementRequestRecords).filter(r => r.status === "open").map(r => r.billetId));
  for (const billet of Object.values(draft.entities.billets)) {
    if (billet.status !== "vacant" || billet.assignedPersonId || existingOpen.has(billet.id)) continue;
    if (!draft.playerPersonId && billet.id === draft.world.generation?.startingBilletId) continue;
    const id = createEntityId(draft, "replreq");
    draft.entities.replacementRequestRecords[id] = { id, schemaVersion: 1, billetId: billet.id, unitId: billet.unitId, requestedDate: draft.world.date, status: "open", filledDate: null, replacementPersonId: null };
    existingOpen.add(billet.id);
  }
  for (const request of Object.values(draft.entities.replacementRequestRecords)) {
    if (request.status === "open" && daysBetweenIso(request.requestedDate, draft.world.date) >= 30) fillReplacement(draft, registries, request);
  }
}
