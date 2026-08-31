import { commandResult } from "../core/commandResult.js";
import { resolveGameplayEventChoice } from "../services/gameplayEvents.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function resolveDecision(store, registries, personId, eventRecordId, choiceId) {
  const relationshipIds = [...(store.getIndexes().relationshipsByPersonId?.get(personId) ?? [])];
  let result, noticeId;
  store.mutate(draft => {
    result = resolveGameplayEventChoice(draft, registries, { personId, eventRecordId, choiceId, relationshipIds });
    const targetText = result.targetPersonName ? ` · ${result.targetPersonName}` : "";
    const changeText = (result.changes ?? []).map(change => `${change.label} ${change.delta > 0 ? "+" : ""}${change.delta}`).join(" · ");
    noticeId = recordNotification(draft, { personId, type: "decision_resolved", title: result.def.title, message: `${result.choice.label}${targetText}.${changeText ? ` ${changeText}.` : ""}`, priority: "normal", references: { eventRecordId, choiceId, targetPersonId: result.targetPersonId ?? null } });
    recordAction(draft, { actorPersonId: personId, commandType: "resolve_decision", payload: { eventRecordId, choiceId }, resultCode: "decision_resolved" });
  }, ["people","history","notifications","actions","activities"]);
  return commandResult({ code: "decision_resolved", message: result.targetPersonName ? `${result.choice.label}: ${result.targetPersonName}` : result.choice.label, data: { eventRecordId, choiceId, title: result.def.title, choiceLabel: result.choice.label, targetPersonId: result.targetPersonId ?? null, targetPersonName: result.targetPersonName ?? null, changes: result.changes ?? [] }, notifications: [noticeId] });
}
