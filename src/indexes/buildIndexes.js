function addToIndex(map, key, value) {
  if (key == null) return;
  let bucket = map.get(key);
  if (!bucket) { bucket = []; map.set(key, bucket); }
  bucket.push(value);
}

function peopleGroup(state) {
  const peopleByUnitId = new Map(), peopleByNationId = new Map(), peopleByStatus = new Map();
  for (const person of Object.values(state.entities.people)) {
    if (person.affiliation.unitId && person.affiliation.billetId) addToIndex(peopleByUnitId, person.affiliation.unitId, person.id);
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
  const billetsByUnitId = new Map(), billetByAssignedPersonId = new Map(), vacantBilletIds = [];
  for (const billet of Object.values(state.entities.billets)) {
    addToIndex(billetsByUnitId, billet.unitId, billet.id);
    if (billet.assignedPersonId) billetByAssignedPersonId.set(billet.assignedPersonId, billet.id);
    else if (billet.status === "vacant") vacantBilletIds.push(billet.id);
  }
  return { billetsByUnitId, billetByAssignedPersonId, vacantBilletIds: Object.freeze(vacantBilletIds) };
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


function careerGroup(state) {
  const contractsByPersonId = new Map(), servicePeriodsByPersonId = new Map(), reenlistmentOffersByPersonId = new Map();
  for (const record of Object.values(state.entities.contractRecords ?? {})) addToIndex(contractsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.servicePeriodRecords ?? {})) addToIndex(servicePeriodsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.reenlistmentOfferRecords ?? {})) addToIndex(reenlistmentOffersByPersonId, record.personId, record.id);
  return { contractsByPersonId, servicePeriodsByPersonId, reenlistmentOffersByPersonId };
}


function adminGroup(state) {
  const personnelActionsByPersonId = new Map(), replacementRequestsByUnitId = new Map(), replacementRequestsByStatus = new Map(), actionIds = [];
  for (const record of Object.values(state.entities.personnelActionRecords ?? {})) { addToIndex(personnelActionsByPersonId, record.personId, record.id); actionIds.push(record.id); }
  actionIds.sort((a,b) => b.localeCompare(a));
  for (const record of Object.values(state.entities.replacementRequestRecords ?? {})) { addToIndex(replacementRequestsByUnitId, record.unitId, record.id); addToIndex(replacementRequestsByStatus, record.status, record.id); }
  return { personnelActionsByPersonId, replacementRequestsByUnitId, replacementRequestsByStatus, recentPersonnelActionIds: Object.freeze(actionIds.slice(0, 20)) };
}


function activitiesGroup(state) {
  const skillProfileByPersonId = new Map(), activityRecordsByPersonId = new Map(), performanceRecordsByPersonId = new Map(), gameplayEventsByPersonId = new Map();
  for (const profile of Object.values(state.entities.skillProfiles ?? {})) skillProfileByPersonId.set(profile.personId, profile.id);
  for (const record of Object.values(state.entities.activityRecords ?? {})) addToIndex(activityRecordsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.performanceRecords ?? {})) addToIndex(performanceRecordsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.gameplayEventRecords ?? {})) addToIndex(gameplayEventsByPersonId, record.personId, record.id);
  return { skillProfileByPersonId, activityRecordsByPersonId, performanceRecordsByPersonId, gameplayEventsByPersonId };
}


function careerGameplayGroup(state) {
  const unitTrainingProfileByUnitId = new Map(), scheduleRecordsByPersonId = new Map(), scheduleRecordsByUnitId = new Map(), scheduleRecordsByStartElapsedDay = new Map(), scheduleRecordsByStatus = new Map(), opportunityRecordsByPersonId = new Map(), opportunityRecordsByStatus = new Map(), objectiveRecordsByPersonId = new Map(), unitEventRecordsByUnitId = new Map(), readinessSnapshotsByUnitId = new Map();
  for (const profile of Object.values(state.entities.unitTrainingProfiles ?? {})) unitTrainingProfileByUnitId.set(profile.unitId, profile.id);
  for (const record of Object.values(state.entities.scheduleRecords ?? {})) {
    addToIndex(scheduleRecordsByPersonId, record.personId, record.id);
    addToIndex(scheduleRecordsByUnitId, record.unitId, record.id);
    addToIndex(scheduleRecordsByStartElapsedDay, record.startElapsedDay, record.id);
    addToIndex(scheduleRecordsByStatus, record.status, record.id);
  }
  for (const record of Object.values(state.entities.opportunityRecords ?? {})) { addToIndex(opportunityRecordsByPersonId, record.personId, record.id); addToIndex(opportunityRecordsByStatus, record.status, record.id); }
  for (const record of Object.values(state.entities.objectiveRecords ?? {})) addToIndex(objectiveRecordsByPersonId, record.personId, record.id);
  for (const record of Object.values(state.entities.unitEventRecords ?? {})) addToIndex(unitEventRecordsByUnitId, record.unitId, record.id);
  for (const record of Object.values(state.entities.unitReadinessSnapshots ?? {})) addToIndex(readinessSnapshotsByUnitId, record.unitId, record.id);
  return { unitTrainingProfileByUnitId, scheduleRecordsByPersonId, scheduleRecordsByUnitId, scheduleRecordsByStartElapsedDay, scheduleRecordsByStatus, opportunityRecordsByPersonId, opportunityRecordsByStatus, objectiveRecordsByPersonId, unitEventRecordsByUnitId, readinessSnapshotsByUnitId };
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
  orders: ordersGroup,
  career: careerGroup,
  admin: adminGroup,
  activities: activitiesGroup,
  careerGameplay: careerGameplayGroup
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
