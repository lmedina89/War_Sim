function addToIndex(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

export function buildIndexes(state) {
  const peopleByUnitId = new Map();
  const unitsByNationId = new Map();
  const careerEventsByPersonId = new Map();
  const qualificationsByPersonId = new Map();

  for (const person of Object.values(state.entities.people)) {
    addToIndex(peopleByUnitId, person.affiliation.unitId, person.id);
  }

  for (const unit of Object.values(state.entities.units)) {
    addToIndex(unitsByNationId, unit.nationId, unit.id);
  }

  for (const event of Object.values(state.entities.careerEvents)) {
    addToIndex(careerEventsByPersonId, event.personId, event.id);
  }

  for (const record of Object.values(state.entities.qualificationRecords)) {
    addToIndex(qualificationsByPersonId, record.personId, record.id);
  }

  return Object.freeze({
    peopleByUnitId,
    unitsByNationId,
    careerEventsByPersonId,
    qualificationsByPersonId
  });
}
