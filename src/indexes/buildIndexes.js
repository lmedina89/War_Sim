function addToIndex(map, key, value) {
  if (!key) return;
  let bucket = map.get(key);
  if (!bucket) {
    bucket = [];
    map.set(key, bucket);
  }
  bucket.push(value);
}

function peopleGroup(state) {
  const peopleByUnitId = new Map();
  const peopleByNationId = new Map();
  const peopleByStatus = new Map();
  for (const person of Object.values(state.entities.people)) {
    addToIndex(peopleByUnitId, person.affiliation.unitId, person.id);
    addToIndex(peopleByNationId, person.affiliation.nationId, person.id);
    addToIndex(peopleByStatus, person.condition.status, person.id);
  }
  return { peopleByUnitId, peopleByNationId, peopleByStatus };
}

function unitsGroup(state) {
  const unitsByNationId = new Map();
  const unitsByParentUnitId = new Map();
  for (const unit of Object.values(state.entities.units)) {
    addToIndex(unitsByNationId, unit.nationId, unit.id);
    addToIndex(unitsByParentUnitId, unit.parentUnitId, unit.id);
  }
  return { unitsByNationId, unitsByParentUnitId };
}

function personHistoryGroup(state) {
  const careerEventsByPersonId = new Map();
  const qualificationsByPersonId = new Map();
  const awardsByPersonId = new Map();
  const assignmentsByPersonId = new Map();
  const promotionsByPersonId = new Map();
  const deploymentsByPersonId = new Map();
  const casualtiesByPersonId = new Map();
  const relationshipsByPersonId = new Map();

  for (const record of Object.values(state.entities.careerEvents)) addToIndex(careerEventsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.qualificationRecords)) addToIndex(qualificationsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.awardRecords)) addToIndex(awardsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.assignmentRecords)) addToIndex(assignmentsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.promotionRecords)) addToIndex(promotionsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.deploymentRecords)) addToIndex(deploymentsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.casualtyRecords)) addToIndex(casualtiesByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.relationshipRecords)) {
    addToIndex(relationshipsByPersonId, record.personAId, record.id);
    addToIndex(relationshipsByPersonId, record.personBId, record.id);
  }

  return {
    careerEventsByPersonId,
    qualificationsByPersonId,
    awardsByPersonId,
    assignmentsByPersonId,
    promotionsByPersonId,
    deploymentsByPersonId,
    casualtiesByPersonId,
    relationshipsByPersonId
  };
}

function equipmentGroup(state) {
  const equipmentByOwnerId = new Map();
  for (const item of Object.values(state.entities.equipmentInstances)) {
    addToIndex(equipmentByOwnerId, item.ownerPersonId, item.id);
  }
  return { equipmentByOwnerId };
}

function memorialGroup(state) {
  const memorialByPersonId = new Map();
  for (const record of Object.values(state.entities.memorialRecords)) {
    memorialByPersonId.set(record.personId, record.id);
  }
  return { memorialByPersonId };
}

const GROUP_BUILDERS = Object.freeze({
  people: peopleGroup,
  units: unitsGroup,
  history: personHistoryGroup,
  equipment: equipmentGroup,
  memorial: memorialGroup
});

export const ALL_INDEX_GROUPS = Object.freeze(Object.keys(GROUP_BUILDERS));

export function buildIndexes(state) {
  return refreshIndexes(state, Object.freeze({}), ALL_INDEX_GROUPS);
}

export function refreshIndexes(state, currentIndexes, groups) {
  const next = { ...currentIndexes };
  for (const groupName of new Set(groups)) {
    const builder = GROUP_BUILDERS[groupName];
    if (!builder) throw new Error(`Unknown index group: ${groupName}`);
    Object.assign(next, builder(state));
  }
  return Object.freeze(next);
}
