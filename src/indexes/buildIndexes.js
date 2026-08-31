function addToIndex(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

export function buildIndexes(state) {
  const unitsByParentId = new Map();
  const unitsByBranchId = new Map();
  const billetsByUnitId = new Map();
  const billetByAssignedPersonId = new Map();
  const peopleByUnitId = new Map();
  const peopleByStatus = new Map();
  const relationshipsByPersonId = new Map();
  const careerEventsByPersonId = new Map();
  const qualificationsByPersonId = new Map();
  const awardsByPersonId = new Map();

  for (const unit of Object.values(state.entities.units ?? {})) {
    addToIndex(unitsByParentId, unit.parentUnitId ?? "__root__", unit.id);
    addToIndex(unitsByBranchId, unit.branchId, unit.id);
  }

  for (const billet of Object.values(state.entities.billets ?? {})) {
    addToIndex(billetsByUnitId, billet.unitId, billet.id);
    if (billet.assignedPersonId) billetByAssignedPersonId.set(billet.assignedPersonId, billet.id);
  }

  for (const person of Object.values(state.entities.people ?? {})) {
    addToIndex(peopleByUnitId, person.affiliation.unitId, person.id);
    addToIndex(peopleByStatus, person.condition.status, person.id);
  }

  for (const rel of Object.values(state.entities.relationshipRecords ?? {})) {
    addToIndex(relationshipsByPersonId, rel.personAId, rel.id);
    addToIndex(relationshipsByPersonId, rel.personBId, rel.id);
  }

  for (const event of Object.values(state.entities.careerEvents ?? {})) {
    addToIndex(careerEventsByPersonId, event.personId, event.id);
  }

  for (const record of Object.values(state.entities.qualificationRecords ?? {})) {
    addToIndex(qualificationsByPersonId, record.personId, record.id);
  }

  for (const record of Object.values(state.entities.awardRecords ?? {})) {
    addToIndex(awardsByPersonId, record.personId, record.id);
  }

  return Object.freeze({
    unitsByParentId,
    unitsByBranchId,
    billetsByUnitId,
    billetByAssignedPersonId,
    peopleByUnitId,
    peopleByStatus,
    relationshipsByPersonId,
    careerEventsByPersonId,
    qualificationsByPersonId,
    awardsByPersonId
  });
}
