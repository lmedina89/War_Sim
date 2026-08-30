import { createStableId } from "../core/ids.js";

export function recordCasualty(store, personId, details) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  if (person.condition.status === "deceased") throw new Error(`${person.identity.displayName} is already recorded as deceased.`);

  const casualtyId = createStableId("casualty");
  const isFatal = details.classification === "kia";

  store.mutate(draft => {
    draft.entities.casualtyRecords[casualtyId] = {
      id: casualtyId,
      schemaVersion: 1,
      personId,
      classification: details.classification,
      date: details.date ?? draft.world.date,
      locationId: details.locationId ?? null,
      unitId: person.affiliation.unitId,
      campaignId: details.campaignId ?? null,
      operationId: details.operationId ?? null,
      causeCategory: details.causeCategory ?? "combat",
      circumstances: details.circumstances ?? "unspecified"
    };

    if (isFatal) {
      draft.entities.people[personId].condition.status = "deceased";
      draft.entities.people[personId].condition.health = 0;
      const service = draft.entities.serviceRecords[person.serviceRecordId];
      if (service) {
        service.serviceStatus = "deceased";
        service.separationDate = details.date ?? draft.world.date;
      }
      const memorialId = createStableId("memorial");
      draft.entities.memorialRecords[memorialId] = {
        id: memorialId,
        schemaVersion: 1,
        personId,
        casualtyRecordId: casualtyId,
        memorialDate: details.date ?? draft.world.date
      };
    }
  }, ["people", "history", "memorial"]);

  return casualtyId;
}
