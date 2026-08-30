export function selectCurrentSquad(state, indexes, registries, playerPersonId) {
  const player = state.entities.people[playerPersonId];
  if (!player) throw new Error(`Player not found: ${playerPersonId}`);
  const unit = state.entities.units[player.affiliation.unitId];
  if (!unit) throw new Error(`Player unit not found: ${player.affiliation.unitId}`);

  const personIds = indexes.peopleByUnitId.get(unit.id) ?? [];
  return {
    unitId: unit.id,
    unitName: unit.name,
    readiness: unit.condition.readiness,
    morale: unit.condition.morale,
    members: personIds.map(personId => {
      const person = state.entities.people[personId];
      const rank = registries.ranks.get(person.affiliation.rankId);
      const role = registries.roles.get(person.affiliation.roleId);
      const loadout = state.entities.loadouts[person.loadoutId];
      const primaryInstance = loadout?.slots?.primaryWeaponInstanceId
        ? state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId]
        : null;
      const equipment = primaryInstance ? registries.equipment.get(primaryInstance.definitionId) : null;

      return {
        personId,
        isPlayer: personId === playerPersonId,
        rank: rank.abbreviation,
        rankName: rank.name,
        name: person.identity.displayName,
        role: role.name,
        health: person.condition.health,
        morale: person.condition.morale,
        weaponName: equipment?.name ?? "Unassigned",
        status: person.condition.status,
        simulationTier: person.simulationTier
      };
    })
  };
}
