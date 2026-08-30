export function changePrimaryEquipment(store, personId, equipmentId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const loadout = state.entities.loadouts[person.loadoutId];
  if (!loadout) throw new Error(`Missing loadout for ${personId}`);

  store.transact(draft => {
    draft.entities.loadouts[person.loadoutId].primaryEquipmentId = equipmentId;
  });
}
