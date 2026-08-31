const REQUIRED_STORES = [
  "people","units","billets","serviceRecords","loadouts","equipmentInstances","careerEvents",
  "assignmentRecords","promotionRecords","awardRecords","qualificationRecords","qualificationAttemptRecords","deploymentRecords",
  "casualtyRecords","memorialRecords","relationshipRecords","notificationRecords","actionRecords","orderRecords",
  "contractRecords","servicePeriodRecords","reenlistmentOfferRecords","careerChangeRequestRecords","interServiceTransferRecords",
  "personnelActionRecords","replacementRequestRecords","skillProfiles","activityRecords","performanceRecords","gameplayEventRecords","militaryEducationRecords",
  "unitTrainingProfiles","scheduleRecords","opportunityRecords","objectiveRecords","unitEventRecords","unitReadinessSnapshots","personalityProfiles","relationshipMemoryRecords"
];

function requireRef(errors, store, id, label) { if (id != null && !store[id]) errors.push(`${label}: missing reference ${id}.`); }

export function validateWorldState(state, registries) {
  const errors = [];
  if (!state || typeof state !== "object") return { ok: false, errors: ["State must be an object."] };
  if (state.schemaVersion !== 16) errors.push(`Unsupported world-state schemaVersion ${state.schemaVersion}.`);
  const e = state.entities ?? {};
  for (const name of REQUIRED_STORES) if (!e[name] || typeof e[name] !== "object") errors.push(`Missing entity store: ${name}.`);
  if (errors.length) return { ok: false, errors };
  if (!state.world?.generation || !Number.isInteger(state.world.generation.generatorVersion)) errors.push("Missing world generation metadata.");
  if (state.world?.generation?.scenarioId && !registries.careerStartScenarios.has(state.world.generation.scenarioId)) errors.push(`Invalid career-start scenario ${state.world.generation.scenarioId}.`);
  if (state.world?.generation?.generationProfileId && !registries.generationProfiles.has(state.world.generation.generationProfileId)) errors.push(`Invalid generation profile ${state.world.generation.generationProfileId}.`);
  if (state.world?.generation?.startingBilletId && !e.billets[state.world.generation.startingBilletId]) errors.push(`Missing generated starting billet ${state.world.generation.startingBilletId}.`);
  if (state.world?.formationIdentityId && !registries.formations.has(state.world.formationIdentityId)) errors.push(`Invalid formation identity ${state.world.formationIdentityId}.`);

  for (const unit of Object.values(e.units)) {
    if (!registries.organizations.has(unit.organizationDefinitionId)) errors.push(`${unit.id}: invalid organizationDefinitionId.`);
    if (!registries.echelons.has(unit.echelonId)) errors.push(`${unit.id}: invalid echelonId.`);
    if (unit.readinessModelId && !registries.readinessModels.has(unit.readinessModelId)) errors.push(`${unit.id}: invalid readinessModelId ${unit.readinessModelId}.`);
    if (unit.formationId && !registries.formations.has(unit.formationId)) errors.push(`${unit.id}: invalid formationId ${unit.formationId}.`);
    requireRef(errors, e.units, unit.parentUnitId, `${unit.id}.parentUnitId`);
    if (new Set(unit.childUnitIds ?? []).size !== (unit.childUnitIds ?? []).length) errors.push(`${unit.id}: duplicate childUnitIds.`);
    for (const childId of unit.childUnitIds ?? []) {
      requireRef(errors, e.units, childId, `${unit.id}.childUnitIds`);
      if (e.units[childId] && e.units[childId].parentUnitId !== unit.id) errors.push(`${unit.id}/${childId}: parent-child unit mismatch.`);
    }
    if (unit.parentUnitId && e.units[unit.parentUnitId] && !(e.units[unit.parentUnitId].childUnitIds ?? []).includes(unit.id)) errors.push(`${unit.id}: parent does not list unit as child.`);
    const ancestry = new Set([unit.id]);
    let cursor = unit.parentUnitId ? e.units[unit.parentUnitId] : null;
    while (cursor) {
      if (ancestry.has(cursor.id)) { errors.push(`${unit.id}: cyclic unit ancestry detected.`); break; }
      ancestry.add(cursor.id);
      cursor = cursor.parentUnitId ? e.units[cursor.parentUnitId] : null;
    }
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
    if (!registries.components.has(person.affiliation.componentId)) errors.push(`${person.id}: invalid componentId.`); if (!registries.specialties.has(person.affiliation.specialtyId)) errors.push(`${person.id}: invalid specialtyId.`);
    requireRef(errors, e.units, person.affiliation.unitId, `${person.id}.unitId`); requireRef(errors, e.billets, person.affiliation.billetId, `${person.id}.billetId`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]?.assignedPersonId !== person.id) errors.push(`${person.id}: billet/person assignment mismatch.`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]?.unitId !== person.affiliation.unitId) errors.push(`${person.id}: person unit does not match billet unit.`);
    if (person.affiliation.billetId && e.billets[person.affiliation.billetId]) {
      const def = registries.billets.get(e.billets[person.affiliation.billetId].definitionId);
      const rank = registries.ranks.get(person.affiliation.rankId);
      if (def.branchId !== person.affiliation.branchId) errors.push(`${person.id}: billet branch does not match person branch.`);
      if (rank.hierarchyLevel < def.minimumRankLevel) {
        const minimumRank = registries.ranks.values()
          .filter(candidate => candidate.branchId === person.affiliation.branchId && candidate.category === rank.category && candidate.hierarchyLevel >= def.minimumRankLevel)
          .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel || a.id.localeCompare(b.id))[0];
        const required = minimumRank ? `${minimumRank.abbreviation} (${minimumRank.id}) or higher` : `hierarchy level ${def.minimumRankLevel}+`;
        errors.push(`${person.id}: ${def.name} (${e.billets[person.affiliation.billetId].id}) requires ${required}; assigned ${rank.abbreviation} (${rank.id}).`);
      }
    }
    requireRef(errors, e.serviceRecords, person.serviceRecordId, `${person.id}.serviceRecordId`); requireRef(errors, e.loadouts, person.loadoutId, `${person.id}.loadoutId`);
  }
  for (const loadout of Object.values(e.loadouts)) {
    requireRef(errors, e.people, loadout.ownerPersonId, `${loadout.id}.ownerPersonId`);
    for (const [slotName, instanceId] of Object.entries(loadout.slots ?? {})) {
      requireRef(errors, e.equipmentInstances, instanceId, `${loadout.id}.${slotName}`);
      if (instanceId && e.equipmentInstances[instanceId]?.ownerPersonId !== loadout.ownerPersonId) errors.push(`${loadout.id}.${slotName}: equipment owner mismatch.`);
    }
  }
  for (const item of Object.values(e.equipmentInstances)) {
    requireRef(errors, e.people, item.ownerPersonId, `${item.id}.ownerPersonId`);
    if (!registries.equipment.has(item.definitionId)) errors.push(`${item.id}: invalid equipment definition ${item.definitionId}.`);
    if (!Number.isFinite(Number(item.condition)) || Number(item.condition) < 0 || Number(item.condition) > 100) errors.push(`${item.id}: invalid equipment condition.`);
  }
  for (const event of Object.values(e.careerEvents)) {
    requireRef(errors, e.people, event.personId, `${event.id}.personId`);
    if (!event.type || typeof event.type !== "string") errors.push(`${event.id}: invalid career event type.`);
    if (!event.date || Number.isNaN(Date.parse(`${event.date}T00:00:00Z`))) errors.push(`${event.id}: invalid career event date.`);
  }
  for (const service of Object.values(e.serviceRecords)) { requireRef(errors, e.people, service.personId, `${service.id}.personId`); if (service.branchId && !registries.branches.has(service.branchId)) errors.push(`${service.id}: invalid branchId.`); if (service.componentId && !registries.components.has(service.componentId)) errors.push(`${service.id}: invalid componentId.`); if (service.specialtyId && !registries.specialties.has(service.specialtyId)) errors.push(`${service.id}: invalid specialtyId.`); requireRef(errors, e.contractRecords, service.currentContractId, `${service.id}.currentContractId`); for (const id of service.servicePeriodIds ?? []) requireRef(errors, e.servicePeriodRecords, id, `${service.id}.servicePeriodIds`); }
  for (const record of Object.values(e.contractRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.contracts.has(record.contractDefinitionId)) errors.push(`${record.id}: invalid contractDefinitionId.`); if (!registries.components.has(record.componentId)) errors.push(`${record.id}: invalid componentId.`); if (!registries.specialties.has(record.specialtyId)) errors.push(`${record.id}: invalid specialtyId.`); }
  for (const record of Object.values(e.servicePeriodRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.branches.has(record.branchId)) errors.push(`${record.id}: invalid branchId.`); if (!registries.components.has(record.componentId)) errors.push(`${record.id}: invalid componentId.`); if (!registries.specialties.has(record.specialtyId)) errors.push(`${record.id}: invalid specialtyId.`); }
  for (const record of Object.values(e.reenlistmentOfferRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.contracts.has(record.contractDefinitionId)) errors.push(`${record.id}: invalid contractDefinitionId.`); }
  for (const record of Object.values(e.assignmentRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); }
  for (const record of Object.values(e.promotionRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.ranks.has(record.rankId)) errors.push(`${record.id}: invalid rankId.`);
    if (record.previousRankId != null && !registries.ranks.has(record.previousRankId)) errors.push(`${record.id}: invalid previousRankId.`);
    if (!record.effectiveDate || Number.isNaN(Date.parse(`${record.effectiveDate}T00:00:00Z`))) errors.push(`${record.id}: invalid effectiveDate.`);
  }
  for (const record of Object.values(e.qualificationRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.qualifications.has(record.qualificationId)) errors.push(`${record.id}: invalid qualificationId.`);
    if (record.schoolId != null && !registries.schools.has(record.schoolId)) errors.push(`${record.id}: invalid schoolId.`);
    if (record.score != null && !Number.isFinite(Number(record.score))) errors.push(`${record.id}: invalid qualification score.`);
    if (record.maxScore != null && (!Number.isFinite(Number(record.maxScore)) || Number(record.maxScore) <= 0)) errors.push(`${record.id}: invalid qualification maxScore.`);
    if (record.score != null && record.maxScore != null && (Number(record.score) < 0 || Number(record.score) > Number(record.maxScore))) errors.push(`${record.id}: qualification score outside range.`);
  }
  for (const record of Object.values(e.qualificationAttemptRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.qualifications.has(record.qualificationId)) errors.push(`${record.id}: invalid qualificationId.`);
    if (!Number.isFinite(Number(record.score)) || Number(record.score) < 0) errors.push(`${record.id}: invalid attempt score.`);
    if (!Number.isFinite(Number(record.maxScore)) || Number(record.maxScore) <= 0) errors.push(`${record.id}: invalid attempt maxScore.`);
    if (Number(record.score) > Number(record.maxScore)) errors.push(`${record.id}: attempt score outside range.`);
    if (typeof record.qualified !== "boolean") errors.push(`${record.id}: qualified must be boolean.`);
    if (!record.result || typeof record.result !== "string") errors.push(`${record.id}: invalid attempt result.`);
    if (!Number.isInteger(record.elapsedDay) || record.elapsedDay < 0) errors.push(`${record.id}: invalid elapsedDay.`);
  }
  for (const record of Object.values(e.awardRecords)) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.awards.has(record.awardId)) errors.push(`${record.id}: invalid awardId.`);
    if (!record.earnedDate || Number.isNaN(Date.parse(`${record.earnedDate}T00:00:00Z`))) errors.push(`${record.id}: invalid earnedDate.`);
  }
  for (const record of Object.values(e.militaryEducationRecords ?? {})) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.schools.has(record.schoolId)) errors.push(`${record.id}: invalid schoolId.`); if (!["graduated","failed","recycled","withdrawn"].includes(record.status)) errors.push(`${record.id}: invalid education status ${record.status}.`); }
  for (const record of Object.values(e.relationshipRecords)) { requireRef(errors, e.people, record.personAId, `${record.id}.personAId`); requireRef(errors, e.people, record.personBId, `${record.id}.personBId`); }
  for (const record of Object.values(e.personnelActionRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.fromUnitId, `${record.id}.fromUnitId`); requireRef(errors, e.units, record.toUnitId, `${record.id}.toUnitId`); requireRef(errors, e.billets, record.fromBilletId, `${record.id}.fromBilletId`); requireRef(errors, e.billets, record.toBilletId, `${record.id}.toBilletId`); }
  for (const record of Object.values(e.replacementRequestRecords)) { requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); requireRef(errors, e.people, record.replacementPersonId, `${record.id}.replacementPersonId`); }
  for (const record of Object.values(e.orderRecords)) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); requireRef(errors, e.billets, record.billetId, `${record.id}.billetId`); }

  const skillProfilePersons = new Set();
  for (const profile of Object.values(e.skillProfiles ?? {})) {
    requireRef(errors, e.people, profile.personId, `${profile.id}.personId`);
    if (skillProfilePersons.has(profile.personId)) errors.push(`${profile.personId}: multiple skill profiles.`);
    skillProfilePersons.add(profile.personId);
    for (const skill of registries.skills.values()) {
      const value = profile.values?.[skill.id];
      if (!Number.isFinite(value) || value < skill.minimum || value > skill.maximum) errors.push(`${profile.id}: invalid ${skill.id} value ${value}.`);
    }
  }
  for (const person of Object.values(e.people)) if (!skillProfilePersons.has(person.id)) errors.push(`${person.id}: missing skill profile.`);
  for (const record of Object.values(e.activityRecords ?? {})) { requireRef(errors, e.people, record.personId, `${record.id}.personId`); if (!registries.activities.has(record.activityDefinitionId)) errors.push(`${record.id}: invalid activityDefinitionId.`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`); }
  for (const record of Object.values(e.performanceRecords ?? {})) requireRef(errors, e.people, record.personId, `${record.id}.personId`);
  for (const record of Object.values(e.gameplayEventRecords ?? {})) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.gameplayEvents.has(record.definitionId)) errors.push(`${record.id}: invalid gameplay event definition.`);
    if (!["pending","resolved"].includes(record.status)) errors.push(`${record.id}: invalid gameplay event status ${record.status}.`);
    const def = registries.gameplayEvents.has(record.definitionId) ? registries.gameplayEvents.get(record.definitionId) : null;
    if (record.selectedChoiceId && !(def?.choices ?? []).some(choice => choice.id === record.selectedChoiceId)) errors.push(`${record.id}: invalid selected choice ${record.selectedChoiceId}.`);
  }


  const unitTrainingUnits = new Set();
  for (const profile of Object.values(e.unitTrainingProfiles ?? {})) {
    requireRef(errors, e.units, profile.unitId, `${profile.id}.unitId`);
    if (!registries.readinessModels.has(profile.readinessModelId)) errors.push(`${profile.id}: invalid readinessModelId ${profile.readinessModelId}.`);
    if (unitTrainingUnits.has(profile.unitId)) errors.push(`${profile.unitId}: multiple unit training profiles.`);
    unitTrainingUnits.add(profile.unitId);
    for (const key of ["physical","weapons","tactical","cohesion","discipline","equipmentReadiness"]) {
      const value = profile.values?.[key];
      if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`${profile.id}: invalid ${key} value ${value}.`);
    }
  }
  for (const unit of Object.values(e.units)) if (!unitTrainingUnits.has(unit.id)) errors.push(`${unit.id}: missing unit training profile.`);
  for (const record of Object.values(e.scheduleRecords ?? {})) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`); requireRef(errors, e.units, record.unitId, `${record.id}.unitId`);
    if (!registries.duties.has(record.dutyDefinitionId)) errors.push(`${record.id}: invalid dutyDefinitionId ${record.dutyDefinitionId}.`);
    if (!registries.scheduleTemplates.has(record.sourceTemplateId)) errors.push(`${record.id}: invalid sourceTemplateId ${record.sourceTemplateId}.`);
    if (!Number.isInteger(record.startElapsedDay) || !Number.isInteger(record.endElapsedDay) || record.endElapsedDay < record.startElapsedDay) errors.push(`${record.id}: invalid schedule interval.`);
    if (!["scheduled","in_progress","completed","cancelled"].includes(record.status)) errors.push(`${record.id}: invalid schedule status ${record.status}.`);
  }
  for (const record of Object.values(e.opportunityRecords ?? {})) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.opportunities.has(record.definitionId)) errors.push(`${record.id}: invalid opportunity definition ${record.definitionId}.`);
    if (!["open","accepted","in_progress","completed","declined","expired"].includes(record.status)) errors.push(`${record.id}: invalid opportunity status ${record.status}.`);
    requireRef(errors, e.orderRecords, record.orderId, `${record.id}.orderId`);
  }
  for (const record of Object.values(e.objectiveRecords ?? {})) {
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
    if (!registries.careerObjectives.has(record.definitionId)) errors.push(`${record.id}: invalid objective definition ${record.definitionId}.`);
    if (!["active","completed","failed"].includes(record.status)) errors.push(`${record.id}: invalid objective status ${record.status}.`);
  }

  for (const record of Object.values(e.unitEventRecords ?? {})) {
    requireRef(errors, e.units, record.unitId, `${record.id}.unitId`);
    requireRef(errors, e.people, record.personId, `${record.id}.personId`);
  }
  for (const record of Object.values(e.unitReadinessSnapshots ?? {})) {
    requireRef(errors, e.units, record.unitId, `${record.id}.unitId`);
    if (!Number.isFinite(record.overall) || record.overall < 0 || record.overall > 100) errors.push(`${record.id}: invalid readiness snapshot.`);
  }

  if (state.playerPersonId) requireRef(errors, e.people, state.playerPersonId, "playerPersonId");
  for (const record of Object.values(e.relationshipRecords ?? {})) {
    requireRef(errors,e.people,record.personAId,`${record.id}.personAId`); requireRef(errors,e.people,record.personBId,`${record.id}.personBId`);
    for (const field of ["familiarity","trust","respect","rapport","bond"]) if (!Number.isFinite(Number(record[field] ?? 0))) errors.push(`${record.id}: invalid relationship ${field}.`);
  }
  for (const profile of Object.values(e.personalityProfiles ?? {})) { requireRef(errors,e.people,profile.personId,`${profile.id}.personId`); for(const traitId of profile.traitIds ?? []) if(!registries.personalities.has(traitId)) errors.push(`${profile.id}: invalid personality ${traitId}.`); }
  for (const memory of Object.values(e.relationshipMemoryRecords ?? {})) { requireRef(errors,e.people,memory.personId,`${memory.id}.personId`); requireRef(errors,e.people,memory.otherPersonId,`${memory.id}.otherPersonId`); }
  return { ok: errors.length === 0, errors };
}
