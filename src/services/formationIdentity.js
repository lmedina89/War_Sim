import { formationDefinitions } from "../data/formations.js";

function mixSeed(seed) {
  let value = (Number(seed) >>> 0) || 1;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

export function careerStartFormationForSeed(seed) {
  const eligible = formationDefinitions.filter(item => item.careerStartEligible && item.lineage?.length);
  if (!eligible.length) throw new Error("No career-start formations are defined.");
  return eligible[mixSeed(seed) % eligible.length];
}

function inheritedCondition(company) {
  const c = company?.condition ?? {};
  return {
    readiness: Number.isFinite(c.readiness) ? c.readiness : 84,
    morale: Number.isFinite(c.morale) ? c.morale : 78,
    cohesion: Number.isFinite(c.cohesion) ? c.cohesion : 81,
    supply: Number.isFinite(c.supply) ? c.supply : 92
  };
}

export function ensureNamedInfantryFormation(state) {
  state.world ??= {};
  state.entities ??= {};
  state.entities.units ??= {};
  const company = state.entities.units.unit_company_001;
  if (!company) return null;

  const savedId = state.world.formationIdentityId;
  const formation = formationDefinitions.find(item => item.id === savedId)
    ?? careerStartFormationForSeed(state.world.seed);
  state.world.formationIdentityId = formation.id;

  const condition = inheritedCondition(company);
  let parentId = null;
  for (const [index, template] of formation.lineage.entries()) {
    const unitId = template.id;
    const nextId = formation.lineage[index + 1]?.id ?? "unit_company_001";
    const existing = state.entities.units[unitId] ?? {};
    state.entities.units[unitId] = {
      ...existing,
      id: unitId,
      schemaVersion: Math.max(4, existing.schemaVersion ?? 0),
      organizationDefinitionId: template.organizationDefinitionId,
      nationId: company.nationId ?? "nation_demo",
      branchId: company.branchId ?? "branch_army",
      echelonId: template.echelonId,
      name: template.name,
      readinessModelId: company.readinessModelId ?? existing.readinessModelId ?? "readiness_standard_unit",
      parentUnitId: parentId,
      childUnitIds: [nextId],
      condition: existing.condition ?? structuredClone(condition),
      formationId: formation.id,
      insigniaId: index === 0 ? formation.insigniaId : null
    };
    parentId = unitId;
  }

  const immediateParentId = formation.lineage.at(-1)?.id ?? null;
  company.parentUnitId = immediateParentId;
  company.formationId = formation.id;
  company.schemaVersion = Math.max(4, company.schemaVersion ?? 0);
  for (const unit of Object.values(state.entities.units)) {
    if (!unit || unit.id.startsWith("unit_formation_")) continue;
    if (unit.id === "unit_company_001" || unit.parentUnitId || unit.id === "unit_company_001") unit.formationId ??= formation.id;
  }
  return formation;
}

export function formationIdentityForUnit(state, unitId) {
  let cursor = state.entities?.units?.[unitId] ?? null;
  while (cursor) {
    if (cursor.insigniaId) {
      return {
        formationId: cursor.formationId ?? state.world?.formationIdentityId ?? null,
        unitId: cursor.id,
        name: cursor.name,
        insigniaId: cursor.insigniaId
      };
    }
    cursor = cursor.parentUnitId ? state.entities.units[cursor.parentUnitId] : null;
  }
  const formation = formationDefinitions.find(item => item.id === state.world?.formationIdentityId) ?? null;
  return formation ? { formationId: formation.id, unitId: null, name: formation.name, insigniaId: formation.insigniaId } : null;
}
