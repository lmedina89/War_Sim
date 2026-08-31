export function selectGameplay(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) return null;
  const skillProfileId = indexes.skillProfileByPersonId?.get(personId);
  const profile = skillProfileId ? state.entities.skillProfiles[skillProfileId] : null;
  const skills = registries.skills.values().map(def => ({ id: def.id, name: def.name, value: profile?.values?.[def.id] ?? 20 }));
  const rank = registries.ranks.get(person.affiliation.rankId);
  const activities = registries.activities.values().map(activity => {
    const e = activity.eligibility ?? {};
    const reasons = [];
    if (e.allowedStatuses && !e.allowedStatuses.includes(person.condition.status)) reasons.push(`status ${person.condition.status}`);
    if (person.condition.health < (e.minimumHealth ?? 0)) reasons.push(`health ${e.minimumHealth}% required`);
    if (e.minimumRankLevel && rank.hierarchyLevel < e.minimumRankLevel) reasons.push("higher rank required");
    if (e.requiresAssignedUnit && !person.affiliation.unitId) reasons.push("unit assignment required");
    return { id: activity.id, name: activity.name, shortName: activity.shortName, durationDays: activity.durationDays, description: activity.description, eligible: reasons.length === 0, reasons };
  });
  const recentIds = indexes.activityRecordsByPersonId?.get(personId) ?? [];
  const recentActivities = recentIds.slice(-5).reverse().map(id => state.entities.activityRecords[id]).filter(Boolean);
  const eventIds = indexes.gameplayEventsByPersonId?.get(personId) ?? [];
  const pendingDecisions = eventIds.map(id => state.entities.gameplayEventRecords[id]).filter(record => record?.status === "pending").map(record => {
    const def = registries.gameplayEvents.get(record.definitionId);
    return { id: record.id, title: def.title, message: def.message, choices: (def.choices ?? []).map(choice => ({ id: choice.id, label: choice.label })) };
  });
  return { skills, activities, recentActivities, pendingDecisions };
}
