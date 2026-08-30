function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function advanceWorldDays(store, days) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Days must be between 1 and 3650.");
  store.mutate(draft => {
    draft.world.date = addDays(draft.world.date, days);
  });
}

export function grantTrainingExperience(store, personId, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error("Invalid experience amount.");
  const state = store.getState();
  if (!state.entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  store.mutate(draft => {
    draft.entities.people[personId].career.experience += Math.floor(amount);
  });
}
