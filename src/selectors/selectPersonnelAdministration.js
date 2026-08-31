export function selectPersonnelAdministration(state, indexes, registries) {
  const counts = {};
  for (const [status, ids] of indexes.peopleByStatus.entries()) counts[status] = ids.length;
  const vacantBillets = Object.values(state.entities.billets).filter(b => b.status === "vacant" && !b.assignedPersonId).map(b => ({
    id: b.id, unitId: b.unitId, unitName: state.entities.units[b.unitId]?.name ?? b.unitId, billetName: registries.billets.get(b.definitionId).name
  }));
  const openRequests = Object.values(state.entities.replacementRequestRecords ?? {}).filter(r => r.status === "open").map(r => ({ ...r, unitName: state.entities.units[r.unitId]?.name ?? r.unitId, billetName: registries.billets.get(state.entities.billets[r.billetId].definitionId).name }));
  const actions = Object.values(state.entities.personnelActionRecords ?? {}).slice().sort((a,b) => b.id.localeCompare(a.id)).slice(0,20).map(a => ({ ...a, personName: state.entities.people[a.personId]?.identity.displayName ?? a.personId }));
  return { counts, vacantBillets, openRequests, actions };
}
