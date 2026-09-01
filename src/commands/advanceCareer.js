import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { recordAction } from "../services/recordServices.js";
import { simulatePersonnelLifecycle } from "../services/personnelLifecycle.js";
import { processPersonnelAdministration } from "../services/personnelAdministration.js";
import { registries } from "../data/registries.js";
import { ensureScheduleCoverageInDraft, processScheduledDutyForDay, applyPassiveRecoveryForDay, evaluateCareerOpportunitiesInDraft, expireCareerOpportunitiesInDraft, processOpportunityLifecycleForDay, updateCareerObjectivesInDraft } from "../services/careerGameplay.js";
import { applyUnitTrainingEffects, syncUnitReadiness } from "../services/unitReadiness.js";
import { evaluatePromotionEligibility } from "../services/careerRules.js";
import { resolveExpiredGameplayDecisionsInDraft } from "../services/gameplayEvents.js";
import { recordReadinessSnapshot } from "../services/livingUnit.js";
import { processLivingCareerForDay } from "../services/livingCareer.js";
import { scheduleRecordBlocksFocusedActivities } from "../services/scheduleRules.js";
import { evaluateServiceAwardsInDraft, evaluateCommendationAwardsInDraft } from "../services/awardProgression.js";
import { assertActiveServiceAction } from "../services/serviceLifecycle.js";

function indexedCount(indexes, indexName, personId) { return indexes[indexName]?.get(personId)?.length ?? 0; }
function unitSnapshot(state, personId) {
  const person = state.entities.people[personId], unit = person?.affiliation.unitId ? state.entities.units[person.affiliation.unitId] : null;
  return unit ? { unitId: unit.id, unitName: unit.name, readiness: unit.condition?.readiness ?? null, morale: unit.condition?.morale ?? null } : null;
}

function scheduleMapForRange(state, indexes, personId, startExclusive, endInclusive) {
  const map = new Map();
  for (const id of indexes.scheduleRecordsByPersonId?.get(personId) ?? []) {
    const record = state.entities.scheduleRecords[id];
    if (!record || !["scheduled","in_progress"].includes(record.status)) continue;
    if (record.endElapsedDay <= startExclusive || record.startElapsedDay > endInclusive) continue;
    for (let day = Math.max(record.startElapsedDay, startExclusive + 1); day <= Math.min(record.endElapsedDay, endInclusive); day++) {
      const bucket = map.get(day) ?? []; bucket.push(id); map.set(day, bucket);
    }
  }
  return map;
}

function scheduleIdsForDayInDraft(draft, personId, elapsedDay) {
  const ids=[];
  for (const record of Object.values(draft.entities.scheduleRecords ?? {})) {
    if (record.personId !== personId || !["scheduled","in_progress"].includes(record.status)) continue;
    if (record.startElapsedDay <= elapsedDay && record.endElapsedDay >= elapsedDay) ids.push(record.id);
  }
  return ids.sort();
}

function hasBlockingPendingDecision(state, indexes, personId) {
  return (indexes.gameplayEventsByPersonId?.get(personId) ?? []).map(id => state.entities.gameplayEventRecords[id]).find(record => {
    if (record?.status !== "pending") return false;
    const def = registries.gameplayEvents.get(record.definitionId);
    return def.blocksTimeAdvance !== false;
  }) ?? null;
}

export function advanceWorldDays(store, requestedDays) {
  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 3650) throw new Error("Days must be between 1 and 3650.");
  let state = store.getState(), indexes = store.getIndexes();
  const actorPersonId = state.playerPersonId;
  if (!actorPersonId) throw new Error("Create or load a career first.");
  if (hasBlockingPendingDecision(state, indexes, actorPersonId)) throw new Error("Resolve the pending gameplay decision before advancing time.");
  const player = state.entities.people[actorPersonId];
  if (!player) throw new Error("Player personnel record is missing.");

  store.mutate(draft => {
    if (player.affiliation.unitId) ensureScheduleCoverageInDraft(draft, registries, actorPersonId, player.affiliation.unitId);
  }, ["careerGameplay"]);
  state = store.getState(); indexes = store.getIndexes();

  const startDate = state.world.date, startElapsedDay = state.world.clock.elapsedDays;
  const unitId = state.entities.people[actorPersonId]?.affiliation.unitId ?? null;
  const relationshipIds = [...(indexes.relationshipsByPersonId?.get(actorPersonId) ?? [])];
  const billetIds = unitId ? [...(indexes.billetsByUnitId?.get(unitId) ?? [])] : [];
  const unitPersonIds = unitId ? [...(indexes.peopleByUnitId?.get(unitId) ?? [])] : [];
  const unitEventCountBefore = unitId ? (indexes.unitEventRecordsByUnitId?.get(unitId)?.length ?? 0) : 0;
  const statusBefore = state.entities.people[actorPersonId]?.condition.status ?? null;
  const unitBefore = unitSnapshot(state, actorPersonId);
  const playerCountsBefore = {
    notifications: indexedCount(indexes, "notificationsByPersonId", actorPersonId), orders: indexedCount(indexes, "ordersByPersonId", actorPersonId),
    promotions: indexedCount(indexes, "promotionsByPersonId", actorPersonId), qualifications: indexedCount(indexes, "qualificationsByPersonId", actorPersonId), awards: indexedCount(indexes, "awardsByPersonId", actorPersonId), personnelActions: indexedCount(indexes, "personnelActionsByPersonId", actorPersonId)
  };

  const completedDuties = [], generatedOpportunities = [], expiredOpportunities = [], notificationIds = [];
  let actualDays = 0, interruptedByDecision = false;

  store.mutate(draft => {
    for (let i = 0; i < requestedDays; i++) {
      advanceClock(draft, 1); actualDays += 1;
      if (unitId && ((draft.world.scheduler?.generatedThroughElapsedDay ?? 0) - draft.world.clock.elapsedDays < 14)) ensureScheduleCoverageInDraft(draft, registries, actorPersonId, unitId);
      const expiredDecisions = resolveExpiredGameplayDecisionsInDraft(draft, registries, actorPersonId);
      notificationIds.push(...expiredDecisions.notificationIds);
      simulatePersonnelLifecycle(draft, 1, registries, { excludePersonId: actorPersonId });
      processPersonnelAdministration(draft, registries);
      const person = draft.entities.people[actorPersonId];
      if (!person || ["separated","retired","deceased"].includes(person.condition.status)) break;

      const opportunityNotifications = processOpportunityLifecycleForDay(draft, registries, actorPersonId);
      notificationIds.push(...opportunityNotifications);
      const dayScheduleIds = scheduleIdsForDayInDraft(draft, actorPersonId, draft.world.clock.elapsedDays);
      const currentUnitPersonIds = unitId ? billetIds.map(billetId => draft.entities.billets[billetId]?.assignedPersonId).filter(Boolean) : [];
      const dutyResult = processScheduledDutyForDay(draft, registries, dayScheduleIds, { personId: actorPersonId, relationshipIds, billetIds, personIds: currentUnitPersonIds });
      notificationIds.push(...dutyResult.notifications);
      completedDuties.push(...dutyResult.completedDutyIds);
      const onDuty = dayScheduleIds.some(id => scheduleRecordBlocksFocusedActivities(draft.entities.scheduleRecords[id]));
      applyPassiveRecoveryForDay(draft, actorPersonId, { onDuty });

      if (unitId && draft.world.clock.elapsedDays % 30 === 0) {
        applyUnitTrainingEffects(draft, unitId, { physical: -1, weapons: -1, tactical: -1, equipmentReadiness: -1 });
        const currentUnitPersonIds = billetIds.map(billetId => draft.entities.billets[billetId]?.assignedPersonId).filter(Boolean);
        const monthlyReadiness=syncUnitReadiness(draft, registries, unitId, { billetIds, personIds: currentUnitPersonIds });
        recordReadinessSnapshot(draft,unitId,monthlyReadiness,{force:false});
      }

      const created = evaluateCareerOpportunitiesInDraft(draft, registries, actorPersonId);
      generatedOpportunities.push(...created.map(item => item.opportunityRecordId));
      notificationIds.push(...created.map(item => item.notificationId));
      expiredOpportunities.push(...expireCareerOpportunitiesInDraft(draft, actorPersonId));
      updateCareerObjectivesInDraft(draft, registries, actorPersonId);
      const livingResult=processLivingCareerForDay(draft,registries,actorPersonId);
      notificationIds.push(...livingResult.notificationIds);
      const serviceAwards=evaluateServiceAwardsInDraft(draft,registries,actorPersonId);
      const commendations=evaluateCommendationAwardsInDraft(draft,registries,actorPersonId);
      notificationIds.push(...serviceAwards.map(item=>item.notificationId),...commendations.map(item=>item.notificationId));

      const pending = Object.values(draft.entities.gameplayEventRecords ?? {}).find(record => {
        if (record.personId !== actorPersonId || record.status !== "pending") return false;
        const def = registries.gameplayEvents.get(record.definitionId);
        return def.blocksTimeAdvance !== false;
      });
      if (pending) { interruptedByDecision = true; break; }
    }
    recordAction(draft, { actorPersonId, commandType: "advance_time", payload: { requestedDays, actualDays }, resultCode: interruptedByDecision ? "time_interrupted" : "time_advanced" });
  }, ["actions", "people", "billets", "history", "orders", "notifications", "career", "admin", "activities", "careerGameplay", "units"]);

  const promotion = evaluatePromotionEligibility(store.getState(), store.getIndexes(), registries, actorPersonId);
  store.mutate(draft => updateCareerObjectivesInDraft(draft, registries, actorPersonId, { promotionEligible: promotion.eligible }), ["careerGameplay"]);

  const after = store.getState(), afterIndexes = store.getIndexes();
  const statusAfter = after.entities.people[actorPersonId]?.condition.status ?? null;
  const unitAfter = unitSnapshot(after, actorPersonId);
  const playerCountsAfter = {
    notifications: indexedCount(afterIndexes, "notificationsByPersonId", actorPersonId), orders: indexedCount(afterIndexes, "ordersByPersonId", actorPersonId),
    promotions: indexedCount(afterIndexes, "promotionsByPersonId", actorPersonId), qualifications: indexedCount(afterIndexes, "qualificationsByPersonId", actorPersonId), awards: indexedCount(afterIndexes, "awardsByPersonId", actorPersonId), personnelActions: indexedCount(afterIndexes, "personnelActionsByPersonId", actorPersonId)
  };

  const summaryItems = [{ id: "service_time", label: `${actualDays} day${actualDays === 1 ? "" : "s"} of service time accrued`, tone: "routine" }];
  const countLabels = { notifications: "new notification", orders: "new order", promotions: "promotion recorded", qualifications: "qualification earned", awards: "award earned", personnelActions: "personnel action affecting you" };
  for (const [key, label] of Object.entries(countLabels)) { const delta = playerCountsAfter[key] - playerCountsBefore[key]; if (delta > 0) summaryItems.push({ id:key, label:`${delta} ${label}${delta === 1 ? "" : "s"}`, tone:key === "notifications" || key === "orders" ? "attention" : "good" }); }
  if (unitId) { const unitEventDelta=(afterIndexes.unitEventRecordsByUnitId?.get(unitId)?.length ?? 0)-unitEventCountBefore; if(unitEventDelta>0) summaryItems.push({id:"unit_activity",label:`${unitEventDelta} significant unit event${unitEventDelta===1?"":"s"} recorded`,tone:"routine"}); }
  if (completedDuties.length) {
    const names = [...new Set(completedDuties.map(id => after.entities.scheduleRecords[id]).filter(Boolean).map(record => registries.duties.get(record.dutyDefinitionId).shortName))];
    summaryItems.push({ id:"scheduled_duties", label:`Scheduled duties completed: ${names.join(", ")}`, tone:"good" });
  }
  if (generatedOpportunities.length) summaryItems.push({ id:"opportunities", label:`${generatedOpportunities.length} new career opportunit${generatedOpportunities.length === 1 ? "y" : "ies"} available`, tone:"attention" });
  if (expiredOpportunities.length) summaryItems.push({ id:"expired_opportunities", label:`${expiredOpportunities.length} career opportunit${expiredOpportunities.length === 1 ? "y expired" : "ies expired"}`, tone:"warning" });
  if (statusBefore && statusAfter && statusBefore !== statusAfter) summaryItems.push({ id:"status", label:`Status changed: ${statusBefore} → ${statusAfter}`, tone:"attention" });
  if (unitBefore && unitAfter && unitBefore.unitId === unitAfter.unitId) {
    if (unitBefore.readiness != null && unitAfter.readiness !== unitBefore.readiness) summaryItems.push({ id:"unit_readiness", label:`${unitAfter.unitName} readiness ${unitBefore.readiness}% → ${unitAfter.readiness}%`, tone:unitAfter.readiness > unitBefore.readiness ? "good" : "warning" });
    if (unitBefore.morale != null && unitAfter.morale !== unitBefore.morale) summaryItems.push({ id:"unit_morale", label:`${unitAfter.unitName} morale ${unitBefore.morale}% → ${unitAfter.morale}%`, tone:unitAfter.morale > unitBefore.morale ? "good" : "warning" });
  }
  if (interruptedByDecision) summaryItems.push({ id:"interrupted", label:"Time advance stopped because a decision requires your attention", tone:"attention" });
  if (summaryItems.length === 1) summaryItems.push({ id:"quiet_period", label:"No major career or unit events occurred", tone:"muted" });

  return commandResult({ code: interruptedByDecision ? "time_interrupted" : "time_advanced", message: interruptedByDecision ? `Advanced ${actualDays} day${actualDays === 1 ? "" : "s"}; decision required.` : `Advanced ${actualDays} days.`, data: { days: actualDays, requestedDays, startDate, endDate: after.world.date, summaryItems }, notifications: notificationIds });
}

export function grantTrainingExperience(store, personId, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error("Invalid experience amount.");
  if (!store.getState().entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  assertActiveServiceAction(store.getState(), personId);
  const rounded = Math.floor(amount);
  store.mutate(draft => { draft.entities.people[personId].career.experience += rounded; recordAction(draft, { actorPersonId: personId, commandType: "training", payload: { experience: rounded }, resultCode: "training_completed" }); }, ["actions", "people", "history"]);
  return commandResult({ code: "training_completed", message: `Training complete: +${rounded} experience.`, data: { experience: rounded } });
}
