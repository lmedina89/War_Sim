import { addDaysIso } from "./dateMath.js";

export const TERMINAL_SERVICE_STATUSES = Object.freeze(["separated", "retired", "deceased"]);

export function isTerminalPersonnelStatus(status) {
  return TERMINAL_SERVICE_STATUSES.includes(status);
}

export function isPersonInActiveService(state, personId) {
  const person = state.entities.people?.[personId];
  if (!person || isTerminalPersonnelStatus(person.condition?.status)) return false;
  const service = state.entities.serviceRecords?.[person.serviceRecordId];
  return service?.personId === personId && service.serviceStatus === "active";
}

export function activeServiceBlockReason(state, personId) {
  const person = state.entities.people?.[personId];
  if (!person) return `Unknown person: ${personId}`;
  if (isTerminalPersonnelStatus(person.condition?.status)) return `Service status ${person.condition.status} does not permit this active-duty action.`;
  const service = state.entities.serviceRecords?.[person.serviceRecordId];
  if (!service || service.personId !== personId) return "No valid service record is attached to this Soldier.";
  if (service.serviceStatus !== "active") return `Service record status ${service.serviceStatus} does not permit this active-duty action.`;
  return null;
}

export function assertActiveServiceAction(state, personId) {
  const reason = activeServiceBlockReason(state, personId);
  if (reason) throw new Error(reason);
}

export function contractCoverageThrough(state, personId, targetDate) {
  const person = state.entities.people?.[personId];
  const service = person ? state.entities.serviceRecords?.[person.serviceRecordId] : null;
  if (!person || !service || service.personId !== personId || service.serviceStatus !== "active") {
    return { covered: false, reason: "No active service record covers this action." };
  }

  let contract = service.currentContractId ? state.entities.contractRecords?.[service.currentContractId] : null;
  if (!contract || contract.personId !== personId || contract.status !== "active") {
    return { covered: false, reason: "No active contract covers this action." };
  }
  if (targetDate < contract.endDate) return { covered: true, contractIds: [contract.id] };

  const pending = Object.values(state.entities.contractRecords ?? {})
    .filter(record => record.personId === personId && record.status === "pending")
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.id.localeCompare(b.id));
  const used = [contract.id];
  let coverageEnd = contract.endDate;
  for (const next of pending) {
    if (next.startDate > coverageEnd) break;
    used.push(next.id);
    if (next.endDate > coverageEnd) coverageEnd = next.endDate;
    if (targetDate < coverageEnd) return { covered: true, contractIds: used };
  }
  return { covered: false, contractIds: used, reason: `Current service commitment ends ${coverageEnd}.` };
}

export function activityCompletionDate(state, durationDays) {
  return addDaysIso(state.world.date, durationDays);
}
