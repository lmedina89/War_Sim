import { createEntityId } from "../core/ids.js";
import { addDaysIso, daysBetweenIso } from "./dateMath.js";
import { applyEffects } from "./effectEngine.js";
import { applyUnitTrainingEffects, syncUnitReadiness, ensureUnitTrainingProfile } from "./unitReadiness.js";
import { resolveActivityEvent } from "./gameplayEvents.js";
import { completeSchoolInDraft } from "./schoolCompletion.js";
import { recordNotification } from "./recordServices.js";
import { calculateDutyPerformanceScore, resolvePerformanceRating } from "./performance.js";

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function findOpenStart(draft, personId, requestedStart, durationDays) {
  const existing = Object.values(draft.entities.scheduleRecords ?? {}).filter(r => r.personId === personId && ["scheduled","in_progress"].includes(r.status)).map(r => ({ start:r.startElapsedDay, end:r.endElapsedDay }));
  for (const opportunity of Object.values(draft.entities.opportunityRecords ?? {})) if (opportunity.personId === personId && ["accepted","in_progress"].includes(opportunity.status) && Number.isInteger(opportunity.reportElapsedDay)) existing.push({ start:opportunity.reportElapsedDay, end:opportunity.completeElapsedDay });
  let start = requestedStart;
  for (let attempts = 0; attempts < 180; attempts++) {
    const end = start + durationDays - 1;
    if (!existing.some(r => intervalsOverlap(start, end, r.start, r.end))) return start;
    start += 1;
  }
  throw new Error("Unable to find a conflict-free schedule window.");
}

export function seedCareerGameplayRecords(draft, registries, personId, unitId) {
  draft.entities.scheduleRecords ??= {};
  draft.entities.opportunityRecords ??= {};
  draft.entities.objectiveRecords ??= {};
  const scenarioId = draft.world?.generation?.scenarioId;
  const scenario = scenarioId && registries.careerStartScenarios.has(scenarioId) ? registries.careerStartScenarios.get(scenarioId) : null;
  const templateId = scenario?.scheduleTemplateId;
  if (!templateId || !registries.scheduleTemplates.has(templateId)) throw new Error("No valid schedule template is configured for this career-start scenario.");
  const template = registries.scheduleTemplates.get(templateId);
  seedScheduleThrough(draft, registries, personId, unitId, template.id, draft.world.clock.elapsedDays + template.horizonDays);
  for (const objective of registries.careerObjectives.values()) {
    const id = createEntityId(draft, "objective");
    draft.entities.objectiveRecords[id] = { id, schemaVersion: 1, definitionId: objective.id, personId, status: "active", startedDate: draft.world.date, completedDate: null };
  }
  updateCareerObjectivesInDraft(draft, registries, personId);
}


export function scheduleAdditionalDutyInDraft(draft, registries, { personId, unitId, dutyDefinitionId, requestedStartElapsedDay = null, sourceTemplateId = null } = {}) {
  draft.entities.scheduleRecords ??= {};
  const duty = registries.duties.get(dutyDefinitionId);
  if (!duty) throw new Error(`Unknown duty definition ${dutyDefinitionId}.`);
  const person = draft.entities.people[personId];
  if (!person) throw new Error(`Unknown person ${personId}.`);
  if (!unitId || !draft.entities.units[unitId]) throw new Error(`Unknown unit ${unitId}.`);
  const requestedStart = Number.isInteger(requestedStartElapsedDay) ? requestedStartElapsedDay : draft.world.clock.elapsedDays + 1;
  const actualStart = findOpenStart(draft, personId, requestedStart, duty.durationDays);
  const id = createEntityId(draft, "schedule");
  const templateId = sourceTemplateId ?? draft.world.scheduler?.scheduleTemplateId ?? registries.scheduleTemplates.values()[0]?.id;
  draft.entities.scheduleRecords[id] = {
    id, schemaVersion: 1, kind: "unit_duty", dutyDefinitionId: duty.id, personId, unitId,
    sourceTemplateId: templateId, sourceType: sourceTemplateId ? "template" : "command", mandatory: true, status: "scheduled",
    nominalStartElapsedDay: requestedStart, startElapsedDay: actualStart, endElapsedDay: actualStart + duty.durationDays - 1,
    startDate: addDaysIso(draft.world.date, actualStart - draft.world.clock.elapsedDays),
    endDate: addDaysIso(draft.world.date, actualStart + duty.durationDays - 1 - draft.world.clock.elapsedDays),
    startedDate: null, completedDate: null, outcomeEventRecordId: null
  };
  return draft.entities.scheduleRecords[id];
}

export function seedScheduleThrough(draft, registries, personId, unitId, templateId, throughElapsedDay) {
  const template = registries.scheduleTemplates.get(templateId);
  draft.entities.scheduleRecords ??= {};
  const existingKeys = new Set(Object.values(draft.entities.scheduleRecords).filter(r => r.personId === personId && r.sourceTemplateId === templateId).map(r => `${r.dutyDefinitionId}:${r.nominalStartElapsedDay ?? r.startElapsedDay}`));
  const generatedThrough = Math.max(draft.world.scheduler?.generatedThroughElapsedDay ?? 0, draft.world.clock.elapsedDays);
  const base = draft.world.scheduler?.scheduleOriginElapsedDay ?? draft.world.clock.elapsedDays;
  for (const entry of template.entries) {
    const duty = registries.duties.get(entry.dutyDefinitionId);
    for (let start = base + entry.offsetDays; start <= throughElapsedDay; start += entry.repeatEveryDays) {
      if (existingKeys.has(`${duty.id}:${start}`)) continue;
      let actualStart = start;
      const actualEndCandidate = actualStart + duty.durationDays - 1;
      const conflict = Object.values(draft.entities.scheduleRecords).some(r => r.personId === personId && ["scheduled","in_progress"].includes(r.status) && intervalsOverlap(actualStart, actualEndCandidate, r.startElapsedDay, r.endElapsedDay)) || Object.values(draft.entities.opportunityRecords ?? {}).some(r => r.personId === personId && ["accepted","in_progress"].includes(r.status) && Number.isInteger(r.reportElapsedDay) && intervalsOverlap(actualStart, actualEndCandidate, r.reportElapsedDay, r.completeElapsedDay));
      if (conflict) actualStart = findOpenStart(draft, personId, actualStart, duty.durationDays);
      const key = `${duty.id}:${start}`;
      if (existingKeys.has(key)) continue;
      const id = createEntityId(draft, "schedule");
      draft.entities.scheduleRecords[id] = {
        id, schemaVersion: 1, kind: "unit_duty", dutyDefinitionId: duty.id, personId, unitId,
        sourceTemplateId: template.id, mandatory: Boolean(duty.mandatory), status: "scheduled",
        nominalStartElapsedDay: start, startElapsedDay: actualStart, endElapsedDay: actualStart + duty.durationDays - 1,
        startDate: addDaysIso(draft.world.date, actualStart - draft.world.clock.elapsedDays),
        endDate: addDaysIso(draft.world.date, actualStart + duty.durationDays - 1 - draft.world.clock.elapsedDays),
        startedDate: null, completedDate: null, outcomeEventRecordId: null
      };
      existingKeys.add(key);
    }
  }
  draft.world.scheduler = {
    ...(draft.world.scheduler ?? {}),
    scheduleTemplateId: template.id,
    scheduleOriginElapsedDay: base,
    generatedThroughElapsedDay: Math.max(generatedThrough, throughElapsedDay)
  };
}

export function ensureScheduleCoverageInDraft(draft, registries, personId, unitId, additionalDays = 70) {
  const scenarioId = draft.world?.generation?.scenarioId;
  const scenario = scenarioId && registries.careerStartScenarios.has(scenarioId) ? registries.careerStartScenarios.get(scenarioId) : null;
  const templateId = draft.world.scheduler?.scheduleTemplateId ?? scenario?.scheduleTemplateId;
  if (!templateId || !registries.scheduleTemplates.has(templateId)) return;
  const target = draft.world.clock.elapsedDays + additionalDays;
  if ((draft.world.scheduler?.generatedThroughElapsedDay ?? -1) < target) seedScheduleThrough(draft, registries, personId, unitId, templateId, target);
}

function hasQualification(draft, personId, schoolId) {
  return Object.values(draft.entities.qualificationRecords).some(record => record.personId === personId && record.schoolId === schoolId);
}

export function evaluateCareerOpportunitiesInDraft(draft, registries, personId) {
  draft.entities.opportunityRecords ??= {};
  const person = draft.entities.people[personId];
  if (!person) return [];
  const rank = registries.ranks.get(person.affiliation.rankId);
  const serviceDays = daysBetweenIso(person.career.enlistmentDate, draft.world.date);
  const created = [];
  const existingDefinitionIds = new Set(Object.values(draft.entities.opportunityRecords).filter(r => r.personId === personId).map(r => r.definitionId));
  for (const def of registries.opportunities.values()) {
    if (existingDefinitionIds.has(def.id)) continue;
    if (serviceDays < (def.minimumServiceDays ?? 0)) continue;
    if (rank.hierarchyLevel < (def.minimumRankLevel ?? 0)) continue;
    if (person.condition.health < (def.minimumHealth ?? 0)) continue;
    if (def.allowedStatuses && !def.allowedStatuses.includes(person.condition.status)) continue;
    if (def.schoolId && hasQualification(draft, personId, def.schoolId)) continue;
    const id = createEntityId(draft, "opportunity");
    draft.entities.opportunityRecords[id] = {
      id, schemaVersion: 1, definitionId: def.id, personId, status: "open",
      offeredDate: draft.world.date, offeredElapsedDay: draft.world.clock.elapsedDays,
      expiresDate: addDaysIso(draft.world.date, def.expiresAfterDays),
      expiresElapsedDay: draft.world.clock.elapsedDays + def.expiresAfterDays,
      acceptedDate: null, reportDate: null, completionDate: null, orderId: null
    };
    const noticeId = recordNotification(draft, { personId, type: "career_opportunity", title: def.title, message: def.message, priority: "high", references: { opportunityRecordId: id, opportunityDefinitionId: def.id } });
    created.push({ opportunityRecordId: id, notificationId: noticeId });
  }
  return created;
}

export function expireCareerOpportunitiesInDraft(draft, personId) {
  const expired = [];
  for (const record of Object.values(draft.entities.opportunityRecords ?? {})) {
    if (record.personId !== personId || record.status !== "open") continue;
    if (draft.world.clock.elapsedDays <= record.expiresElapsedDay) continue;
    record.status = "expired";
    expired.push(record.id);
  }
  return expired;
}


function findOpenOpportunityStart(draft, personId, requestedStart, durationDays) {
  const existing = Object.values(draft.entities.opportunityRecords ?? {}).filter(r => r.personId === personId && ["accepted","in_progress"].includes(r.status) && Number.isInteger(r.reportElapsedDay)).map(r => ({ start:r.reportElapsedDay, end:r.completeElapsedDay }));
  let start = requestedStart;
  for (let attempts = 0; attempts < 365; attempts++) {
    const end = start + durationDays - 1;
    if (!existing.some(r => intervalsOverlap(start, end, r.start, r.end))) return start;
    start += 1;
  }
  throw new Error("Unable to find a conflict-free opportunity window.");
}

function cancelScheduleConflictsForOpportunity(draft, personId, startElapsedDay, endElapsedDay, opportunityRecordId) {
  const cancelled = [];
  for (const schedule of Object.values(draft.entities.scheduleRecords ?? {})) {
    if (schedule.personId !== personId || schedule.status !== "scheduled") continue;
    if (!intervalsOverlap(schedule.startElapsedDay, schedule.endElapsedDay, startElapsedDay, endElapsedDay)) continue;
    schedule.status = "cancelled";
    schedule.cancelledDate = draft.world.date;
    schedule.cancellationReason = "career_opportunity_orders";
    schedule.replacedByOpportunityRecordId = opportunityRecordId;
    cancelled.push(schedule.id);
  }
  return cancelled;
}

export function acceptCareerOpportunityInDraft(draft, registries, opportunityRecordId) {
  const record = draft.entities.opportunityRecords?.[opportunityRecordId];
  if (!record || record.status !== "open") throw new Error("This career opportunity is no longer available.");
  if (draft.world.clock.elapsedDays > record.expiresElapsedDay) throw new Error("This career opportunity has expired.");
  const def = registries.opportunities.get(record.definitionId);
  const person = draft.entities.people[record.personId];
  const school = def.schoolId ? registries.schools.get(def.schoolId) : null;
  const durationDays = school?.durationDays ?? 1;
  const requestedReportStart = draft.world.clock.elapsedDays + (def.reportDelayDays ?? 7);
  const reportStart = findOpenOpportunityStart(draft, record.personId, requestedReportStart, durationDays);
  const completeElapsedDay = reportStart + durationDays - 1;
  const cancelledScheduleIds = cancelScheduleConflictsForOpportunity(draft, record.personId, reportStart, completeElapsedDay, record.id);
  const orderId = createEntityId(draft, "order");
  record.status = "accepted";
  record.acceptedDate = draft.world.date;
  record.reportElapsedDay = reportStart;
  record.completeElapsedDay = completeElapsedDay;
  record.reportDate = addDaysIso(draft.world.date, reportStart - draft.world.clock.elapsedDays);
  record.completionDate = addDaysIso(draft.world.date, record.completeElapsedDay - draft.world.clock.elapsedDays);
  record.orderId = orderId;
  draft.entities.orderRecords[orderId] = {
    id: orderId, schemaVersion: 2, personId: record.personId, type: "school", status: "pending",
    issueDate: draft.world.date, effectiveDate: record.reportDate, unitId: person.affiliation.unitId, billetId: person.affiliation.billetId,
    title: `${school?.name ?? def.name} Orders`, summary: `Report for ${school?.name ?? def.name} on ${record.reportDate}.`,
    references: { opportunityRecordId: record.id, schoolId: def.schoolId ?? null }
  };
  return { record, def, school, orderId, cancelledScheduleIds };
}

export function declineCareerOpportunityInDraft(draft, registries, opportunityRecordId) {
  const record = draft.entities.opportunityRecords?.[opportunityRecordId];
  if (!record || record.status !== "open") throw new Error("This career opportunity is no longer available.");
  const def = registries.opportunities.get(record.definitionId);
  record.status = "declined";
  record.declinedDate = draft.world.date;
  return { record, def };
}

export function processOpportunityLifecycleForDay(draft, registries, personId) {
  const notificationIds = [];
  for (const record of Object.values(draft.entities.opportunityRecords ?? {})) {
    if (record.personId !== personId) continue;
    const def = registries.opportunities.get(record.definitionId);
    const person = draft.entities.people[personId];
    if (record.status === "accepted" && draft.world.clock.elapsedDays >= record.reportElapsedDay) {
      record.status = "in_progress";
      person.condition.status = "training";
      const order = draft.entities.orderRecords[record.orderId]; if (order) order.status = "executing";
      notificationIds.push(recordNotification(draft, { personId, type: "school_reported", title: `${def.name} Started`, message: `Reported for ${def.name}.`, priority: "high", references: { opportunityRecordId: record.id, orderId: record.orderId } }));
    }
    if (record.status === "in_progress" && draft.world.clock.elapsedDays >= record.completeElapsedDay) {
      const completion = completeSchoolInDraft(draft, registries, personId, def.schoolId, { sourceType: "scheduled_school" });
      notificationIds.push(...completion.notificationIds);
      record.status = "completed";
      record.completedDate = draft.world.date;
      person.condition.status = "active";
      const order = draft.entities.orderRecords[record.orderId]; if (order) order.status = "completed";
    }
  }
  return notificationIds;
}

export function updateCareerObjectivesInDraft(draft, registries, personId, { promotionEligible = false } = {}) {
  const person = draft.entities.people[personId];
  if (!person) return [];
  const completed = [];
  const hasAssignment = Boolean(person.affiliation.unitId && person.affiliation.billetId);
  const hasActivity = Object.values(draft.entities.activityRecords ?? {}).some(r => r.personId === personId) || Object.values(draft.entities.scheduleRecords ?? {}).some(r => r.personId === personId && r.status === "completed");
  for (const record of Object.values(draft.entities.objectiveRecords ?? {})) {
    if (record.personId !== personId || record.status !== "active") continue;
    const def = registries.careerObjectives.get(record.definitionId);
    let done = false;
    if (def.completionRule === "has_assignment") done = hasAssignment;
    else if (def.completionRule === "has_activity") done = hasActivity;
    else if (def.completionRule === "minimum_readiness") done = person.condition.readiness >= (def.threshold ?? 0);
    else if (def.completionRule === "promotion_eligible") done = promotionEligible;
    if (!done) continue;
    record.status = "completed";
    record.completedDate = draft.world.date;
    completed.push(record.id);
  }
  return completed;
}

export function processScheduledDutyForDay(draft, registries, scheduleIds, { personId, relationshipIds = [], billetIds = [], personIds = [] } = {}) {
  const notifications = [], completedDutyIds = [], startedDutyIds = [], eventRecordIds = [];
  for (const id of scheduleIds) {
    const record = draft.entities.scheduleRecords?.[id];
    if (!record || !["scheduled","in_progress"].includes(record.status)) continue;
    const duty = registries.duties.get(record.dutyDefinitionId);
    const person = draft.entities.people[personId];
    if (record.status === "scheduled" && draft.world.clock.elapsedDays >= record.startElapsedDay) {
      record.status = "in_progress"; record.startedDate = draft.world.date; startedDutyIds.push(record.id);
      if (person.condition.status === "active") person.condition.status = duty.statusWhileActive ?? "active";
    }
    if (record.status === "in_progress" && draft.world.clock.elapsedDays >= record.endElapsedDay) {
      const unit = draft.entities.units[record.unitId];
      const trainingProfile = ensureUnitTrainingProfile(draft, record.unitId, unit?.readinessModelId);
      const before = {
        readiness: person.condition.readiness, morale: person.condition.morale, fatigue: person.condition.fatigue,
        unitReadiness: unit?.condition?.readiness ?? null, unitCohesion: unit?.condition?.cohesion ?? null, training: { ...trainingProfile.values }
      };
      applyEffects(draft, registries, { personId, unitId: record.unitId, relationshipIds, effects: duty.playerEffects ?? [] });
      applyUnitTrainingEffects(draft, record.unitId, duty.trainingEffects ?? {});
      let event = null;
      if (duty.eventTableId) event = resolveActivityEvent(draft, registries, { personId, unitId: record.unitId, relationshipIds, activityId: duty.id, eventTableId: duty.eventTableId });
      const currentPersonIds = billetIds.length ? billetIds.map(billetId => draft.entities.billets[billetId]?.assignedPersonId).filter(Boolean) : personIds;
      const readinessResult = syncUnitReadiness(draft, registries, record.unitId, { billetIds, personIds: currentPersonIds });
      const score = calculateDutyPerformanceScore(draft, person, readinessResult, trainingProfile.values);
      const rating = resolvePerformanceRating(registries, score);
      const after = {
        readiness: person.condition.readiness, morale: person.condition.morale, fatigue: person.condition.fatigue,
        unitReadiness: unit?.condition?.readiness ?? null, unitCohesion: unit?.condition?.cohesion ?? null, training: { ...trainingProfile.values }
      };
      if (event?.notificationId) notifications.push(event.notificationId);
      if (event?.eventRecordId) { eventRecordIds.push(event.eventRecordId); record.outcomeEventRecordId = event.eventRecordId; }
      record.performanceScore = score; record.performanceRating = rating.id; record.before = before; record.after = after;
      record.status = "completed"; record.completedDate = draft.world.date; completedDutyIds.push(record.id);
      const perfId = createEntityId(draft, "perf");
      draft.entities.performanceRecords[perfId] = { id:perfId, schemaVersion:2, personId, sourceType:"scheduled_duty", sourceId:record.id, gameDate:draft.world.date, rating:rating.id, score, notes:`${duty.name} completed with ${rating.label.toLowerCase()} performance.` };
      if (person.condition.status === (duty.statusWhileActive ?? "active")) person.condition.status = "active";
    }
  }
  return { notifications, completedDutyIds, startedDutyIds, eventRecordIds };
}

export function applyPassiveRecoveryForDay(draft, personId, { onDuty = false } = {}) {
  const person = draft.entities.people[personId];
  if (!person || !["active","training"].includes(person.condition.status)) return;
  if (onDuty) return;
  person.condition.fatigue = Math.max(0, person.condition.fatigue - 2);
  if (person.condition.fatigue < 35) person.condition.readiness = Math.min(100, person.condition.readiness + 1);
  if (person.condition.health < 100) person.condition.health = Math.min(100, person.condition.health + 1);
}
