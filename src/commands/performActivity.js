import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { simulatePersonnelLifecycle } from "../services/personnelLifecycle.js";
import { processPersonnelAdministration } from "../services/personnelAdministration.js";
import { applyEffects, ensureSkillProfile } from "../services/effectEngine.js";
import { resolveActivityEvent } from "../services/gameplayEvents.js";
import { recordAction, recordNotification } from "../services/recordServices.js";
import { applyUnitTrainingEffects, syncUnitReadiness } from "../services/unitReadiness.js";
import { updateCareerObjectivesInDraft, ensureScheduleCoverageInDraft, evaluateCareerOpportunitiesInDraft, expireCareerOpportunitiesInDraft } from "../services/careerGameplay.js";
import { calculateIndividualPerformanceScore, resolvePerformanceRating } from "../services/performance.js";
import { resolveExpiredGameplayDecisionsInDraft } from "../services/gameplayEvents.js";
import { evaluatePromotionEligibility } from "../services/careerRules.js";
import { applyNpcParticipationForDuty, recordDutyQualification, recordUnitEvent } from "../services/livingUnit.js";
import { describeScheduleConflict, scheduleConflictForActivity } from "../services/scheduleRules.js";
import { evaluateCommendationAwardsInDraft } from "../services/awardProgression.js";
import { activeServiceBlockReason, activityCompletionDate, contractCoverageThrough } from "../services/serviceLifecycle.js";

function intervalsOverlap(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && bStart <= aEnd; }
function clamp(value, min=0, max=100) { return Math.max(min, Math.min(max, Math.round(value))); }

function scaleBenefitEffect(effect, multiplier) {
  const value = Number(effect.value);
  if (!Number.isFinite(value) || value <= 0) return effect;
  if (effect.target === "person" && effect.field === "condition.fatigue") return effect;
  return { ...effect, value: Math.max(1, Math.round(value * multiplier)) };
}

export function performActivity(store, registries, personId, activityId) {
  const activity = registries.activities.get(activityId);
  if (!activity) throw new Error(`Unknown activity ${activityId}.`);
  let state = store.getState(), indexes = store.getIndexes();
  const initialPerson = state.entities.people[personId];
  if (!initialPerson) throw new Error(`Unknown person ${personId}.`);
  const serviceBlockReason = activeServiceBlockReason(state, personId);
  if (serviceBlockReason) throw new Error(serviceBlockReason);
  const completionDate = activityCompletionDate(state, activity.durationDays);
  const coverage = contractCoverageThrough(state, personId, completionDate);
  if (!coverage.covered) throw new Error(`${activity.name} cannot be completed before ETS/contract expiration. ${coverage.reason}`);
  // Only materialize schedule coverage after all non-mutating lifecycle preflight checks pass.
  // A rejected activity therefore leaves the canonical world byte-for-byte unchanged.
  if (initialPerson.affiliation?.unitId) {
    store.mutate(draft => ensureScheduleCoverageInDraft(draft, registries, personId, initialPerson.affiliation.unitId, activity.durationDays + 70), ["careerGameplay"]);
    state = store.getState(); indexes = store.getIndexes();
  }
  const before = state.entities.people[personId];
  const rank = registries.ranks.get(before.affiliation.rankId);
  const activeSchool = (indexes.opportunityRecordsByPersonId?.get(personId) ?? []).map(id=>state.entities.opportunityRecords[id]).find(record=>record && record.status==="in_progress" && Number.isInteger(record.reportElapsedDay) && Number.isInteger(record.completeElapsedDay) && state.world.clock.elapsedDays>=record.reportElapsedDay && state.world.clock.elapsedDays<=record.completeElapsedDay);
  if (activeSchool && activity.allowedDuringSchool !== true) throw new Error(`${activity.name} is unavailable while attending military school.`);
  const eligibility = activity.eligibility ?? {};
  if (eligibility.allowedStatuses && !eligibility.allowedStatuses.includes(before.condition.status)) throw new Error(`${activity.name} is unavailable while status is ${before.condition.status}.`);
  if (before.condition.health < (eligibility.minimumHealth ?? 0)) throw new Error(`${activity.name} requires at least ${eligibility.minimumHealth}% health.`);
  if (eligibility.minimumRankLevel && rank.hierarchyLevel < eligibility.minimumRankLevel) throw new Error(`${activity.name} requires a higher rank.`);
  if (eligibility.requiresAssignedUnit && !before.affiliation.unitId) throw new Error(`${activity.name} requires a unit assignment.`);
  if (activity.category !== "recovery" && before.condition.fatigue >= 85) throw new Error("Fatigue is too high for focused training. Complete recovery first.");

  const startElapsedDay = state.world.clock.elapsedDays + 1, endElapsedDay = state.world.clock.elapsedDays + activity.durationDays;
  const scheduleIds = indexes.scheduleRecordsByPersonId?.get(personId) ?? [];
  const scheduleRecords = scheduleIds.map(id => state.entities.scheduleRecords[id]).filter(Boolean);
  const conflict = scheduleConflictForActivity(scheduleRecords, registries, startElapsedDay, endElapsedDay);
  if (conflict) throw new Error(`${activity.name} conflicts with ${describeScheduleConflict(conflict, registries)}.`);
  const opportunityConflict = (indexes.opportunityRecordsByPersonId?.get(personId) ?? []).map(id => state.entities.opportunityRecords[id]).find(record => record && ["accepted","in_progress"].includes(record.status) && Number.isInteger(record.reportElapsedDay) && intervalsOverlap(startElapsedDay, endElapsedDay, record.reportElapsedDay, record.completeElapsedDay));
  if (opportunityConflict) throw new Error(`${activity.name} conflicts with accepted school/orders dates.`);

  const currentElapsedDay = state.world.clock.elapsedDays;
  const activityIds = indexes.activityRecordsByPersonId?.get(personId) ?? [];
  const sameRecords = activityIds.map(id => state.entities.activityRecords[id]).filter(record => record?.activityDefinitionId === activityId);
  const latestSame = sameRecords.slice().sort((a,b) => (b.endElapsedDay ?? 0) - (a.endElapsedDay ?? 0))[0];
  const cooldownRemaining = latestSame && activity.cooldownDays ? Math.max(0, activity.cooldownDays - (currentElapsedDay - (latestSame.endElapsedDay ?? currentElapsedDay))) : 0;
  if (cooldownRemaining > 0) throw new Error(`${activity.name} is on cooldown for ${cooldownRemaining} more day${cooldownRemaining === 1 ? "" : "s"}.`);
  const recentSame = sameRecords.filter(record => currentElapsedDay - (record.endElapsedDay ?? -9999) <= (activity.repetitionWindowDays ?? 7)).length;
  const repetitionMultiplier = recentSame >= 3 ? 0.4 : recentSame === 2 ? 0.6 : recentSame === 1 ? 0.8 : 1;

  const notifications = [];
  const startDate = state.world.date;
  const relationshipIds = [...(indexes.relationshipsByPersonId?.get(personId) ?? [])];
  const unitId = before.affiliation.unitId;
  const billetIds = unitId ? [...(indexes.billetsByUnitId?.get(unitId) ?? [])] : [];
  const unitPersonIds = unitId ? [...(indexes.peopleByUnitId?.get(unitId) ?? [])] : [];
  let activityRecordId;
  let participantPersonIds = [personId];
  let qualificationResult = null;

  store.mutate(draft => {
    const person = draft.entities.people[personId];
    const profile = ensureSkillProfile(draft, registries, personId);
    const unit = person.affiliation.unitId ? draft.entities.units[person.affiliation.unitId] : null;
    const snapshot = () => ({ experience: person.career.experience, prestige: person.career.prestige, health: person.condition.health, morale: person.condition.morale, readiness: person.condition.readiness, fatigue: person.condition.fatigue, skills: { ...profile.values }, unitReadiness: unit?.condition?.readiness ?? null, unitCohesion: unit?.condition?.cohesion ?? null });
    const beforeSnapshot = snapshot();
    const score = calculateIndividualPerformanceScore(draft, person, profile, activity);
    const ratingDef = resolvePerformanceRating(registries, score);
    const effectMultiplier = repetitionMultiplier * (ratingDef.effectMultiplier ?? 1);

    const elapsedBefore = draft.world.clock.elapsedDays;
    advanceClock(draft, activity.durationDays);
    const expiredDecisions = resolveExpiredGameplayDecisionsInDraft(draft, registries, personId);
    notifications.push(...expiredDecisions.notificationIds);
    simulatePersonnelLifecycle(draft, activity.durationDays, registries, { excludePersonId: personId });
    processPersonnelAdministration(draft, registries);
    const completionServiceBlock = activeServiceBlockReason(draft, personId);
    if (completionServiceBlock) throw new Error(`${activity.name} was interrupted because ${completionServiceBlock}`);
    const scaledEffects = (activity.effects ?? []).map(effect => scaleBenefitEffect(effect, effectMultiplier));
    applyEffects(draft, registries, { personId, unitId: person.affiliation.unitId, relationshipIds, effects: scaledEffects });
    const collectiveActivity = activity.participantScope && activity.participantScope !== "individual";
    if (unit && collectiveActivity && activity.unitTrainingEffects) applyUnitTrainingEffects(draft, unit.id, Object.fromEntries(Object.entries(activity.unitTrainingEffects).map(([key,value]) => [key, Math.round(value * effectMultiplier)])));
    if (unit) {
      const monthlyCycles = Math.floor(draft.world.clock.elapsedDays / 30) - Math.floor(elapsedBefore / 30);
      if (monthlyCycles > 0) applyUnitTrainingEffects(draft, unit.id, { physical:-monthlyCycles, weapons:-monthlyCycles, tactical:-monthlyCycles, equipmentReadiness:-monthlyCycles });
    }

    const event = resolveActivityEvent(draft, registries, { personId, unitId: person.affiliation.unitId, relationshipIds, activityId: activity.id, eventTableId: activity.eventTableId, performanceScore: score });
    if (event?.notificationId) notifications.push(event.notificationId);

    const currentPersonIds = unit ? billetIds.map(billetId => draft.entities.billets[billetId]?.assignedPersonId).filter(Boolean) : [];
    if (activity.qualificationDutyDefinitionId) {
      const qualificationDuty = registries.duties.get(activity.qualificationDutyDefinitionId);
      qualificationResult = recordDutyQualification(draft, registries, personId, qualificationDuty, score, { sourceType:"player_activity", sourceId:activity.id });
    }
    if (unit && activity.collectiveDutyDefinitionId) {
      const collectiveDuty = registries.duties.get(activity.collectiveDutyDefinitionId);
      const npcResult = applyNpcParticipationForDuty(draft, registries, { unitId:unit.id, duty:collectiveDuty, playerPersonId:personId, performanceScore:score, participantPersonIds:currentPersonIds.length ? currentPersonIds : unitPersonIds });
      participantPersonIds = [personId, ...npcResult.participantIds];
      recordUnitEvent(draft, { unitId:unit.id, type:"training_completed", title:`${activity.name} completed`, summary:`${participantPersonIds.length} personnel participated · ${ratingDef.label} ${score}/100.`, personId, sourceType:"player_activity", sourceId:activity.id, importance:"routine" });
    }
    if (unit) syncUnitReadiness(draft, registries, unit.id, { billetIds, personIds: currentPersonIds.length ? currentPersonIds : unitPersonIds });
    const afterSnapshot = snapshot();
    const deltas = {};
    for (const key of ["experience","prestige","health","morale","readiness","fatigue"]) if (beforeSnapshot[key] != null && afterSnapshot[key] !== beforeSnapshot[key]) deltas[key] = afterSnapshot[key] - beforeSnapshot[key];
    if (collectiveActivity) for (const key of ["unitReadiness","unitCohesion"]) if (beforeSnapshot[key] != null && afterSnapshot[key] !== beforeSnapshot[key]) deltas[key] = afterSnapshot[key] - beforeSnapshot[key];
    deltas.skills = Object.fromEntries(Object.keys(afterSnapshot.skills).filter(key => afterSnapshot.skills[key] !== beforeSnapshot.skills[key]).map(key => [key, afterSnapshot.skills[key] - beforeSnapshot.skills[key]]));

    activityRecordId = createEntityId(draft, "activity");
    draft.entities.activityRecords[activityRecordId] = { id: activityRecordId, schemaVersion: 5, activityDefinitionId: activity.id, personId, unitId: person.affiliation.unitId, sourceType: "player_activity", participantScope: activity.participantScope ?? "individual", startDate, endDate: draft.world.date, durationDays: activity.durationDays, endElapsedDay: draft.world.clock.elapsedDays, repetitionMultiplier, performanceScore: score, status: "completed", eventRecordId: event?.eventRecordId ?? null, performanceRating: ratingDef.id, participantPersonIds: [...new Set(participantPersonIds)], qualificationResult: qualificationResult ? { ...qualificationResult } : null, before: beforeSnapshot, after: afterSnapshot, deltas };
    const perfId = createEntityId(draft, "perf");
    const performanceNote = qualificationResult
      ? `${activity.name}: ${qualificationResult.label} ${qualificationResult.score}/${qualificationResult.maxScore}; training performance ${ratingDef.label} ${score}/100.`
      : `${activity.name} completed with ${ratingDef.label.toLowerCase()} performance.`;
    draft.entities.performanceRecords[perfId] = { id: perfId, schemaVersion: 3, personId, sourceType: "activity", sourceId: activityRecordId, gameDate: draft.world.date, rating: ratingDef.id, score, notes: performanceNote, deltas };
    const commendations = evaluateCommendationAwardsInDraft(draft, registries, personId);
    notifications.push(...commendations.map(item => item.notificationId));
    const completionMessage = qualificationResult
      ? `${activity.name} result: ${qualificationResult.label} ${qualificationResult.score}/${qualificationResult.maxScore}. Training performance: ${ratingDef.label} ${score}/100.`
      : `${activity.name} completed with ${ratingDef.label.toLowerCase()} performance after ${activity.durationDays} day${activity.durationDays === 1 ? "" : "s"}.`;
    const completionNoticeId = recordNotification(draft, { personId, type: "activity_completed", title: `${activity.name} Complete`, message: completionMessage, priority: "normal", references: { activityRecordId } });
    notifications.unshift(completionNoticeId);
    const newOpportunities = evaluateCareerOpportunitiesInDraft(draft, registries, personId);
    notifications.push(...newOpportunities.map(item => item.notificationId));
    expireCareerOpportunitiesInDraft(draft, personId);
    updateCareerObjectivesInDraft(draft, registries, personId);
    recordAction(draft, { actorPersonId: personId, commandType: "perform_activity", payload: { activityId, durationDays: activity.durationDays, performanceScore: score }, resultCode: "activity_completed" });
  }, ["people", "history", "notifications", "actions", "admin", "career", "activities", "careerGameplay", "units"]);
  const promotion = evaluatePromotionEligibility(store.getState(), store.getIndexes(), registries, personId);
  store.mutate(draft => updateCareerObjectivesInDraft(draft, registries, personId, { promotionEligible: promotion.eligible }), ["careerGameplay"]);
  return commandResult({ code: "activity_completed", message: `${activity.name} completed.`, data: { activityRecordId, activityId }, notifications });
}
