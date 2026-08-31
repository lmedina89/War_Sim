const REQUIRED_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances","careerEvents",
  "assignmentRecords","promotionRecords","awardRecords","qualificationRecords","deploymentRecords",
  "casualtyRecords","memorialRecords","relationshipRecords","notificationRecords","actionRecords"
];

function requireRef(errors, store, id, label) {
  if (id != null && !store[id]) errors.push(`${label}: missing reference ${id}.`);
}

export function validateWorldState(state, registries) {
  const errors = [];
  if (!state || typeof state !== "object") return { ok: false, errors: ["State must be an object."] };
  if (state.schemaVersion !== 4) errors.push(`Unsupported world-state schemaVersion ${state.schemaVersion}.`);

  const e = state.entities ?? {};
  for (const name of REQUIRED_STORES) {
    if (!e[name] || typeof e[name] !== "object") errors.push(`Missing entity store: ${name}.`);
  }
  if (errors.length) return { ok: false, errors };

  for (const unit of Object.values(e.units)) {
    if (!registries.organizations.has(unit.organizationDefinitionId)) errors.push(`${unit.id}: invalid organizationDefinitionId.`);
    if (!registries.echelons.has(unit.echelonId)) errors.push(`${unit.id}: invalid echelonId.`);
    requireRef(errors, e.units, unit.parentUnitId, `${unit.id}.parentUnitId`);
    for (const childId of unit.childUnitIds ?? []) requireRef(errors, e.units, childId, `${unit.id}.childUnitIds`);
  }

  for (const billet of Object.values(e.billets)) {
    requireRef(errors, e.units, billet.unitId, `${billet.id}.unitId`);
    if (!registries.billets.has(billet.definitionId)) errors.push(`${billet.id}: invalid billet definition.`);
    requireRef(errors, e.people, billet.assignedPersonId, `${billet.id}.assignedPersonId`);
  }

  for (const person of Object.values(e.people)) {
    if (!registries.ranks.has(person.affiliation.rankId)) errors.push(`${person.id}: invalid rankId.`);
    if (!registries.branches.has(person.affiliation.branchId)) errors.push(`${person.id}: invalid branchId.`);
    requireRef(errors, e.units, person.affiliation.unitId, `${person.id}.unitId`);
    requireRef(errors, e.billets, person.affiliation.billetId, `${person.id}.billetId`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]?.assignedPersonId !== person.id) {
      errors.push(`${person.id}: billet/person assignment mismatch.`);
    }
    requireRef(errors, e.serviceRecords, person.serviceRecordId, `${person.id}.serviceRecordId`);
    requireRef(errors, e.loadouts, person.loadoutId, `${person.id}.loadoutId`);
  }

  for (const record of Object.values(e.assignmentRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    requireRef(errors, e.units, record.unitId, `${record.id}.unitId`);
    requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`);
  }

  for (const record of Object.values(e.promotionRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.ranks.has(record.rankId)) errors.push(`${record.id}: invalid rankId.`);
  }

  for (const record of Object.values(e.qualificationRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.qualifications.has(record.qualificationId)) errors.push(`${record.id}: invalid qualificationId.`);
    if (!registries.schools.has(record.schoolId)) errors.push(`${record.id}: invalid schoolId.`);
  }

  for (const record of Object.values(e.awardRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.awards.has(record.awardId)) errors.push(`${record.id}: invalid awardId.`);
  }

  for (const record of Object.values(e.relationshipRecords)) {
    requireRef(errors, e.people, record.personAId, `${record.id}.personAId`);
    requireRef(errors, e.people, record.personBId, `${record.id}.personBId`);
  }

  if (state.playerPersonId) requireRef(errors, e.people, state.playerPersonId, "playerPersonId");
  return { ok: errors.length === 0, errors };
}
