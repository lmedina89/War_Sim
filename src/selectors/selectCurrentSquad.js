export function selectCurrentSquad(state, indexes, registries, playerPersonId) {
  const player = state.entities.people[playerPersonId];
  if (!player) throw new Error(`Player not found: ${playerPersonId}`);

  const unitId = player.affiliation.unitId;
  const unit = state.entities.units[unitId];
  if (!unit) throw new Error(`Player unit not found: ${unitId}`);

  const billetIds = indexes.billetsByUnitId.get(unit.id) ?? [];
  const members = [];

  for (const billetId of billetIds) {
    const billet = state.entities.billets[billetId];
    const billetDef = registries.billets.get(billet.definitionId);
    if (!billet.assignedPersonId) {
      members.push({
        billetId,
        personId: null,
        rank: "—",
        name: "VACANT",
        role: billetDef.name,
        health: null,
        morale: null,
        weaponName: "—",
        status: "vacant"
      });
      continue;
    }

    const person = state.entities.people[billet.assignedPersonId];
    const rank = registries.ranks.get(person.affiliation.rankId);
    const loadout = state.entities.loadouts[person.loadoutId];
    const equipmentInstance = loadout ? state.entities.equipmentInstances[loadout.primaryEquipmentInstanceId] : null;
    const equipment = equipmentInstance ? registries.equipment.get(equipmentInstance.definitionId) : null;

    members.push({
      billetId,
      personId: person.id,
      rank: rank.abbreviation,
      rankName: rank.name,
      name: person.identity.displayName,
      role: billetDef.name,
      health: person.condition.health,
      morale: person.condition.morale,
      weaponName: equipment?.name ?? "Unassigned",
      status: person.condition.status
    });
  }

  const assigned = members.filter(m => m.personId).length;
  const authorized = members.length;

  return {
    unitId: unit.id,
    unitName: unit.name,
    parentUnitId: unit.parentUnitId,
    readiness: unit.condition.readiness,
    morale: unit.condition.morale,
    authorizedStrength: authorized,
    assignedStrength: assigned,
    vacancies: authorized - assigned,
    members
  };
}
