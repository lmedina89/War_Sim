function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

export function createUnitTrainingProfile(unit, readinessModelId = unit?.readinessModelId ?? null) {
  const base = clamp(unit?.condition?.readiness ?? 75);
  return {
    id: `unit_training_${unit.id}`,
    schemaVersion: 1,
    unitId: unit.id,
    readinessModelId,
    values: {
      physical: clamp(base - 3),
      weapons: clamp(base - 5),
      tactical: clamp(base - 6),
      cohesion: clamp(unit?.condition?.cohesion ?? base),
      discipline: clamp(base - 2),
      equipmentReadiness: clamp(unit?.condition?.supply ?? base)
    },
    lastUpdatedDate: null
  };
}

export function ensureUnitTrainingProfile(draft, unitId, readinessModelId = null) {
  const id = `unit_training_${unitId}`;
  if (!draft.entities.unitTrainingProfiles[id]) {
    const unit = draft.entities.units[unitId];
    if (!unit) throw new Error(`Unknown unit ${unitId}.`);
    draft.entities.unitTrainingProfiles[id] = createUnitTrainingProfile(unit, readinessModelId ?? unit.readinessModelId);
  }
  return draft.entities.unitTrainingProfiles[id];
}

export function initializeUnitTrainingProfiles(state, readinessModelId = null) {
  state.entities.unitTrainingProfiles ??= {};
  for (const unit of Object.values(state.entities.units ?? {})) {
    const id = `unit_training_${unit.id}`;
    if (!state.entities.unitTrainingProfiles[id]) state.entities.unitTrainingProfiles[id] = createUnitTrainingProfile(unit, readinessModelId ?? unit.readinessModelId);
  }
  return state;
}

export function applyUnitTrainingEffects(draft, unitId, effects = {}) {
  const profile = ensureUnitTrainingProfile(draft, unitId);
  for (const [key, delta] of Object.entries(effects)) {
    if (!(key in profile.values) || !Number.isFinite(delta)) continue;
    profile.values[key] = clamp(profile.values[key] + delta);
  }
  profile.lastUpdatedDate = draft.world.date;
  return profile;
}

export function calculateUnitReadiness(state, indexes, registries, unitId) {
  const unit = state.entities.units[unitId];
  if (!unit) return null;
  const profile = state.entities.unitTrainingProfiles?.[`unit_training_${unitId}`] ?? createUnitTrainingProfile(unit, unit.readinessModelId);
  const model = registries.readinessModels.get(profile.readinessModelId);
  const billetIds = indexes.billetsByUnitId?.get(unitId) ?? [];
  const personIds = indexes.peopleByUnitId?.get(unitId) ?? [];
  const assigned = personIds.length;
  const authorized = billetIds.length;
  const personnelFill = authorized ? clamp((assigned / authorized) * 100) : 100;
  const people = personIds.map(id => state.entities.people[id]).filter(Boolean);
  const individualReadiness = people.length ? clamp(people.reduce((sum, person) => sum + (person.condition.readiness ?? 0), 0) / people.length) : 0;
  const fatigueAverage = people.length ? clamp(people.reduce((sum, person) => sum + (person.condition.fatigue ?? 0), 0) / people.length) : 100;
  const fatigue = clamp(100 - fatigueAverage);
  const training = clamp((profile.values.physical + profile.values.weapons + profile.values.tactical + profile.values.discipline) / 4);
  const cohesion = clamp(profile.values.cohesion);
  const equipment = clamp(profile.values.equipmentReadiness);
  const components = { personnelFill, individualReadiness, training, cohesion, equipment, fatigue };
  const total = Object.entries(model.weights).reduce((sum, [key, weight]) => sum + (components[key] ?? 0) * weight, 0);
  return { unitId, overall: clamp(total), components, trainingValues: { ...profile.values }, modelId: model.id };
}

export function syncUnitReadiness(draft, registries, unitId, { billetIds = null, personIds = null } = {}) {
  const unit = draft.entities.units[unitId];
  if (!unit) return null;
  const profile = ensureUnitTrainingProfile(draft, unitId);
  const model = registries.readinessModels.get(profile.readinessModelId);
  const billets = (billetIds ?? Object.values(draft.entities.billets).filter(b => b.unitId === unitId).map(b => b.id)).map(id => draft.entities.billets[id]).filter(Boolean);
  const ids = personIds ?? billets.map(b => b.assignedPersonId).filter(Boolean);
  const people = ids.map(id => draft.entities.people[id]).filter(Boolean);
  const personnelFill = billets.length ? clamp((people.length / billets.length) * 100) : 100;
  const individualReadiness = people.length ? clamp(people.reduce((sum,p) => sum + (p.condition.readiness ?? 0),0) / people.length) : 0;
  const fatigueAverage = people.length ? clamp(people.reduce((sum,p) => sum + (p.condition.fatigue ?? 0),0) / people.length) : 100;
  const components = {
    personnelFill,
    individualReadiness,
    training: clamp((profile.values.physical + profile.values.weapons + profile.values.tactical + profile.values.discipline) / 4),
    cohesion: clamp(profile.values.cohesion),
    equipment: clamp(profile.values.equipmentReadiness),
    fatigue: clamp(100 - fatigueAverage)
  };
  unit.condition.readiness = clamp(Object.entries(model.weights).reduce((sum,[key,weight]) => sum + (components[key] ?? 0) * weight,0));
  unit.condition.cohesion = clamp(profile.values.cohesion);
  unit.condition.supply = clamp(profile.values.equipmentReadiness);
  return { overall: unit.condition.readiness, components };
}
