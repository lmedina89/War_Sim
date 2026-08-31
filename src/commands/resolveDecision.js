import { commandResult } from "../core/commandResult.js";
import { resolveGameplayEventChoice } from "../services/gameplayEvents.js";
import { recordAction, recordNotification } from "../services/recordServices.js";
import { recordRelationshipMemory } from "../services/livingCareer.js";

export function resolveDecision(store, registries, personId, eventRecordId, choiceId) {
  const relationshipIds = [...(store.getIndexes().relationshipsByPersonId?.get(personId) ?? [])];
  let result, noticeId;
  store.mutate(draft => {
    result = resolveGameplayEventChoice(draft, registries, { personId, eventRecordId, choiceId, relationshipIds });
    const targetText = result.targetPersonName ? ` · ${result.targetPersonName}` : "";
    const changeText = (result.changes ?? []).map(change => `${change.label} ${change.delta > 0 ? "+" : ""}${change.delta}`).join(" · ");
    noticeId = recordNotification(draft, { personId, type: "decision_resolved", title: result.def.title, message: `${result.choice.label}${targetText}.${changeText ? ` ${changeText}.` : ""}`, priority: "normal", references: { eventRecordId, choiceId, targetPersonId: result.targetPersonId ?? null } });
    if(result.targetPersonId){
      const trust=(result.changes??[]).find(change=>change.label.startsWith("Trust"))?.delta??0;
      const respect=(result.changes??[]).find(change=>change.label.startsWith("Respect"))?.delta??0;
      const rapport=(result.changes??[]).find(change=>change.label.startsWith("Rapport"))?.delta??0;
      recordRelationshipMemory(draft,{personId,otherPersonId:result.targetPersonId,type:"decision_interaction",summary:`${result.def.title}: ${result.choice.label}.`,sourceId:eventRecordId,trustDelta:trust,respectDelta:respect,rapportDelta:rapport});
    }
    recordAction(draft, { actorPersonId: personId, commandType: "resolve_decision", payload: { eventRecordId, choiceId }, resultCode: "decision_resolved" });
  }, ["people","history","notifications","actions","activities"]);
  return commandResult({ code: "decision_resolved", message: result.targetPersonName ? `${result.choice.label}: ${result.targetPersonName}` : result.choice.label, data: { eventRecordId, choiceId, title: result.def.title, choiceLabel: result.choice.label, targetPersonId: result.targetPersonId ?? null, targetPersonName: result.targetPersonName ?? null, changes: result.changes ?? [] }, notifications: [noticeId] });
}
