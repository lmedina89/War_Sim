import { commandResult } from "../core/commandResult.js";
import { acceptCareerOpportunityInDraft, declineCareerOpportunityInDraft, updateCareerObjectivesInDraft } from "../services/careerGameplay.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function acceptCareerOpportunity(store, registries, opportunityRecordId) {
  let result, noticeId;
  store.mutate(draft => {
    result = acceptCareerOpportunityInDraft(draft, registries, opportunityRecordId);
    noticeId = recordNotification(draft, { personId: result.record.personId, type: "opportunity_accepted", title: `${result.def.name} Accepted`, message: `Orders issued. Report date: ${result.record.reportDate}.`, priority: "high", references: { opportunityRecordId, orderId: result.orderId } });
    recordAction(draft, { actorPersonId: result.record.personId, commandType: "accept_career_opportunity", payload: { opportunityRecordId }, resultCode: "opportunity_accepted" });
    updateCareerObjectivesInDraft(draft, registries, result.record.personId);
  }, ["careerGameplay","orders","notifications","actions"]);
  return commandResult({ code: "opportunity_accepted", message: `${result.def.name} accepted.`, data: { opportunityRecordId, orderId: result.orderId, reportDate: result.record.reportDate }, notifications: [noticeId] });
}

export function declineCareerOpportunity(store, registries, opportunityRecordId) {
  let result;
  store.mutate(draft => {
    result = declineCareerOpportunityInDraft(draft, registries, opportunityRecordId);
    recordAction(draft, { actorPersonId: result.record.personId, commandType: "decline_career_opportunity", payload: { opportunityRecordId }, resultCode: "opportunity_declined" });
    updateCareerObjectivesInDraft(draft, registries, result.record.personId);
  }, ["careerGameplay","actions"]);
  return commandResult({ code: "opportunity_declined", message: `${result.def.name} declined.`, data: { opportunityRecordId } });
}
