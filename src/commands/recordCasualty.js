import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { recordAction, recordNotification } from "../services/recordServices.js";
export function recordCasualty(store, personId, details) {
  const state = store.getState(), person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  if (person.condition.status === "deceased") throw new Error(`${person.identity.displayName} is already recorded as deceased.`);
  const isFatal = details.classification === "kia"; let casualtyId, noticeId = null;
  store.mutate(draft => {
    casualtyId = createEntityId(draft, "casualty");
    draft.entities.casualtyRecords[casualtyId] = { id: casualtyId, schemaVersion: 1, personId, classification: details.classification, date: details.date ?? draft.world.date, locationId: details.locationId ?? null, unitId: person.affiliation.unitId, campaignId: details.campaignId ?? null, operationId: details.operationId ?? null, causeCategory: details.causeCategory ?? "combat", circumstances: details.circumstances ?? "unspecified" };
    if (isFatal) {
      draft.entities.people[personId].condition.status = "deceased"; draft.entities.people[personId].condition.health = 0;
      const service = draft.entities.serviceRecords[person.serviceRecordId]; if (service) { service.serviceStatus = "deceased"; service.separationDate = details.date ?? draft.world.date; }
      const memorialId = createEntityId(draft, "memorial");
      draft.entities.memorialRecords[memorialId] = { id: memorialId, schemaVersion: 1, personId, casualtyRecordId: casualtyId, memorialDate: details.date ?? draft.world.date };
      if (state.playerPersonId) noticeId = recordNotification(draft, { personId: state.playerPersonId, type: "memorial", title: "Fallen Soldier", message: `${person.identity.displayName} was killed in action.`, priority: "critical", references: { casualtyRecordId: casualtyId, fallenPersonId: personId } });
    }
    recordAction(draft, { actorPersonId: state.playerPersonId, commandType: "record_casualty", payload: { personId, classification: details.classification }, resultCode: isFatal ? "kia_recorded" : "casualty_recorded" });
  }, ["people", "history", "memorial", "notifications", "actions"]);
  return commandResult({ code: isFatal ? "kia_recorded" : "casualty_recorded", message: "Casualty recorded.", data: { casualtyId }, notifications: noticeId ? [noticeId] : [] });
}
