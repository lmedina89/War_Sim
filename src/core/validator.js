const REQUIRED_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances","careerEvents",
  "assignmentRecords","promotionRecords","awardRecords","qualificationRecords","deploymentRecords",
  "casualtyRecords","memorialRecords","relationshipRecords","notificationRecords","actionRecords","orderRecords",
  "contractRecords","servicePeriodRecords","reenlistmentOfferRecords","careerChangeRequestRecords","interServiceTransferRecords",
  "personnelActionRecords","replacementRequestRecords"
];

function requireRef(errors, store, id, label) { if (id != null && !store[id]) errors.push(`${label}: missing reference ${id}.`); }

export function validateWorldState(state, registries) {
  const errors = [];
  if (!state || typeof state !== "object") return { ok: false, errors: ["State must be an object."] };
  if (state.schemaVersion !== 11) errors.push(`Unsupported world-state schemaVersion ${state.schemaVersion}.`);
  const e = state.entities ?? {};
  for (const name of REQUIRED_STORES) if (!e[name] || typeof e[name] !== "object") errors.push(`Missing entity store: ${name}.`);
  if (errors.length) return { ok: false, errors };
  if (!state.world?.generation || !Number.isInteger(state.world.generation.generatorVersion)) errors.push("Missing world generation metadata.");
  if (state.world?.generation?.scenarioId && !registries.careerStartScenarios.has(state.world.generation.scenarioId)) errors.push(`Invalid career-start scenario ${state.world.generation.scenarioId}.`);
  if (state.world?.generation?.generationProfileId && !registries.generationProfiles.has(state.world.generation.generationProfileId)) errors.push(`Invalid generation profile ${state.world.generation.generationProfileId}.`);
  if (state.world?.generation?.startingBilletId && !e.billets[state.world.generation.startingBilletId]) errors.push(`Missing generated starting billet ${state.world.generation.startingBilletId}.`);

  for (const unit of Object.values(e.units)) {
    if (!registries.organizations.has(unit.organizationDefinitionId)) errors.push(`${unit.id}: invalid organizationDefinitionId.`);
    if (!registries.echelons.has(unit.echelonId)) errors.push(`${unit.id}: invalid echelonId.`);
    requireRef(errors, e.units, unit.parentUnitId, `${unit.id}.parentUnitId`);
    if (new Set(unit.childUnitIds ?? []).size !== (unit.childUnitIds ?? []).length) errors.push(`${unit.id}: duplicate childUnitIds.`);
    for (const childId of unit.childUnitIds ?? []) {
      requireRef(errors, e.units, childId, `${unit.id}.childUnitIds`);
      if (e.units[childId] && e.units[childId].parentUnitId !== unit.id) errors.push(`${unit.id}/${childId}: parent-child unit mismatch.`);
    }
    if (unit.parentUnitId && e.units[unit.parentUnitId] && !(e.units[unit.parentUnitId].childUnitIds ?? []).includes(unit.id)) errors.push(`${unit.id}: parent does not list unit as child.`);
  }
  const assignedPersonToBillet = new Map();
  for (const billet of Object.values(e.billets)) {
    requireRef(errors, e.units, billet.unitId, `${billet.id}.unitId`);
    if (!registries.billets.has(billet.definitionId)) errors.push(`${billet.id}: invalid billet definition.`);
    const billetDef = registries.billets.has(billet.definitionId) ? registries.billets.get(billet.definitionId) : null;
    const billetUnit = e.units[billet.unitId];
    if (billetDef && billetUnit && billetDef.echelonId !== billetUnit.echelonId) errors.push(`${billet.id}: billet echelon does not match unit echelon.`);
    requireRef(errors, e.people, billet.assignedPersonId, `${billet.id}.assignedPersonId`);
    if (billet.assignedPersonId) {
      const prior = assignedPersonToBillet.get(billet.assignedPersonId);
      if (prior) errors.push(`${billet.assignedPersonId}: assigned to multiple billets (${prior}, ${billet.id}).`);
      else assignedPersonToBillet.set(billet.assignedPersonId, billet.id);
    }
  }
  for (const person of Object.values(e.people)) {
    if (!["active","training","leave","tdy","deployed","hospitalized","wounded","missing","pow","separated","retired","deceased"].includes(person.condition.status)) errors.push(`${person.id}: invalid personnel status ${person.condition.status}.`);
    if (!registries.ranks.has(person.affiliation.rankId)) errors.push(`${person.id}: invalid rankId.`); if (!registries.branches.has(person.affiliation.branchId)) errors.push(`${person.id}: invalid branchId.`);
    if (!registries.components.has(person.affiliation.componentId ?? "component_active")) errors.push(`${person.id}: invalid componentId.`); if (!registries.specialties.has(person.affiliation.specialtyId ?? "specialty_army_11b")) errors.push(`${person.id}: invalid specialtyId.`);
    requireRef(errors, e.units, person.affiliation.unitId, `${person.id}.unitId`); requireRef(errors, e.billets, person.affiliation.billetId, `${person.id}.billetId`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]?.assignedPersonId !== person.id) errors.push(`${person.id}: billet/person assignment mismatch.`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]?.unitId !== person.affiliation.unitId) errors.push(`${person.id}: person unit does not match billet unit.`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]) {
      const def = registries.billets.get(e.billets[person.affiliation.billetId].definitionId);
      const rank = registries.ranks.get(person.affiliation.rankId);
      if (def.branchId !== person.affiliation.branchId) errors.push(`${person.id}: billet branch does not match person branch.`);
      if (rank.hierarchyLevel < def.minimumRankLevel) errors.push(`${person.id}: rank is below billet minimum rank level.`);
    }
    requireRef(errors, e.serviceRecords, person.serviceRecordId, `${person.id}.serviceRecordId`); requireRef(errors, e.loadouts, person.loadoutId, `${person.id}.loadoutId`);
  }
  for (const service of Object.values(e.serviceRecords)) { requireRef(errors, e.people, service.personId, `${service.id}.personId`); if (service.branchId && !registries.branches.has(service.branchId)) errors.push(`${service.id}: invalid branchId.`); if (service.componentId && !registries.components.has(service.componentId)) errors.push(`${service.id}: invalid componentId.`); if (service.specialtyId && !registries.specialties.has(service.specialtyId)) errors.push(`${service.id}: invalid specialtyId.`); requireRef(errors, e.contractRecords, service.currentContractId, `${service.id}.currentContractId`); for (const id of service.servicePeriodIds ?? []) requireRef(errors, e.servicePeriodRecords, id, `${service.id}.servicePeriodIds`); }
  for (const record of Object.values(e.contractRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.contracts.has(record.contractDefinitionId)) errors.push(`${record.id}: invalid contractDefinitionId.`); if (!registries.components.has(record.componentId)) errors.push(`${record.id}: invalid componentId.`); if (!registries.specialties.has(record.specialtyId)) errors.push(`${record.id}: invalid specialtyId.`); }
  for (const record of Object.values(e.servicePeriodRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.branches.has(record.branchId)) errors.push(`${record.id}: invalid branchId.`); if (!registries.components.has(record.componentId)) errors.push(`${record.id}: invalid componentId.`); if (!registries.specialties.has(record.specialtyId)) errors.push(`${record.id}: invalid specialtyId.`); }
  for (const record of Object.values(e.reenlistmentOfferRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.contracts.has(record.contractDefinitionId)) errors.push(`${record.id}: invalid contractDefinitionId.`); }
  for (const record of Object.values(e.assignmentRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); }
  for (const record of Object.values(e.promotionRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.ranks.has(record.rankId)) errors.push(`${record.id}: invalid rankId.`); }
  for (const record of Object.values(e.qualificationRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.qualifications.has(record.qualificationId)) errors.push(`${record.id}: invalid qualificationId.`); if (!registries.schools.has(record.schoolId)) errors.push(`${record.id}: invalid schoolId.`); }
  for (const record of Object.values(e.awardRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.awards.has(record.awardId)) errors.push(`${record.id}: invalid awardId.`); }
  for (const record of Object.values(e.relationshipRecords)) { requireRef(errors, e.people, record.personAId, `${record.id}.personAId`); requireRef(errors, e.people, record.personBId, `${record.id}.personBId`); }
  for (const record of Object.values(e.personnelActionRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.fromUnitId, `${record.id}.fromUnitId`); requireRef(errors, e.units, record.toUnitId, `${record.id}.toUnitId`); requireRef(errors, e.billets, record.fromBilletId, `${record.id}.fromBilletId`); requireRef(errors, e.billets, record.toBilletId, `${record.id}.toBilletId`); }
  for (const record of Object.values(e.replacementRequestRecords)) { requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); requireRef(errors, e.people, record.replacementPersonId, `${record.id}.replacementPersonId`); }
  for (const record of Object.values(e.orderRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); }
  if (state.playerPersonId) requireRef(errors, e.people, state.playerPersonId, "playerPersonId");
  return { ok: errors.length === 0, errors };
}
