import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { addMonthsIso, daysBetweenIso } from "../services/dateMath.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function generateReenlistmentOffers(store, registries, personId) {
  const state = store.getState(), person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const service = state.entities.serviceRecords[person.serviceRecordId];
  const contract = state.entities.contractRecords[service.currentContractId];
  if (!contract || contract.status !== "active") throw new Error("No active contract found.");
  const daysRemaining = daysBetweenIso(state.world.date, contract.endDate);
  if (daysRemaining > 180) throw new Error(`Reenlistment window opens in ${daysRemaining - 180} days.`);
  if (daysRemaining < -30) throw new Error("Current contract has already expired.");

  const offerIdsForPerson = [...(store.getIndexes().reenlistmentOffersByPersonId?.get(personId) ?? [])];
  const existing = offerIdsForPerson.map(id => state.entities.reenlistmentOfferRecords[id]).filter(x => x?.status === "open");
  if (existing.length) return commandResult({ code: "offers_existing", message: "Reenlistment offers are already available.", data: { offerIds: existing.map(x => x.id) } });

  const specialty = registries.specialties.get(service.specialtyId);
  const offerIds = [];
  store.mutate(draft => {
    for (const def of registries.contracts.values().filter(x => x.branchId === service.branchId && x.reenlistmentEligible)) {
      const id = createEntityId(draft, "reenlist");
      const bonus = Math.round((specialty.enlistmentBonusBase || 0) * def.bonusMultiplier * 1.2 / 500) * 500;
      draft.entities.reenlistmentOfferRecords[id] = { id, schemaVersion: 1, personId, contractDefinitionId: def.id, specialtyId: service.specialtyId, componentId: service.componentId, offeredDate: draft.world.date, expiresDate: contract.endDate, bonus, status: "open" };
      offerIds.push(id);
    }
    recordNotification(draft, { personId, type: "reenlistment_offers", title: "Reenlistment Options Available", message: `${offerIds.length} reenlistment options are available for review.`, priority: "high", references: { contractId: contract.id } });
    recordAction(draft, { actorPersonId: personId, commandType: "generate_reenlistment_offers", payload: {}, resultCode: "offers_generated" });
  }, ["career", "notifications", "actions"]);
  return commandResult({ code: "offers_generated", message: "Reenlistment options generated.", data: { offerIds } });
}

export function acceptReenlistmentOffer(store, registries, offerId) {
  const state = store.getState(), offer = state.entities.reenlistmentOfferRecords[offerId];
  if (!offer || offer.status !== "open") throw new Error("This reenlistment offer is no longer available.");
  const person = state.entities.people[offer.personId], service = state.entities.serviceRecords[person.serviceRecordId];
  const oldContract = state.entities.contractRecords[service.currentContractId], def = registries.contracts.get(offer.contractDefinitionId);
  const siblingOfferIds = [...(store.getIndexes().reenlistmentOffersByPersonId?.get(offer.personId) ?? [])];
  let newContractId;
  store.mutate(draft => {
    draft.entities.contractRecords[oldContract.id].status = "completed";
    newContractId = createEntityId(draft, "contract");
    const startDate = oldContract.endDate;
    draft.entities.contractRecords[newContractId] = { id: newContractId, schemaVersion: 1, personId: offer.personId, contractDefinitionId: def.id, branchId: service.branchId, componentId: offer.componentId, specialtyId: offer.specialtyId, startDate, endDate: addMonthsIso(startDate, def.termMonths), termMonths: def.termMonths, bonus: offer.bonus, type: "reenlistment", status: "active" };
    draft.entities.serviceRecords[service.id].currentContractId = newContractId;
    draft.entities.reenlistmentOfferRecords[offerId].status = "accepted";
    for (const id of siblingOfferIds) { const other = draft.entities.reenlistmentOfferRecords[id]; if (other && other.id !== offerId && other.status === "open") other.status = "declined"; }
    const eventId = createEntityId(draft, "career");
    draft.entities.careerEvents[eventId] = { id: eventId, schemaVersion: 1, personId: offer.personId, type: "reenlistment", date: draft.world.date, references: { contractId: newContractId, specialtyId: offer.specialtyId } };
    const orderId = createEntityId(draft, "order");
    draft.entities.orderRecords[orderId] = { id: orderId, schemaVersion: 1, personId: offer.personId, type: "reenlistment", status: "executed", issueDate: draft.world.date, effectiveDate: startDate, unitId: person.affiliation.unitId, billetId: person.affiliation.billetId, title: "Reenlistment Orders", summary: `${def.name} accepted with a $${offer.bonus.toLocaleString()} bonus.` };
    recordNotification(draft, { personId: offer.personId, type: "reenlistment_accepted", title: "Reenlistment Accepted", message: `${def.name} accepted. Bonus: $${offer.bonus.toLocaleString()}.`, priority: "high", references: { contractId: newContractId } });
    recordAction(draft, { actorPersonId: offer.personId, commandType: "accept_reenlistment_offer", payload: { offerId }, resultCode: "reenlistment_accepted" });
  }, ["history", "orders", "notifications", "actions", "career"]);
  return commandResult({ code: "reenlistment_accepted", message: "Reenlistment accepted.", data: { contractId: newContractId } });
}
