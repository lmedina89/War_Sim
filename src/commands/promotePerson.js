import { createStableId } from "../core/ids.js";

export function promotePerson(store, registries, personId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);

  const currentRank = registries.ranks.get(person.affiliation.rankId);
  const nextRank = registries.ranks.values()
    .filter(rank =>
      rank.branchId === currentRank.branchId &&
      rank.category === currentRank.category &&
      rank.hierarchyLevel === currentRank.hierarchyLevel + 1
    )[0];

  if (!nextRank) throw new Error(`${person.identity.displayName} has no next rank in this demo.`);

  store.transact(draft => {
    draft.entities.people[personId].affiliation.rankId = nextRank.id;
    draft.entities.people[personId].career.prestige += 5;

    const eventId = createStableId("career");
    draft.entities.careerEvents[eventId] = {
      id: eventId,
      schemaVersion: 1,
      personId,
      type: "promotion",
      date: draft.world.date,
      references: {
        previousRankId: currentRank.id,
        rankId: nextRank.id
      }
    };
  });
}
