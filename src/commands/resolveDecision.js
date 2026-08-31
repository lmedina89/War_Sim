import { commandResult } from "../core/commandResult.js";
import { resolveGameplayEventChoice } from "../services/gameplayEvents.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function resolveDecision(store, registries, personId, eventRecordId, choiceId) {
  const relationshipIds = [...(store.getIndexes().relationshipsByPersonId?.get(personId) ?? [])];
  let result, noticeId;
  store.mutate(draft => {
    result = resolveGameplayEventChoice(draft, registries, { personId, eventRecordId, choiceId, relationshipIds });
    noticeId = recordNotification(draft, { personId, type: "decision_resolved", title: result.def.title, message: `Decision: ${result.choice.label}.`, priority: "normal", references: { eventRecordId, choiceId } });
    recordAction(draft, { actorPersonId: personId, commandType: "resolve_decision", payload: { eventRecordId, choiceId }, resultCode: "decision_resolved" });
  }, ["people","history","notifications","actions","activities"]);
  return commandResult({ code: "decision_resolved", message: result.choice.label, data: { eventRecordId, choiceId }, notifications: [noticeId] });
}
