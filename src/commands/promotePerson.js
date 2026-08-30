import { createStableId } from "../core/ids.js";
import { evaluatePromotionEligibility } from "../services/careerRules.js";

export function promotePerson(store, registries, personId) {
  const state = store.getState();
  const result = evaluatePromotionEligibility(state, store.getIndexes(), registries, personId);
  if (!result.eligible) throw new Error(result.reasons.join(" · "));

  const person = state.entities.people[personId];
  const previousRankId = person.affiliation.rankId;
  const promotionId = createStableId("promo");
  const eventId = createStableId("career");

  store.mutate(draft => {
    draft.entities.people[personId].affiliation.rankId = result.nextRank.id;
    draft.entities.people[personId].career.prestige += 5;
    draft.entities.promotionRecords[promotionId] = {
      id: promotionId,
      schemaVersion: 1,
      personId,
      previousRankId,
      rankId: result.nextRank.id,
      effectiveDate: draft.world.date,
      authority: "career_system"
    };
    draft.entities.careerEvents[eventId] = {
      id: eventId,
      schemaVersion: 1,
      personId,
      type: "promotion",
      date: draft.world.date,
      references: { previousRankId, rankId: result.nextRank.id, promotionRecordId: promotionId }
    };
  }, ["history"]);
}
