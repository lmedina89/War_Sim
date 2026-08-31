import { createEntityId } from "../core/ids.js";
import { addDaysIso, daysBetweenIso } from "./dateMath.js";
import { applyEffects } from "./effectEngine.js";
import { applyUnitTrainingEffects, syncUnitReadiness, ensureUnitTrainingProfile } from "./unitReadiness.js";
import { resolveActivityEvent } from "./gameplayEvents.js";
import { completeSchoolInDraft } from "./schoolCompletion.js";
import { recordNotification } from "./recordServices.js";
import { calculateDutyPerformanceScore, resolvePerformanceRating } from "./performance.js";
import { applyNpcParticipationForDuty, recordUnitEvent, recordReadinessSnapshot, recordDutyQualification } from "./livingUnit.js";

function intervalsOverlap(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && bStart <= aEnd; }

function findOpenStart(draft, personId, requestedStart, durationDays) {
  const existing=Object.values(draft.entities.scheduleRecords ?? {}).filter(r=>r.personId===personId && ["scheduled","in_progress"].includes(r.status)).map(r=>({start:r.startElapsedDay,end:r.endElapsedDay}));
  for(const opportunity of Object.values(draft.entities.opportunityRecords ?? {})) if(opportunity.personId===personId && ["accepted","in_progress"].includes(opportunity.status) && Number.isInteger(opportunity.reportElapsedDay)) existing.push({start:opportunity.reportElapsedDay,end:opportunity.completeElapsedDay});
  for(let start=requestedStart,attempts=0;attempts<180;attempts++,start++) { const end=start+durationDays-1; if(!existing.some(r=>intervalsOverlap(start,end,r.start,r.end))) return start; }
  throw new Error("Unable to find a conflict-free schedule window.");
}

function weekdayForElapsedDay(draft, elapsedDay) {
  const iso=addDaysIso(draft.world.date,elapsedDay-draft.world.clock.elapsedDays);
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}
function alignToPreferredWeekday(draft,start,preferredWeekdays){
  if(!Array.isArray(preferredWeekdays)||!preferredWeekdays.length) return start;
  for(let offset=0;offset<7;offset++) if(preferredWeekdays.includes(weekdayForElapsedDay(draft,start+offset))) return start+offset;
  return start;
}
function activeTrainingPhase(draft,registries){
  const scenarioId=draft.world?.generation?.scenarioId;
  const scenario=scenarioId&&registries.careerStartScenarios.has(scenarioId)?registries.careerStartScenarios.get(scenarioId):null;
  const id=draft.world.scheduler?.trainingPhaseId??scenario?.trainingPhaseId??"training_phase_garrison";
  return registries.trainingPhases.has(id)?registries.trainingPhases.get(id):registries.trainingPhases.get("training_phase_garrison");
}
export function resolveTrainingPhase(draft,registries){return activeTrainingPhase(draft,registries);}

function unitNeedValue(draft,unitId,component){
  const profile=ensureUnitTrainingProfile(draft,unitId,draft.entities.units[unitId]?.readinessModelId);
  if(component==="fatigue"){
    const people=Object.values(draft.entities.people??{}).filter(p=>p.affiliation?.unitId===unitId&&["active","training"].includes(p.condition?.status));
    const avg=people.length?people.reduce((sum,p)=>sum+(p.condition.fatigue??0),0)/people.length:0;
    return Math.max(0,Math.min(100,Math.round(100-avg)));
  }
  return Number(profile.values?.[component]??0);
}
function entryNeeded(draft,unitId,entry,nominalElapsedDay){
  const needComponent=entry.needComponent ?? entry.need?.component;
  const needBelow=entry.needBelow ?? entry.need?.below;
  if(needComponent && Number.isFinite(needBelow) && unitNeedValue(draft,unitId,needComponent)>=needBelow) return false;
  if(Number.isInteger(entry.qualificationDueWithinDays)){
    const dutyId=entry.dutyDefinitionId;
    const records=Object.values(draft.entities.qualificationRecords ?? {}).filter(r=>r.personId===draft.playerPersonId && r.sourceId===dutyId && Number.isInteger(r.expiresElapsedDay)).sort((a,b)=>b.expiresElapsedDay-a.expiresElapsedDay);
    if(records[0] && records[0].expiresElapsedDay-nominalElapsedDay>entry.qualificationDueWithinDays) return false;
  }
  return true;
}
function alignEntryStart(draft,nominal,entry,duty){
  if(entry.allowWeekend) return nominal;
  if(entry.weekdayOnly){for(let offset=0;offset<7;offset++){const day=nominal+offset,w=weekdayForElapsedDay(draft,day);if(w>=1&&w<=5)return day;}}
  return alignToPreferredWeekday(draft,nominal,duty.preferredWeekdays);
}
function findOpenStartForEntry(draft,personId,requestedStart,durationDays,entry,duty){
  for(let offset=0;offset<180;offset++){
    const candidate=alignEntryStart(draft,requestedStart+offset,entry,duty);
    if(candidate<draft.world.clock.elapsedDays) continue;
    const open=findOpenStart(draft,personId,candidate,durationDays);
    if(open!==candidate) continue;
    return candidate;
  }
  throw new Error("Unable to find a conflict-free schedule window that satisfies calendar constraints.");
}

export function setTrainingPhaseInDraft(draft,registries,trainingPhaseId,{clearFutureTemplateRecords=true}={}){
  const phase=registries.trainingPhases.get(trainingPhaseId); draft.world.scheduler??={};
  if(clearFutureTemplateRecords) for(const record of Object.values(draft.entities.scheduleRecords??{})) if(record.status==="scheduled"&&record.sourceType==="template"&&record.startElapsedDay>draft.world.clock.elapsedDays){record.status="cancelled";record.cancelledDate=draft.world.date;record.cancellationReason="training_phase_changed";}
  draft.world.scheduler={...draft.world.scheduler,trainingPhaseId:phase.id,scheduleTemplateId:phase.scheduleTemplateId,scheduleOriginElapsedDay:draft.world.clock.elapsedDays,generatedThroughElapsedDay:draft.world.clock.elapsedDays,planningHorizonDays:phase.planningHorizonDays};
  return phase;
}

export function seedCareerGameplayRecords(draft,registries,personId,unitId){
  draft.entities.scheduleRecords??={}; draft.entities.opportunityRecords??={}; draft.entities.objectiveRecords??={};
  const phase=activeTrainingPhase(draft,registries); const template=registries.scheduleTemplates.get(phase.scheduleTemplateId);
  draft.world.scheduler={...(draft.world.scheduler??{}),trainingPhaseId:phase.id,scheduleTemplateId:template.id,scheduleOriginElapsedDay:draft.world.clock.elapsedDays,generatedThroughElapsedDay:draft.world.clock.elapsedDays,planningHorizonDays:phase.planningHorizonDays};
  seedScheduleThrough(draft,registries,personId,unitId,template.id,draft.world.clock.elapsedDays+phase.planningHorizonDays);
  if(!Object.values(draft.entities.objectiveRecords).some(r=>r.personId===personId)) {
    for(const objective of registries.careerObjectives.values().filter(def=>def.phase === "onboarding")) {
      const id=createEntityId(draft,"objective");
      draft.entities.objectiveRecords[id]={id,schemaVersion:2,definitionId:objective.id,personId,status:"active",startedDate:draft.world.date,completedDate:null,groupId:objective.groupId ?? null};
    }
  }
  updateCareerObjectivesInDraft(draft,registries,personId);
}

export function scheduleAdditionalDutyInDraft(draft,registries,{personId,unitId,dutyDefinitionId,requestedStartElapsedDay=null,sourceTemplateId=null}={}){
  draft.entities.scheduleRecords??={}; const duty=registries.duties.get(dutyDefinitionId); if(!duty)throw new Error(`Unknown duty definition ${dutyDefinitionId}.`); if(!draft.entities.people[personId])throw new Error(`Unknown person ${personId}.`); if(!unitId||!draft.entities.units[unitId])throw new Error(`Unknown unit ${unitId}.`);
  const requested=Number.isInteger(requestedStartElapsedDay)?requestedStartElapsedDay:draft.world.clock.elapsedDays+1; const aligned=alignToPreferredWeekday(draft,requested,duty.preferredWeekdays); const actualStart=findOpenStart(draft,personId,aligned,duty.durationDays); const id=createEntityId(draft,"schedule");
  const templateId=sourceTemplateId??draft.world.scheduler?.scheduleTemplateId??registries.scheduleTemplates.values()[0]?.id;
  draft.entities.scheduleRecords[id]={id,schemaVersion:2,kind:"unit_duty",dutyDefinitionId:duty.id,personId,unitId,sourceTemplateId:templateId,sourceType:sourceTemplateId?"template":"command",trainingPhaseId:draft.world.scheduler?.trainingPhaseId??null,mandatory:Boolean(duty.mandatory),significance:duty.significance??(duty.defaultVisibility==="significant"?"major":"routine"),calendarVisibility:duty.calendarVisibility??duty.defaultVisibility??"visible",priority:duty.priority??50,planningStatus:"firm",status:"scheduled",nominalStartElapsedDay:requested,startElapsedDay:actualStart,endElapsedDay:actualStart+duty.durationDays-1,startDate:addDaysIso(draft.world.date,actualStart-draft.world.clock.elapsedDays),endDate:addDaysIso(draft.world.date,actualStart+duty.durationDays-1-draft.world.clock.elapsedDays),startedDate:null,completedDate:null,outcomeEventRecordId:null};
  return draft.entities.scheduleRecords[id];
}

export function seedScheduleThrough(draft,registries,personId,unitId,templateId,throughElapsedDay){
  const template=registries.scheduleTemplates.get(templateId),phase=activeTrainingPhase(draft,registries); draft.entities.scheduleRecords??={};
  const existingKeys=new Set(Object.values(draft.entities.scheduleRecords).filter(r=>r.personId===personId&&r.sourceTemplateId===templateId&&r.status!=="cancelled").map(r=>`${r.dutyDefinitionId}:${r.nominalStartElapsedDay??r.startElapsedDay}`));
  const generatedThrough=Math.max(draft.world.scheduler?.generatedThroughElapsedDay??0,draft.world.clock.elapsedDays),base=draft.world.scheduler?.scheduleOriginElapsedDay??draft.world.clock.elapsedDays,candidates=[];
  for(const entry of template.entries){const duty=registries.duties.get(entry.dutyDefinitionId);for(let nominal=base+entry.offsetDays;nominal<=throughElapsedDay;nominal+=entry.repeatEveryDays){if(nominal<=draft.world.clock.elapsedDays||existingKeys.has(`${duty.id}:${nominal}`)||!entryNeeded(draft,unitId,entry,nominal))continue;candidates.push({entry,duty,nominal});}}
  candidates.sort((a,b)=>a.nominal-b.nominal||(b.duty.priority??50)-(a.duty.priority??50)||a.duty.id.localeCompare(b.duty.id));
  for(const {entry,duty,nominal} of candidates){const key=`${duty.id}:${nominal}`;if(existingKeys.has(key))continue;let requested=alignEntryStart(draft,nominal,entry,duty);let actualStart=findOpenStartForEntry(draft,personId,requested,duty.durationDays,entry,duty);const id=createEntityId(draft,"schedule"),firmWindow=phase.firmWindowDays??21;
    draft.entities.scheduleRecords[id]={id,schemaVersion:2,kind:"unit_duty",dutyDefinitionId:duty.id,personId,unitId,sourceTemplateId:template.id,sourceType:"template",trainingPhaseId:phase.id,mandatory:Boolean(duty.mandatory),significance:duty.significance??((entry?.visibility??duty.defaultVisibility)==="significant"?"major":"routine"),calendarVisibility:entry.visibility??(entry.background?"background":(duty.calendarVisibility??duty.defaultVisibility??"visible")),priority:duty.priority??50,planningStatus:actualStart-draft.world.clock.elapsedDays<=firmWindow?"firm":"tentative",status:"scheduled",nominalStartElapsedDay:nominal,startElapsedDay:actualStart,endElapsedDay:actualStart+duty.durationDays-1,startDate:addDaysIso(draft.world.date,actualStart-draft.world.clock.elapsedDays),endDate:addDaysIso(draft.world.date,actualStart+duty.durationDays-1-draft.world.clock.elapsedDays),startedDate:null,completedDate:null,outcomeEventRecordId:null}; existingKeys.add(key);}
  draft.world.scheduler={...(draft.world.scheduler??{}),trainingPhaseId:phase.id,scheduleTemplateId:template.id,scheduleOriginElapsedDay:base,generatedThroughElapsedDay:Math.max(generatedThrough,throughElapsedDay),planningHorizonDays:phase.planningHorizonDays};
}

export function ensureScheduleCoverageInDraft(draft,registries,personId,unitId,additionalDays=null){
  const phase=activeTrainingPhase(draft,registries),templateId=phase.scheduleTemplateId;if(!registries.scheduleTemplates.has(templateId))return;const horizon=Math.max(14,Number.isInteger(additionalDays)?Math.min(additionalDays,phase.planningHorizonDays):phase.planningHorizonDays),target=draft.world.clock.elapsedDays+horizon;
  if((draft.world.scheduler?.generatedThroughElapsedDay??-1)<target||draft.world.scheduler?.scheduleTemplateId!==templateId){if(draft.world.scheduler?.scheduleTemplateId!==templateId)draft.world.scheduler={...(draft.world.scheduler??{}),trainingPhaseId:phase.id,scheduleTemplateId:templateId,scheduleOriginElapsedDay:draft.world.clock.elapsedDays,generatedThroughElapsedDay:draft.world.clock.elapsedDays};seedScheduleThrough(draft,registries,personId,unitId,templateId,target);}
  const firm=phase.firmWindowDays??21;for(const r of Object.values(draft.entities.scheduleRecords??{}))if(r.personId===personId&&r.status==="scheduled")r.planningStatus=r.startElapsedDay-draft.world.clock.elapsedDays<=firm?"firm":"tentative";
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

function objectiveRecordDefinition(registries, record) {
  return record?.definitionId && registries.careerObjectives.has(record.definitionId) ? registries.careerObjectives.get(record.definitionId) : null;
}

function latestObjectiveRecord(draft, personId, definitionId) {
  return Object.values(draft.entities.objectiveRecords ?? {})
    .filter(record => record.personId === personId && record.definitionId === definitionId)
    .sort((a,b) => String(b.completedDate ?? b.startedDate ?? "").localeCompare(String(a.completedDate ?? a.startedDate ?? "")) || b.id.localeCompare(a.id))[0] ?? null;
}

function onboardingComplete(draft, registries, personId) {
  const onboardingDefs = registries.careerObjectives.values().filter(def => def.phase === "onboarding");
  if (!onboardingDefs.length) return true;
  return onboardingDefs.every(def => Object.values(draft.entities.objectiveRecords ?? {}).some(record => record.personId === personId && record.definitionId === def.id && record.status === "completed"));
}

function qualificationState(draft, personId, qualificationId) {
  return Object.values(draft.entities.qualificationRecords ?? {})
    .filter(record => record.personId === personId && record.qualificationId === qualificationId)
    .sort((a,b) => (b.expiresElapsedDay ?? -1) - (a.expiresElapsedDay ?? -1) || String(b.completedDate ?? "").localeCompare(String(a.completedDate ?? "")))[0] ?? null;
}

function openOpportunityExists(draft, personId) {
  return Object.values(draft.entities.opportunityRecords ?? {}).some(record => record.personId === personId && record.status === "open");
}

function objectiveActivationSatisfied(draft, registries, personId, def, { promotionEligible = null } = {}) {
  const person=draft.entities.people[personId]; if(!person) return false;
  if(def.activationRule === "readiness_below") return person.condition.readiness < (def.activationThreshold ?? 0);
  if(def.activationRule === "unit_readiness_below_phase_target") {
    const unit=person.affiliation?.unitId ? draft.entities.units[person.affiliation.unitId] : null;
    const phase=activeTrainingPhase(draft,registries);
    return Boolean(unit && Number(unit.condition?.readiness ?? 0) < Number(phase?.readinessTarget ?? 0));
  }
  if(def.activationRule === "qualification_missing_or_due") {
    const record=qualificationState(draft,personId,def.qualificationId);
    return !record || !Number.isInteger(record.expiresElapsedDay) || record.expiresElapsedDay - draft.world.clock.elapsedDays <= (def.dueWithinDays ?? 0);
  }
  if(def.activationRule === "promotion_not_eligible") {
    if (promotionEligible !== false) return false;
    const currentRank=registries.ranks.get(person.affiliation.rankId);
    const hasNextRank=registries.ranks.values().some(rank=>rank.branchId===currentRank.branchId&&rank.category===currentRank.category&&rank.hierarchyLevel===currentRank.hierarchyLevel+1);
    return hasNextRank;
  }
  if(def.activationRule === "open_opportunity") return openOpportunityExists(draft,personId);
  return false;
}

function objectiveCompletionSatisfied(draft, registries, personId, def, { promotionEligible = null } = {}) {
  const person=draft.entities.people[personId]; if(!person) return false;
  const hasAssignment=Boolean(person.affiliation.unitId && person.affiliation.billetId);
  const hasActivity=Object.values(draft.entities.activityRecords ?? {}).some(r=>r.personId===personId) || Object.values(draft.entities.scheduleRecords ?? {}).some(r=>r.personId===personId && r.status === "completed");
  if(def.completionRule === "has_assignment") return hasAssignment;
  if(def.completionRule === "has_activity") return hasActivity;
  if(def.completionRule === "minimum_readiness") return person.condition.readiness >= (def.threshold ?? 0);
  if(def.completionRule === "promotion_eligible") return promotionEligible === true;
  if(def.completionRule === "unit_readiness_at_phase_target") {
    const unit=person.affiliation?.unitId ? draft.entities.units[person.affiliation.unitId] : null;
    const phase=activeTrainingPhase(draft,registries);
    return Boolean(unit && Number(unit.condition?.readiness ?? 0) >= Number(phase?.readinessTarget ?? 0));
  }
  if(def.completionRule === "qualification_current") {
    const record=qualificationState(draft,personId,def.qualificationId);
    return Boolean(record && Number.isInteger(record.expiresElapsedDay) && record.expiresElapsedDay - draft.world.clock.elapsedDays > (def.dueWithinDays ?? 0));
  }
  if(def.completionRule === "no_open_opportunity") return !openOpportunityExists(draft,personId);
  return false;
}

function canReactivateObjective(draft, personId, def) {
  if (!def.repeatable) return !latestObjectiveRecord(draft,personId,def.id);
  const latest=latestObjectiveRecord(draft,personId,def.id);
  if (!latest || latest.status === "failed") return true;
  if (latest.status === "active") return false;
  if (!latest.completedDate || !Number.isFinite(def.cooldownDays) || def.cooldownDays <= 0) return true;
  return daysBetweenIso(latest.completedDate,draft.world.date) >= def.cooldownDays;
}

function generateContinuityObjectivesInDraft(draft, registries, personId, context) {
  if (!onboardingComplete(draft,registries,personId)) return [];
  const created=[];
  for(const def of registries.careerObjectives.values().filter(item=>item.phase === "continuity").sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id))) {
    if (!canReactivateObjective(draft,personId,def)) continue;
    if (!objectiveActivationSatisfied(draft,registries,personId,def,context)) continue;
    const id=createEntityId(draft,"objective");
    draft.entities.objectiveRecords[id]={id,schemaVersion:2,definitionId:def.id,personId,status:"active",startedDate:draft.world.date,completedDate:null,groupId:def.groupId ?? null};
    created.push(id);
  }
  return created;
}

export function updateCareerObjectivesInDraft(draft, registries, personId, { promotionEligible = null } = {}) {
  const person = draft.entities.people[personId];
  if (!person) return [];
  draft.entities.objectiveRecords ??= {};
  const completed=[];
  const context={promotionEligible};
  for (const record of Object.values(draft.entities.objectiveRecords)) {
    if (record.personId !== personId || record.status !== "active") continue;
    const def=objectiveRecordDefinition(registries,record); if(!def) continue;
    if (!objectiveCompletionSatisfied(draft,registries,personId,def,context)) continue;
    record.status="completed"; record.completedDate=draft.world.date; record.schemaVersion=Math.max(2,record.schemaVersion??1); record.groupId??=def.groupId??null;
    completed.push(record.id);
  }
  const created=generateContinuityObjectivesInDraft(draft,registries,personId,context);
  return [...completed,...created];
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
      const qualificationResult = duty.qualificationId ? recordDutyQualification(draft,registries,personId,duty,score) : null;
      if (qualificationResult) record.qualificationResult = qualificationResult.result;
      record.status = "completed"; record.completedDate = draft.world.date; completedDutyIds.push(record.id);
      const perfId = createEntityId(draft, "perf");
      draft.entities.performanceRecords[perfId] = { id:perfId, schemaVersion:2, personId, unitId:record.unitId, sourceType:"scheduled_duty", sourceId:record.id, gameDate:draft.world.date, rating:rating.id, score, notes:`${duty.name} completed with ${rating.label.toLowerCase()} performance.` };
      const npcResult=applyNpcParticipationForDuty(draft,registries,{unitId:record.unitId,duty,playerPersonId:personId,performanceScore:score,participantPersonIds:currentPersonIds});
      record.participantPersonIds=[personId,...npcResult.participantIds];
      if (record.calendarVisibility !== "background") recordUnitEvent(draft,{unitId:record.unitId,type:"training_completed",title:`${duty.name} completed`,summary:`${record.participantPersonIds.length} personnel participated · ${rating.label} ${score}/100.`,personId,sourceType:"schedule",sourceId:record.id,importance:record.significance === "major" ? "significant" : "routine"});
      recordReadinessSnapshot(draft,record.unitId,readinessResult,{force:duty.id === "duty_field_exercise"});
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
