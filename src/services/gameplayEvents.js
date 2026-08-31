import { randomInt } from "../core/rng.js";
import { createEntityId } from "../core/ids.js";
import { applyEffects } from "./effectEngine.js";
import { recordNotification } from "./recordServices.js";

function chooseWeighted(draft, entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomInt(draft, 1, total);
  for (const entry of entries) { roll -= entry.weight; if (roll <= 0) return entry; }
  return entries.at(-1);
}

export function resolveActivityEvent(draft, registries, { personId, unitId, relationshipIds = null, activityId, eventTableId, performanceScore = null }) {
  if (!eventTableId) return null;
  const table = registries.eventTables.get(eventTableId);
  const eligibleEntries = table.entries.filter(entry => {
    if (!entry.eventId) return true;
    const event = registries.gameplayEvents.get(entry.eventId);
    if (Number.isFinite(event.minimumPerformanceScore) && Number.isFinite(performanceScore) && performanceScore < event.minimumPerformanceScore) return false;
    if (Number.isFinite(event.maximumPerformanceScore) && Number.isFinite(performanceScore) && performanceScore > event.maximumPerformanceScore) return false;
    return true;
  });
  const selected = chooseWeighted(draft, eligibleEntries.length ? eligibleEntries : [{ eventId: null, weight: 1 }]);
  if (!selected.eventId) return null;
  const def = registries.gameplayEvents.get(selected.eventId);
  const isDecision = Array.isArray(def.choices) && def.choices.length > 0;
  let targetRelationshipId = null, targetPersonId = null;
  if (isDecision && def.relationshipTargetMode === "one_unit_relationship") {
    const candidates = (relationshipIds ?? []).map(id => draft.entities.relationshipRecords?.[id]).filter(record => {
      if (!record || (record.personAId !== personId && record.personBId !== personId)) return false;
      const otherId = record.personAId === personId ? record.personBId : record.personAId;
      return !unitId || draft.entities.people?.[otherId]?.affiliation?.unitId === unitId;
    }).sort((a,b) => a.id.localeCompare(b.id));
    if (candidates.length) {
      const chosen = candidates[randomInt(draft, 0, candidates.length - 1)];
      targetRelationshipId = chosen.id;
      targetPersonId = chosen.personAId === personId ? chosen.personBId : chosen.personAId;
    }
  }
  if (!isDecision) applyEffects(draft, registries, { personId, unitId, relationshipIds, effects: def.effects });
  const id = createEntityId(draft, "gameevt");
  draft.entities.gameplayEventRecords[id] = { id, schemaVersion: 3, definitionId: def.id, personId, unitId, activityId, gameDate: draft.world.date, elapsedDays: draft.world.clock.elapsedDays, status: isDecision ? "pending" : "resolved", selectedChoiceId: null, resolvedDate: isDecision ? null : draft.world.date, expiresElapsedDay: isDecision && Number.isFinite(def.decisionDeadlineDays) ? draft.world.clock.elapsedDays + def.decisionDeadlineDays : null, targetRelationshipId, targetPersonId };
  const noticeId = recordNotification(draft, { personId, type: isDecision ? "decision_required" : "gameplay_event", title: def.title, message: def.message, priority: def.priority, references: { eventRecordId: id, activityId } });
  return { eventRecordId: id, notificationId: noticeId, definitionId: def.id, pendingDecision: isDecision };
}


export function resolveExpiredGameplayDecisionsInDraft(draft, registries, personId) {
  const resolved = [], notificationIds = [];
  for (const record of Object.values(draft.entities.gameplayEventRecords ?? {})) {
    if (record.personId !== personId || record.status !== "pending" || !Number.isInteger(record.expiresElapsedDay)) continue;
    if (draft.world.clock.elapsedDays < record.expiresElapsedDay) continue;
    const def = registries.gameplayEvents.get(record.definitionId);
    const choiceId = def.defaultChoiceId ?? def.choices?.[0]?.id;
    if (!choiceId) continue;
    const choice = (def.choices ?? []).find(item => item.id === choiceId);
    if (!choice) continue;
    let deadlineRelationshipIds = record.targetRelationshipId ? [record.targetRelationshipId] : null;
    if (!deadlineRelationshipIds && def.relationshipTargetMode === "one_unit_relationship") {
      const fallback = Object.values(draft.entities.relationshipRecords ?? {}).filter(rel => rel.personAId === personId || rel.personBId === personId).filter(rel => { const otherId=rel.personAId===personId?rel.personBId:rel.personAId; return !record.unitId || draft.entities.people?.[otherId]?.affiliation?.unitId===record.unitId; }).sort((a,b)=>a.id.localeCompare(b.id))[0] ?? null;
      if (fallback) { record.targetRelationshipId=fallback.id; record.targetPersonId=fallback.personAId===personId?fallback.personBId:fallback.personAId; deadlineRelationshipIds=[fallback.id]; }
    }
    applyEffects(draft, registries, { personId, unitId: record.unitId, relationshipIds: deadlineRelationshipIds, effects: choice.effects ?? [] });
    record.status = "resolved";
    record.selectedChoiceId = choice.id;
    record.resolvedDate = draft.world.date;
    record.resolutionSource = "deadline_default";
    resolved.push(record.id);
    notificationIds.push(recordNotification(draft, { personId, type:"decision_deadline", title:`${def.title} — Deadline`, message:`No response was entered before the deadline. Default action: ${choice.label}.`, priority:"normal", references:{ eventRecordId:record.id, choiceId:choice.id } }));
  }
  return { resolved, notificationIds };
}

export function resolveGameplayEventChoice(draft, registries, { personId, eventRecordId, choiceId, relationshipIds = null }) {
  const record = draft.entities.gameplayEventRecords[eventRecordId];
  if (!record || record.personId !== personId) throw new Error("Decision event not found.");
  if (record.status !== "pending") throw new Error("This decision has already been resolved.");
  const def = registries.gameplayEvents.get(record.definitionId);
  const choice = (def.choices ?? []).find(item => item.id === choiceId);
  if (!choice) throw new Error("Decision choice not found.");
  const person = draft.entities.people[personId];
  const profile = draft.entities.skillProfiles?.[`skills_${personId}`] ?? Object.values(draft.entities.skillProfiles ?? {}).find(item => item.personId === personId);
  let targetRelationship = record.targetRelationshipId ? draft.entities.relationshipRecords?.[record.targetRelationshipId] : null;
  if (!targetRelationship && def.relationshipTargetMode === "one_unit_relationship") {
    const candidateIds = relationshipIds ?? Object.values(draft.entities.relationshipRecords ?? {}).filter(rel => rel.personAId === personId || rel.personBId === personId).map(rel => rel.id);
    targetRelationship = candidateIds.map(id=>draft.entities.relationshipRecords?.[id]).filter(Boolean).filter(rel=>{const otherId=rel.personAId===personId?rel.personBId:rel.personAId;return !record.unitId || draft.entities.people?.[otherId]?.affiliation?.unitId===record.unitId;}).sort((a,b)=>a.id.localeCompare(b.id))[0] ?? null;
    if (targetRelationship) { record.targetRelationshipId=targetRelationship.id; record.targetPersonId=targetRelationship.personAId===personId?targetRelationship.personBId:targetRelationship.personAId; }
  }
  const targetPerson = record.targetPersonId ? draft.entities.people?.[record.targetPersonId] : null;
  const before = {
    experience: person?.career?.experience ?? null, prestige: person?.career?.prestige ?? null, morale: person?.condition?.morale ?? null,
    skills: { ...(profile?.values ?? {}) }, trust: targetRelationship?.trust ?? null, familiarity: targetRelationship?.familiarity ?? null, respect: targetRelationship?.respect ?? null, bond: targetRelationship?.bond ?? null
  };
  const scopedRelationshipIds = targetRelationship ? [targetRelationship.id] : relationshipIds;
  applyEffects(draft, registries, { personId, unitId: record.unitId, relationshipIds: scopedRelationshipIds, effects: choice.effects ?? [] });
  const afterProfile = draft.entities.skillProfiles?.[`skills_${personId}`] ?? profile;
  const afterRelationship = record.targetRelationshipId ? draft.entities.relationshipRecords?.[record.targetRelationshipId] : null;
  const afterPerson = draft.entities.people[personId];
  const changes = [];
  const pushChange = (label, prior, next) => { if (prior == null || next == null || prior === next) return; changes.push({ label, before: prior, after: next, delta: next - prior }); };
  pushChange("Experience", before.experience, afterPerson?.career?.experience);
  pushChange("Prestige", before.prestige, afterPerson?.career?.prestige);
  pushChange("Morale", before.morale, afterPerson?.condition?.morale);
  for (const [skillId, prior] of Object.entries(before.skills)) pushChange(registries.skills.has(skillId) ? registries.skills.get(skillId).name : skillId, prior, afterProfile?.values?.[skillId]);
  pushChange(targetPerson ? `Trust with ${targetPerson.identity.displayName}` : "Trust", before.trust, afterRelationship?.trust);
  pushChange(targetPerson ? `Familiarity with ${targetPerson.identity.displayName}` : "Familiarity", before.familiarity, afterRelationship?.familiarity);
  pushChange(targetPerson ? `Respect with ${targetPerson.identity.displayName}` : "Respect", before.respect, afterRelationship?.respect);
  pushChange(targetPerson ? `Bond with ${targetPerson.identity.displayName}` : "Bond", before.bond, afterRelationship?.bond);
  record.status = "resolved";
  record.selectedChoiceId = choice.id;
  record.resolvedDate = draft.world.date;
  return { record, def, choice, targetPersonId: record.targetPersonId ?? null, targetPersonName: targetPerson?.identity?.displayName ?? null, changes };
}
