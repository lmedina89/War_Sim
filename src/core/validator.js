const REQUIRED_STORES = [
  "people", "units", "unitSlots", "serviceRecords", "loadouts", "equipmentInstances",
  "careerEvents", "assignmentRecords", "promotionRecords", "awardRecords",
  "qualificationRecords", "deploymentRecords", "casualtyRecords", "memorialRecords",
  "relationshipRecords"
];

function requireRef(errors, store, id, context) {
  if (id != null && !store[id]) errors.push(`${context}: missing reference ${id}.`);
}

export function validateWorldState(state, registries) {
  const errors = [];
  if (!state || typeof state !== "object") return { ok: false, errors: ["State must be an object."] };
  if (state.schemaVersion !== 2) errors.push(`Unsupported world-state schemaVersion: ${state.schemaVersion}`);
  if (!state.world?.date) errors.push("Missing world date.");

  for (const storeName of REQUIRED_STORES) {
    if (!state.entities?.[storeName] || typeof state.entities[storeName] !== "object") {
      errors.push(`Missing entity store: ${storeName}`);
    }
  }
  if (errors.some(error => error.startsWith("Missing entity store"))) return { ok: false, errors };

  const e = state.entities;
  if (state.playerPersonId) requireRef(errors, e.people, state.playerPersonId, "playerPersonId");

  for (const person of Object.values(e.people)) {
    if (!person.id) errors.push("Person missing id.");
    if (person.schemaVersion !== 2) errors.push(`${person.id}: unsupported Person schema.`);
    if (!registries.ranks.has(person.affiliation.rankId)) errors.push(`${person.id}: invalid rankId.`);
    if (!registries.roles.has(person.affiliation.roleId)) errors.push(`${person.id}: invalid roleId.`);
    if (!registries.branches.has(person.affiliation.branchId)) errors.push(`${person.id}: invalid branchId.`);
    requireRef(errors, e.units, person.affiliation.unitId, `${person.id}.unitId`);
    requireRef(errors, e.loadouts, person.loadoutId, `${person.id}.loadoutId`);
    requireRef(errors, e.serviceRecords, person.serviceRecordId, `${person.id}.serviceRecordId`);
  }

  for (const unit of Object.values(e.units)) {
    if (unit.schemaVersion !== 1) errors.push(`${unit.id}: unsupported Unit schema.`);
    if (!registries.unitDefinitions.has(unit.definitionId)) errors.push(`${unit.id}: invalid unit definition.`);
    for (const slotId of unit.slotIds ?? []) requireRef(errors, e.unitSlots, slotId, `${unit.id}.slotIds`);
    requireRef(errors, e.people, unit.commanderId, `${unit.id}.commanderId`);
  }

  for (const slot of Object.values(e.unitSlots)) {
    requireRef(errors, e.units, slot.unitId, `${slot.id}.unitId`);
    if (!registries.roles.has(slot.roleId)) errors.push(`${slot.id}: invalid roleId.`);
    requireRef(errors, e.people, slot.assignedPersonId, `${slot.id}.assignedPersonId`);
    if (slot.status === "filled" && !slot.assignedPersonId) errors.push(`${slot.id}: filled slot has no person.`);
    if (slot.status === "vacant" && slot.assignedPersonId) errors.push(`${slot.id}: vacant slot has a person.`);
  }

  for (const loadout of Object.values(e.loadouts)) {
    requireRef(errors, e.people, loadout.ownerPersonId, `${loadout.id}.ownerPersonId`);
    for (const itemId of Object.values(loadout.slots ?? {})) requireRef(errors, e.equipmentInstances, itemId, `${loadout.id}.slots`);
  }

  for (const item of Object.values(e.equipmentInstances)) {
    if (!registries.equipment.has(item.definitionId)) errors.push(`${item.id}: invalid equipment definition.`);
    requireRef(errors, e.people, item.ownerPersonId, `${item.id}.ownerPersonId`);
  }

  for (const record of Object.values(e.serviceRecords)) requireRef(errors, e.people, record.personId, `${record.id}.personId`);
  for (const record of Object.values(e.assignmentRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    requireRef(errors, e.units, record.unitId, `${record.id}.unitId`);
    if (!registries.roles.has(record.roleId)) errors.push(`${record.id}: invalid roleId.`);
  }
  for (const record of Object.values(e.promotionRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.ranks.has(record.rankId)) errors.push(`${record.id}: invalid rankId.`);
    if (!registries.ranks.has(record.previousRankId)) errors.push(`${record.id}: invalid previousRankId.`);
  }
  for (const record of Object.values(e.awardRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.awards.has(record.awardId)) errors.push(`${record.id}: invalid awardId.`);
  }
  for (const record of Object.values(e.qualificationRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.schools.has(record.schoolId)) errors.push(`${record.id}: invalid schoolId.`);
    if (!registries.qualifications.has(record.qualificationId)) errors.push(`${record.id}: invalid qualificationId.`);
  }
  for (const record of Object.values(e.casualtyRecords)) requireRef(errors, e.people, record.personId, `${record.id}.personId`);
  for (const record of Object.values(e.memorialRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    requireRef(errors, e.casualtyRecords, record.casualtyRecordId, `${record.id}.casualtyRecordId`);
  }
  for (const record of Object.values(e.relationshipRecords)) {
    requireRef(errors, e.people, record.personAId, `${record.id}.personAId`);
    requireRef(errors, e.people, record.personBId, `${record.id}.personBId`);
    if (record.personAId === record.personBId) errors.push(`${record.id}: relationship cannot reference the same person twice.`);
  }

  return { ok: errors.length === 0, errors };
}
