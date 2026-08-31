export function selectCurrentSquad(state, indexes, registries, playerPersonId) {
  const player = state.entities.people[playerPersonId];
  if (!player) throw new Error(`Player not found: ${playerPersonId}`);

  const unit = state.entities.units[player.affiliation.unitId];
  if (!unit) throw new Error(`Player unit not found: ${player.affiliation.unitId}`);

  const billetIds = indexes.billetsByUnitId.get(unit.id) ?? [];
  const members = billetIds
    .map(billetId => state.entities.billets[billetId])
    .filter(billet => billet.assignedPersonId)
    .map(billet => {
      const person = state.entities.people[billet.assignedPersonId];
      const rank = registries.ranks.get(person.affiliation.rankId);
      const billetDef = registries.billets.get(billet.definitionId);
      const loadout = state.entities.loadouts[person.loadoutId];
      const equipmentInstance = loadout ? state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId] : null;
      const equipment = equipmentInstance ? registries.equipment.get(equipmentInstance.definitionId) : null;

      return {
        billetId: billet.id,
        personId: person.id,
        isPlayer: person.id === playerPersonId,
        rank: rank.abbreviation,
        rankName: rank.name,
        name: person.identity.displayName,
        role: billetDef.name,
        health: person.condition.health,
        morale: person.condition.morale,
        weaponName: equipment?.name ?? "Unassigned",
        status: person.condition.status
      };
    });

  return {
    unitId: unit.id,
    unitName: unit.name,
    readiness: unit.condition.readiness,
    morale: unit.condition.morale,
    authorizedStrength: billetIds.length,
    assignedStrength: members.length,
    vacancies: billetIds.length - members.length,
    members
  };
}
