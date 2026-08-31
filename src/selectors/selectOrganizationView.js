export function selectOrganizationView(state, indexes, registries, unitId) {
  const unit = state.entities.units[unitId];
  if (!unit) throw new Error(`Unknown unit: ${unitId}`);

  const echelon = registries.echelons.get(unit.echelonId);
  const childIds = indexes.unitsByParentId.get(unit.id) ?? [];
  const billetIds = indexes.billetsByUnitId.get(unit.id) ?? [];
  const assigned = billetIds
    .map(id => state.entities.billets[id])
    .filter(billet => billet.assignedPersonId)
    .length;

  return {
    unitId: unit.id,
    name: unit.name,
    echelon: echelon.name,
    branch: registries.branches.get(unit.branchId).name,
    parentUnitId: unit.parentUnitId,
    childUnitIds: childIds,
    authorizedStrength: billetIds.length,
    assignedStrength: assigned,
    vacancies: billetIds.length - assigned,
    readiness: unit.condition.readiness,
    morale: unit.condition.morale
  };
}
