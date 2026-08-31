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

export function resolveActivityEvent(draft, registries, { personId, unitId, relationshipIds = null, activityId, eventTableId }) {
  if (!eventTableId) return null;
  const table = registries.eventTables.get(eventTableId);
  const selected = chooseWeighted(draft, table.entries);
  if (!selected.eventId) return null;
  const def = registries.gameplayEvents.get(selected.eventId);
  const isDecision = Array.isArray(def.choices) && def.choices.length > 0;
  if (!isDecision) applyEffects(draft, registries, { personId, unitId, relationshipIds, effects: def.effects });
  const id = createEntityId(draft, "gameevt");
  draft.entities.gameplayEventRecords[id] = { id, schemaVersion: 2, definitionId: def.id, personId, unitId, activityId, gameDate: draft.world.date, elapsedDays: draft.world.clock.elapsedDays, status: isDecision ? "pending" : "resolved", selectedChoiceId: null, resolvedDate: isDecision ? null : draft.world.date, expiresElapsedDay: isDecision && Number.isFinite(def.decisionDeadlineDays) ? draft.world.clock.elapsedDays + def.decisionDeadlineDays : null };
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
    applyEffects(draft, registries, { personId, unitId: record.unitId, relationshipIds: null, effects: choice.effects ?? [] });
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
  applyEffects(draft, registries, { personId, unitId: record.unitId, relationshipIds, effects: choice.effects ?? [] });
  record.status = "resolved";
  record.selectedChoiceId = choice.id;
  record.resolvedDate = draft.world.date;
  return { record, def, choice };
}
