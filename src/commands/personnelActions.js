import { commandResult } from "../core/commandResult.js";
import { reassignPersonAdministrative, changePersonnelStatus } from "../services/personnelAdministration.js";
import { recordAction } from "../services/recordServices.js";

export function administrativelyReassignPerson(store, personId, billetId, reason = "reassignment") {
  let result;
  store.mutate(draft => {
    result = reassignPersonAdministrative(draft, personId, billetId, reason);
    recordAction(draft, { actorPersonId: personId, commandType: "administrative_reassignment", payload: { billetId, reason }, resultCode: "reassigned" });
  }, ["people", "billets", "history", "orders", "actions", "admin"]);
  return commandResult({ code: "reassigned", message: "Reassignment executed.", data: result });
}

export function administrativelySetStatus(store, personId, status, reason = "administrative") {
  store.mutate(draft => {
    changePersonnelStatus(draft, personId, status, reason);
    recordAction(draft, { actorPersonId: personId, commandType: "personnel_status_change", payload: { status, reason }, resultCode: "status_changed" });
  }, ["people", "actions", "admin"]);
  return commandResult({ code: "status_changed", message: `Personnel status changed to ${status}.` });
}
