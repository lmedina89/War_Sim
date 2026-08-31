import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { simulatePersonnelLifecycle } from "../services/personnelLifecycle.js";
import { processPersonnelAdministration } from "../services/personnelAdministration.js";
import { applyEffects, ensureSkillProfile } from "../services/effectEngine.js";
import { resolveActivityEvent } from "../services/gameplayEvents.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function performActivity(store, registries, personId, activityId) {
  const activity = registries.activities.get(activityId);
  const before = store.getState().entities.people[personId];
  if (!before) throw new Error(`Unknown person ${personId}.`);
  const rank = registries.ranks.get(before.affiliation.rankId);
  const eligibility = activity.eligibility ?? {};
  if (eligibility.allowedStatuses && !eligibility.allowedStatuses.includes(before.condition.status)) throw new Error(`${activity.name} is unavailable while status is ${before.condition.status}.`);
  if (before.condition.health < (eligibility.minimumHealth ?? 0)) throw new Error(`${activity.name} requires at least ${eligibility.minimumHealth}% health.`);
  if (eligibility.minimumRankLevel && rank.hierarchyLevel < eligibility.minimumRankLevel) throw new Error(`${activity.name} requires a higher rank.`);
  if (eligibility.requiresAssignedUnit && !before.affiliation.unitId) throw new Error(`${activity.name} requires a unit assignment.`);
  const notifications = [];
  const startDate = store.getState().world.date;
  const relationshipIds = [...(store.getIndexes().relationshipsByPersonId?.get(personId) ?? [])];
  let activityRecordId;
  store.mutate(draft => {
    const person = draft.entities.people[personId];
    ensureSkillProfile(draft, registries, personId);
    advanceClock(draft, activity.durationDays);
    simulatePersonnelLifecycle(draft, activity.durationDays, registries, { excludePersonId: personId });
    processPersonnelAdministration(draft, registries);
    applyEffects(draft, registries, { personId, unitId: person.affiliation.unitId, relationshipIds, effects: activity.effects });
    const event = resolveActivityEvent(draft, registries, { personId, unitId: person.affiliation.unitId, relationshipIds, activityId: activity.id, eventTableId: activity.eventTableId });
    if (event?.notificationId) notifications.push(event.notificationId);
    activityRecordId = createEntityId(draft, "activity");
    draft.entities.activityRecords[activityRecordId] = { id: activityRecordId, schemaVersion: 1, activityDefinitionId: activity.id, personId, unitId: person.affiliation.unitId, startDate, endDate: draft.world.date, durationDays: activity.durationDays, status: "completed", eventRecordId: event?.eventRecordId ?? null };
    const perfId = createEntityId(draft, "perf");
    draft.entities.performanceRecords[perfId] = { id: perfId, schemaVersion: 1, personId, sourceType: "activity", sourceId: activityRecordId, gameDate: draft.world.date, rating: "completed", notes: `${activity.name} completed.` };
    const completionNoticeId = recordNotification(draft, { personId, type: "activity_completed", title: `${activity.name} Complete`, message: `${activity.name} completed after ${activity.durationDays} day${activity.durationDays === 1 ? "" : "s"}.`, priority: "normal", references: { activityRecordId } });
    notifications.unshift(completionNoticeId);
    recordAction(draft, { actorPersonId: personId, commandType: "perform_activity", payload: { activityId, durationDays: activity.durationDays }, resultCode: "activity_completed" });
  }, ["people", "history", "notifications", "actions", "admin", "career", "activities"]);
  return commandResult({ code: "activity_completed", message: `${activity.name} completed.`, data: { activityRecordId, activityId }, notifications });
}
