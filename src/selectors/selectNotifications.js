export function selectNotifications(state, indexes, personId, { includeArchived = false } = {}) {
  const ids = indexes.notificationsByPersonId.get(personId) ?? [];
  return ids.map(id => state.entities.notificationRecords[id]).filter(Boolean).filter(n => includeArchived || n.archivedAtElapsedDay == null).sort((a, b) => b.createdAtElapsedDay - a.createdAtElapsedDay || b.id.localeCompare(a.id));
}
