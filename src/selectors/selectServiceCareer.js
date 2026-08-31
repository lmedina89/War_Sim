import { daysBetweenIso } from "../services/dateMath.js";

export function selectServiceCareer(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const service = state.entities.serviceRecords[person.serviceRecordId];
  const contract = service?.currentContractId ? state.entities.contractRecords[service.currentContractId] : null;
  const component = registries.components.get(service?.componentId ?? person.affiliation.componentId);
  const specialty = registries.specialties.get(service?.specialtyId ?? person.affiliation.specialtyId);
  const contractDef = contract ? registries.contracts.get(contract.contractDefinitionId) : null;
  const daysRemaining = contract ? daysBetweenIso(state.world.date, contract.endDate) : null;
  const offerIds = indexes.reenlistmentOffersByPersonId?.get(personId) ?? [];
  const offers = offerIds.map(id => state.entities.reenlistmentOfferRecords[id]).filter(Boolean).sort((a,b) => a.id.localeCompare(b.id)).map(record => ({ ...record, contractName: registries.contracts.get(record.contractDefinitionId).name }));
  const periodIds = indexes.servicePeriodsByPersonId?.get(personId) ?? service?.servicePeriodIds ?? [];
  const periods = periodIds.map(id => state.entities.servicePeriodRecords[id]).filter(Boolean).map(record => ({ ...record, branchName: registries.branches.get(record.branchId).name, componentName: registries.components.get(record.componentId).name, specialtyName: `${registries.specialties.get(record.specialtyId).code} ${registries.specialties.get(record.specialtyId).name}` }));
  return { service, contract, contractDef, component, specialty, daysRemaining, reenlistmentWindowOpen: service?.serviceStatus === "active" && contract?.status === "active" && daysRemaining != null && daysRemaining <= 180 && daysRemaining >= -30, offers, periods };
}
