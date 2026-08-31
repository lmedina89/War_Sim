import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { evaluatePromotionEligibility } from "../services/careerRules.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function promotePerson(store, registries, personId) {
  const state = store.getState();
  const eligibility = evaluatePromotionEligibility(state, store.getIndexes(), registries, personId);
  if (!eligibility.eligible) throw new Error(eligibility.reasons.join(" · "));
  const previousRankId = state.entities.people[personId].affiliation.rankId;
  let noticeId;
  store.mutate(draft => {
    const promotionId = createEntityId(draft, "promo"), eventId = createEntityId(draft, "career");
    draft.entities.people[personId].affiliation.rankId = eligibility.nextRank.id;
    draft.entities.people[personId].career.prestige += 5;
    draft.entities.promotionRecords[promotionId] = { id: promotionId, schemaVersion: 1, personId, previousRankId, rankId: eligibility.nextRank.id, effectiveDate: draft.world.date, authority: "career_system" };
    draft.entities.careerEvents[eventId] = { id: eventId, schemaVersion: 1, personId, type: "promotion", date: draft.world.date, references: { previousRankId, rankId: eligibility.nextRank.id, promotionRecordId: promotionId } };
    noticeId = recordNotification(draft, { personId, type: "promotion", title: "Promotion", message: `Promoted to ${eligibility.nextRank.name} (${eligibility.nextRank.abbreviation}).`, priority: "high", references: { rankId: eligibility.nextRank.id, promotionRecordId: promotionId } });
    recordAction(draft, { actorPersonId: personId, commandType: "request_promotion", payload: { previousRankId, rankId: eligibility.nextRank.id }, resultCode: "promoted" });
  }, ["history", "notifications", "actions"]);
  return commandResult({ code: "promoted", message: `Promoted to ${eligibility.nextRank.name}.`, data: { rankId: eligibility.nextRank.id }, notifications: [noticeId] });
}
