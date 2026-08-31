import { randomInt } from "../core/rng.js";
import { personnelGenerationDefinition as personnelData } from "../data/personnelGeneration.js";

export const CURRENT_WORLD_GENERATOR_VERSION = 2;

function cloneCondition(state) {
  return {
    readiness: randomInt(state, 78, 90),
    morale: randomInt(state, 72, 86),
    cohesion: randomInt(state, 74, 88),
    supply: randomInt(state, 86, 98)
  };
}

function choose(state, items) {
  if (!items.length) throw new Error("Cannot choose from an empty collection.");
  return items[randomInt(state, 0, items.length - 1)];
}

function generatedIdentity(state, usedNames) {
  const attempts = personnelData.firstNames.length * personnelData.lastNames.length;
  for (let i = 0; i < attempts; i++) {
    const firstName = choose(state, personnelData.firstNames);
    const lastName = choose(state, personnelData.lastNames);
    const displayName = `${firstName} ${lastName}`;
    if (usedNames.has(displayName)) continue;
    usedNames.add(displayName);
    return { firstName, lastName, displayName };
  }
  throw new Error("Personnel name pool exhausted.");
}

function dateYearsBefore(iso, years, extraDays = 0) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - extraDays);
  return d.toISOString().slice(0, 10);
}

export function generateCareerStartWorld(state, registries, scenarioId) {
  const scenario = registries.careerStartScenarios.get(scenarioId);
  const profile = registries.generationProfiles.get(scenario.generationProfileId);
  if (!scenario.enabled) throw new Error(`Career start scenario ${scenario.name} is not enabled.`);

  const e = state.entities;
  for (const name of ["people","units","billets","serviceRecords","loadouts","equipmentInstances","skillProfiles"]) e[name] = {};

  const childrenByParent = new Map();
  for (const template of profile.units) {
    if (!template.parentUnitId) continue;
    const arr = childrenByParent.get(template.parentUnitId) ?? [];
    arr.push(template.id);
    childrenByParent.set(template.parentUnitId, arr);
  }

  for (const template of profile.units) {
    const org = registries.organizations.get(template.organizationDefinitionId);
    e.units[template.id] = {
      id: template.id,
      schemaVersion: 4,
      organizationDefinitionId: org.id,
      nationId: profile.nationId,
      branchId: profile.branchId,
      echelonId: org.echelonId,
      name: template.name,
      parentUnitId: template.parentUnitId,
      childUnitIds: [...(childrenByParent.get(template.id) ?? [])],
      condition: cloneCondition(state)
    };
  }

  let billetSequence = 1;
  const startingCandidates = [];
  for (const template of profile.units) {
    const org = registries.organizations.get(template.organizationDefinitionId);
    for (const definitionId of org.billetDefinitionIds) {
      const billetId = `billet_gen_${String(billetSequence++).padStart(3, "0")}`;
      e.billets[billetId] = { id: billetId, schemaVersion: 2, unitId: template.id, definitionId, assignedPersonId: null, status: "vacant" };
      if (scenario.eligibleStartingBilletDefinitionIds.includes(definitionId)) startingCandidates.push(billetId);
    }
  }

  const startingBilletId = choose(state, startingCandidates);
  const usedNames = new Set();
  let personSequence = 1;
  for (const billet of Object.values(e.billets)) {
    if (billet.id === startingBilletId) continue;
    const rankId = profile.billetRankIdsByDefinitionId[billet.definitionId];
    if (!rankId) throw new Error(`Generation profile ${profile.id} has no rank mapping for ${billet.definitionId}.`);
    const id = `pers_gen_${String(personSequence++).padStart(3, "0")}`;
    const identity = generatedIdentity(state, usedNames);
    const years = profile.rankServiceYearsByRankId?.[rankId] ?? 0;
    const enlistmentDate = dateYearsBefore(state.world.date, years, randomInt(state, 0, 330));
    const specialtyId = profile.billetSpecialtyIdsByDefinitionId?.[billet.definitionId] ?? scenario.specialtyId;
    if (!registries.specialties.has(specialtyId)) throw new Error(`Generation profile ${profile.id} has no valid specialty mapping for ${billet.definitionId}.`);
    const serviceRecordId = `service_${id}`;
    const loadoutId = `loadout_${id}`;
    const equipmentId = `eq_${id}_primary`;
    e.people[id] = {
      id, schemaVersion: 5, identity,
      affiliation: { nationId: profile.nationId, branchId: scenario.branchId, componentId: scenario.componentId, specialtyId, unitId: billet.unitId, billetId: billet.id, rankId },
      career: { enlistmentDate, experience: randomInt(state, 500 + years * 350, 1200 + years * 650), prestige: randomInt(state, 10 + years, 30 + years * 3), bonusEarnings: 0 },
      condition: { health: randomInt(state, ...personnelData.healthRange), morale: randomInt(state, ...personnelData.moraleRange), fatigue: randomInt(state, ...personnelData.fatigueRange), readiness: randomInt(state, ...personnelData.readinessRange), status: "active" },
      traitIds: [...personnelData.traits], loadoutId, serviceRecordId, simulationTier: 2
    };
    e.serviceRecords[serviceRecordId] = { id: serviceRecordId, schemaVersion: 2, personId: id, serviceStatus: "active", entryDate: enlistmentDate, separationDate: null, branchId: scenario.branchId, componentId: scenario.componentId, specialtyId, currentContractId: null, servicePeriodIds: [] };
    e.equipmentInstances[equipmentId] = { id: equipmentId, schemaVersion: 1, definitionId: registries.billets.get(billet.definitionId).primaryEquipmentDefinitionId, ownerPersonId: id, condition: randomInt(state, 94, 100), upgradeIds: [] };
    e.loadouts[loadoutId] = { id: loadoutId, schemaVersion: 2, ownerPersonId: id, slots: { primaryWeaponInstanceId: equipmentId } };
    e.skillProfiles[`skills_${id}`] = { id: `skills_${id}`, schemaVersion: 1, personId: id, values: Object.fromEntries(registries.skills.values().map(skill => [skill.id, randomInt(state, 25, 65)])) };
    billet.assignedPersonId = id;
    billet.status = "filled";
  }

  state.world.generation = {
    generatorVersion: CURRENT_WORLD_GENERATOR_VERSION,
    scenarioId: scenario.id,
    generationProfileId: profile.id,
    startingBilletId,
    generatedAtWorldDate: state.world.date
  };
  state.world.careerStartUnitByBranchId = { ...(state.world.careerStartUnitByBranchId ?? {}), [scenario.branchId]: e.billets[startingBilletId].unitId };
  return state;
}
