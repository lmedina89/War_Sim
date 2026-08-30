export function changePrimaryEquipment(store, registries, personId, equipmentInstanceId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const item = state.entities.equipmentInstances[equipmentInstanceId];
  if (!item) throw new Error(`Unknown equipment instance: ${equipmentInstanceId}`);
  if (item.ownerPersonId !== personId) throw new Error("Equipment is not owned by this person.");
  registries.equipment.get(item.definitionId);
  const loadout = state.entities.loadouts[person.loadoutId];
  if (!loadout) throw new Error(`Missing loadout for ${personId}`);

  store.mutate(draft => {
    draft.entities.loadouts[person.loadoutId].slots.primaryWeaponInstanceId = equipmentInstanceId;
  });
}
