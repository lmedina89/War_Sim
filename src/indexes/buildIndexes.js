function addToIndex(map, key, value) {
  if (key == null) return;
  let bucket = map.get(key);
  if (!bucket) { bucket = []; map.set(key, bucket); }
  bucket.push(value);
}

function peopleGroup(state) {
  const peopleByUnitId = new Map(), peopleByNationId = new Map(), peopleByStatus = new Map();
  for (const person of Object.values(state.entities.people)) {
    addToIndex(peopleByUnitId, person.affiliation.unitId, person.id);
    addToIndex(peopleByNationId, person.affiliation.nationId, person.id);
    addToIndex(peopleByStatus, person.condition.status, person.id);
  }
  return { peopleByUnitId, peopleByNationId, peopleByStatus };
}

function unitsGroup(state) {
  const unitsByNationId = new Map(), unitsByParentUnitId = new Map(), unitsByBranchId = new Map();
  for (const unit of Object.values(state.entities.units)) {
    addToIndex(unitsByNationId, unit.nationId, unit.id);
    addToIndex(unitsByParentUnitId, unit.parentUnitId, unit.id);
    addToIndex(unitsByBranchId, unit.branchId, unit.id);
  }
  return { unitsByNationId, unitsByParentUnitId, unitsByBranchId };
}

function billetsGroup(state) {
  const billetsByUnitId = new Map(), billetByAssignedPersonId = new Map();
  for (const billet of Object.values(state.entities.billets)) {
    addToIndex(billetsByUnitId, billet.unitId, billet.id);
    if (billet.assignedPersonId) billetByAssignedPersonId.set(billet.assignedPersonId, billet.id);
  }
  return { billetsByUnitId, billetByAssignedPersonId };
}

function personHistoryGroup(state) {
  const maps = {
    careerEventsByPersonId: new Map(), qualificationsByPersonId: new Map(), awardsByPersonId: new Map(),
    assignmentsByPersonId: new Map(), promotionsByPersonId: new Map(), deploymentsByPersonId: new Map(),
    casualtiesByPersonId: new Map(), relationshipsByPersonId: new Map()
  };
  for (const record of Object.values(state.entities.careerEvents)) addToIndex(maps.careerEventsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.qualificationRecords)) addToIndex(maps.qualificationsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.awardRecords)) addToIndex(maps.awardsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.assignmentRecords)) addToIndex(maps.assignmentsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.promotionRecords)) addToIndex(maps.promotionsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.deploymentRecords)) addToIndex(maps.deploymentsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.casualtyRecords)) addToIndex(maps.casualtiesByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.relationshipRecords)) {
    addToIndex(maps.relationshipsByPersonId, record.personAId, record.id);
    addToIndex(maps.relationshipsByPersonId, record.personBId, record.id);
  }
  return maps;
}

function equipmentGroup(state) {
  const equipmentByOwnerId = new Map();
  for (const item of Object.values(state.entities.equipmentInstances)) addToIndex(equipmentByOwnerId, item.ownerPersonId, item.id);
  return { equipmentByOwnerId };
}

function memorialGroup(state) {
  const memorialByPersonId = new Map();
  for (const record of Object.values(state.entities.memorialRecords)) memorialByPersonId.set(record.personId, record.id);
  return { memorialByPersonId };
}

function notificationGroup(state) {
  const notificationsByPersonId = new Map(), unreadNotificationsByPersonId = new Map();
  for (const record of Object.values(state.entities.notificationRecords)) {
    addToIndex(notificationsByPersonId, record.personId, record.id);
    if (record.readAtElapsedDay == null) addToIndex(unreadNotificationsByPersonId, record.personId, record.id);
  }
  return { notificationsByPersonId, unreadNotificationsByPersonId };
}

function ordersGroup(state) {
  const ordersByPersonId = new Map();
  for (const record of Object.values(state.entities.orderRecords ?? {})) addToIndex(ordersByPersonId, record.personId, record.id);
  return { ordersByPersonId };
}

function actionGroup(state) {
  const actionsByActorPersonId = new Map();
  for (const record of Object.values(state.entities.actionRecords)) addToIndex(actionsByActorPersonId, record.actorPersonId, record.id);
  return { actionsByActorPersonId };
}

const GROUP_BUILDERS = Object.freeze({
  people: peopleGroup,
  units: unitsGroup,
  billets: billetsGroup,
  history: personHistoryGroup,
  equipment: equipmentGroup,
  memorial: memorialGroup,
  notifications: notificationGroup,
  actions: actionGroup,
  orders: ordersGroup
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
