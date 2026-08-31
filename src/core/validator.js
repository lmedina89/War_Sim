const REQUIRED_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances",
  "careerEvents","assignmentRecords","promotionRecords","awardRecords",
  "qualificationRecords","deploymentRecords","casualtyRecords","memorialRecords",
  "relationshipRecords","notificationRecords","actionRecords"
];

export function validateWorldState(state, registries) {
  const errors = [];

  if (!state || typeof state !== "object") errors.push("State must be an object.");
  if (state?.schemaVersion !== 4) errors.push("Unsupported world-state schemaVersion.");
  if (!state?.playerPersonId) errors.push("Missing playerPersonId.");

  for (const storeName of REQUIRED_STORES) {
    if (!state?.entities?.[storeName] || typeof state.entities[storeName] !== "object") {
      errors.push(`Missing entity store: ${storeName}`);
    }
  }

  const units = state?.entities?.units ?? {};
  const billets = state?.entities?.billets ?? {};
  const people = state?.entities?.people ?? {};

  for (const unit of Object.values(units)) {
    if (!registries.organizations.has(unit.organizationDefinitionId)) errors.push(`${unit.id}: invalid organizationDefinitionId.`);
    if (!registries.echelons.has(unit.echelonId)) errors.push(`${unit.id}: invalid echelonId.`);
    if (unit.parentUnitId && !units[unit.parentUnitId]) errors.push(`${unit.id}: missing parent unit.`);
    for (const childUnitId of unit.childUnitIds ?? []) {
      if (!units[childUnitId]) errors.push(`${unit.id}: missing child unit ${childUnitId}.`);
    }
  }

  for (const billet of Object.values(billets)) {
    if (!units[billet.unitId]) errors.push(`${billet.id}: unit does not exist.`);
    if (!registries.billets.has(billet.definitionId)) errors.push(`${billet.id}: invalid billet definition.`);
    if (billet.assignedPersonId && !people[billet.assignedPersonId]) errors.push(`${billet.id}: assigned person does not exist.`);
  }

  for (const person of Object.values(people)) {
    if (!registries.ranks.has(person.affiliation.rankId)) errors.push(`${person.id}: invalid rankId.`);
    if (!registries.branches.has(person.affiliation.branchId)) errors.push(`${person.id}: invalid branchId.`);
    if (person.affiliation.unitId && !units[person.affiliation.unitId]) errors.push(`${person.id}: unitId does not exist.`);
    if (person.affiliation.billetId) {
      const billet = billets[person.affiliation.billetId];
      if (!billet) errors.push(`${person.id}: billetId does not exist.`);
      else if (billet.assignedPersonId !== person.id) errors.push(`${person.id}: billet/person assignment mismatch.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateDefinitions(registries) {
  const errors = [];

  for (const billet of registries.billets.values()) {
    if (!registries.echelons.has(billet.echelonId)) errors.push(`${billet.id}: invalid echelonId`);
    if (!registries.branches.has(billet.branchId)) errors.push(`${billet.id}: invalid branchId`);
    if (!registries.roles.has(billet.roleId)) errors.push(`${billet.id}: invalid roleId`);
  }

  for (const org of registries.organizations.values()) {
    if (!registries.echelons.has(org.echelonId)) errors.push(`${org.id}: invalid echelonId`);
    if (!registries.branches.has(org.branchId)) errors.push(`${org.id}: invalid branchId`);
    for (const billetId of org.billetDefinitionIds ?? []) {
      if (!registries.billets.has(billetId)) errors.push(`${org.id}: invalid billetDefinitionId ${billetId}`);
    }
    for (const childId of org.childOrganizationDefinitionIds ?? []) {
      if (!registries.organizations.has(childId)) errors.push(`${org.id}: invalid child organization ${childId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
