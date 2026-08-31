export function selectNotifications(state, indexes, personId) {
  const ids = indexes.notificationsByPersonId.get(personId) ?? [];
  return ids.map(id => state.entities.notificationRecords[id]).sort((a, b) => b.createdAtElapsedDay - a.createdAtElapsedDay || b.id.localeCompare(a.id));
}
