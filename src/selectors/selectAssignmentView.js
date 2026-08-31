import { selectOrganizationView } from "./selectOrganizationView.js";

export function selectAssignmentView(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const billet = state.entities.billets[person.affiliation.billetId];
  const billetDef = billet ? registries.billets.get(billet.definitionId) : null;
  const unit = state.entities.units[person.affiliation.unitId];
  const chain = [];
  let cursor = unit;
  while (cursor) { chain.unshift(selectOrganizationView(state, indexes, registries, cursor.id)); cursor = cursor.parentUnitId ? state.entities.units[cursor.parentUnitId] : null; }
  const assignmentIds = indexes.assignmentsByPersonId.get(personId) ?? [];
  const currentAssignment = assignmentIds.map(id => state.entities.assignmentRecords[id]).find(x => x.endDate == null) ?? null;
  return { personId, billetName: billetDef?.name ?? "Unassigned", assignmentStartDate: currentAssignment?.startDate ?? "—", chain };
}

export function selectUnitPersonnel(state, indexes, registries, unitId) {
  return (indexes.peopleByUnitId.get(unitId) ?? []).map(id => {
    const person = state.entities.people[id];
    const rank = registries.ranks.get(person.affiliation.rankId);
    const billet = state.entities.billets[person.affiliation.billetId];
    const billetDef = billet ? registries.billets.get(billet.definitionId) : null;
    const loadout = state.entities.loadouts[person.loadoutId];
    const equipmentInstance = loadout ? state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId] : null;
    const equipment = equipmentInstance ? registries.equipment.get(equipmentInstance.definitionId) : null;
    return { id, name: person.identity.displayName, rank: rank.abbreviation, rankName: rank.name, billet: billetDef?.name ?? "Unassigned", weaponName: equipment?.name ?? "Unassigned", status: person.condition.status, readiness: person.condition.readiness, health: person.condition.health, morale: person.condition.morale, isPlayer: id === state.playerPersonId };
  });
}
