import { calculateUnitReadiness } from "../services/unitReadiness.js";

function overlaps(startA, endA, startB, endB) { return startA <= endB && startB <= endA; }

export function selectGameplay(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) return null;
  const skillProfileId = indexes.skillProfileByPersonId?.get(personId);
  const profile = skillProfileId ? state.entities.skillProfiles[skillProfileId] : null;
  const skills = registries.skills.values().map(def => ({ id: def.id, name: def.name, value: profile?.values?.[def.id] ?? 20 }));
  const rank = registries.ranks.get(person.affiliation.rankId);
  const currentElapsedDay = state.world.clock.elapsedDays;
  const scheduleIds = indexes.scheduleRecordsByPersonId?.get(personId) ?? [];
  const scheduleRecords = scheduleIds.map(id => state.entities.scheduleRecords[id]).filter(Boolean);
  const blockingDecision = (indexes.gameplayEventsByPersonId?.get(personId) ?? []).map(id => state.entities.gameplayEventRecords[id]).find(record => {
    if (record?.status !== "pending") return false;
    const def = registries.gameplayEvents.get(record.definitionId);
    return def.blocksTimeAdvance !== false;
  });
  const recentIds = indexes.activityRecordsByPersonId?.get(personId) ?? [];
  const recentRecords = recentIds.map(id => state.entities.activityRecords[id]).filter(Boolean);

  const activities = registries.activities.values().map(activity => {
    const e = activity.eligibility ?? {};
    const reasons = [];
    let availabilityState = "available";
    if (blockingDecision) { reasons.push("resolve pending decision"); availabilityState = "locked"; }
    if (e.allowedStatuses && !e.allowedStatuses.includes(person.condition.status)) { reasons.push(`status ${person.condition.status}`); availabilityState = "locked"; }
    if (person.condition.health < (e.minimumHealth ?? 0)) { reasons.push(`health ${e.minimumHealth}% required`); availabilityState = "locked"; }
    if (e.minimumRankLevel && rank.hierarchyLevel < e.minimumRankLevel) { reasons.push("higher rank required"); availabilityState = "locked"; }
    if (e.requiresAssignedUnit && !person.affiliation.unitId) { reasons.push("unit assignment required"); availabilityState = "locked"; }
    if (activity.category !== "recovery" && person.condition.fatigue >= 85) { reasons.push("recovery required: fatigue too high"); availabilityState = "recovering"; }
    const activityStart = currentElapsedDay + 1, activityEnd = currentElapsedDay + activity.durationDays;
    const conflict = scheduleRecords.find(record => record.mandatory && ["scheduled","in_progress"].includes(record.status) && overlaps(activityStart, activityEnd, record.startElapsedDay, record.endElapsedDay));
    if (conflict) { const duty = registries.duties.get(conflict.dutyDefinitionId); reasons.push(`conflicts with scheduled ${duty.name}`); availabilityState = "scheduled"; }
    const opportunityConflict = (indexes.opportunityRecordsByPersonId?.get(personId) ?? []).map(id => state.entities.opportunityRecords[id]).find(record => record && ["accepted","in_progress"].includes(record.status) && Number.isInteger(record.reportElapsedDay) && overlaps(activityStart, activityEnd, record.reportElapsedDay, record.completeElapsedDay));
    if (opportunityConflict) { reasons.push("conflicts with accepted school/orders window"); availabilityState = "scheduled"; }
    const lastSame = recentRecords.filter(record => record.activityDefinitionId === activity.id).sort((a,b) => (b.endElapsedDay ?? 0) - (a.endElapsedDay ?? 0))[0];
    const cooldownRemaining = lastSame && activity.cooldownDays ? Math.max(0, activity.cooldownDays - (currentElapsedDay - (lastSame.endElapsedDay ?? currentElapsedDay))) : 0;
    if (cooldownRemaining > 0) { reasons.push(`cooldown ${cooldownRemaining} day${cooldownRemaining === 1 ? "" : "s"}`); availabilityState = "recovering"; }
    const windowDays = activity.repetitionWindowDays ?? 7;
    const repeatedCount = recentRecords.filter(record => record.activityDefinitionId === activity.id && currentElapsedDay - (record.endElapsedDay ?? -9999) <= windowDays).length;
    const efficiency = repeatedCount >= 3 ? 40 : repeatedCount === 2 ? 60 : repeatedCount === 1 ? 80 : 100;
    return { id: activity.id, name: activity.name, shortName: activity.shortName, durationDays: activity.durationDays, description: activity.description, eligible: reasons.length === 0, availabilityState, reasons, efficiency, cooldownRemaining };
  });

  const recentActivities = recentRecords.slice(-5).reverse();
  const eventIds = indexes.gameplayEventsByPersonId?.get(personId) ?? [];
  const pendingDecisions = eventIds.map(id => state.entities.gameplayEventRecords[id]).filter(record => record?.status === "pending").map(record => {
    const def = registries.gameplayEvents.get(record.definitionId);
    return { id: record.id, title: def.title, message: def.message, deadlineElapsedDay: record.expiresElapsedDay, daysRemaining: record.expiresElapsedDay == null ? null : Math.max(0, record.expiresElapsedDay - currentElapsedDay), choices: (def.choices ?? []).map(choice => ({ id: choice.id, label: choice.label })) };
  });

  const upcomingSchedule = scheduleRecords.filter(record => ["scheduled","in_progress"].includes(record.status) && record.endElapsedDay >= currentElapsedDay).sort((a,b) => a.startElapsedDay - b.startElapsedDay).slice(0, 8).map(record => {
    const duty = registries.duties.get(record.dutyDefinitionId);
    return { ...record, name: duty.name, shortName: duty.shortName, category: duty.category, description: duty.description };
  });
  const currentDuty = upcomingSchedule.find(record => record.status === "in_progress" || (record.startElapsedDay <= currentElapsedDay && record.endElapsedDay >= currentElapsedDay)) ?? null;
  const recentDuties = scheduleRecords.filter(record => record.status === "completed").sort((a,b) => (b.endElapsedDay ?? 0) - (a.endElapsedDay ?? 0)).slice(0,5).map(record => {
    const duty = registries.duties.get(record.dutyDefinitionId);
    return { ...record, name:duty.name, shortName:duty.shortName, category:duty.category };
  });

  const opportunityRecords = (indexes.opportunityRecordsByPersonId?.get(personId) ?? []).map(id => state.entities.opportunityRecords[id]).filter(Boolean).sort((a,b) => (b.offeredElapsedDay ?? 0) - (a.offeredElapsedDay ?? 0));
  const opportunities = opportunityRecords.map(record => {
    const def = registries.opportunities.get(record.definitionId);
    const school = def.schoolId ? registries.schools.get(def.schoolId) : null;
    return { ...record, name: def.name, title: def.title, message: def.message, schoolName: school?.name ?? null, durationDays: school?.durationDays ?? null, daysRemaining: record.status === "open" ? Math.max(0, record.expiresElapsedDay - currentElapsedDay) : null };
  });

  const objectiveRecords = (indexes.objectiveRecordsByPersonId?.get(personId) ?? []).map(id => state.entities.objectiveRecords[id]).filter(Boolean);
  const objectives = objectiveRecords.map(record => { const def = registries.careerObjectives.get(record.definitionId); return { ...record, name: def.name, description: def.description }; });

  const performanceIds = indexes.performanceRecordsByPersonId?.get(personId) ?? [];
  const recentPerformance = performanceIds.slice(-5).map(id => state.entities.performanceRecords[id]).filter(record => Number.isFinite(record?.score));
  const performanceIndex = recentPerformance.length ? Math.round(recentPerformance.reduce((sum,record)=>sum+record.score,0)/recentPerformance.length) : null;

  const billet = person.affiliation.billetId ? state.entities.billets[person.affiliation.billetId] : null;
  const billetDef = billet ? registries.billets.get(billet.definitionId) : null;
  const role = billetDef ? registries.roles.get(billetDef.roleId) : null;
  const authorityIds = [...(role?.authorityIds ?? [])];
  const commandDuties = authorityIds.includes("authority_schedule_unit_training")
    ? registries.duties.values().filter(duty => ["training","maintenance","field","recovery"].includes(duty.category)).map(duty => ({ id:duty.id, name:duty.name, shortName:duty.shortName, durationDays:duty.durationDays, category:duty.category }))
    : [];
  const readiness = person.affiliation.unitId ? calculateUnitReadiness(state, indexes, registries, person.affiliation.unitId) : null;

  return { skills, activities, recentActivities, recentDuties, pendingDecisions, upcomingSchedule, currentDuty, opportunities, objectives, authorityIds, commandDuties, readiness, performanceIndex };
}
