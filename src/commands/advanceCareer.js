import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { recordAction } from "../services/recordServices.js";
import { simulatePersonnelLifecycle } from "../services/personnelLifecycle.js";
import { processPersonnelAdministration } from "../services/personnelAdministration.js";
import { registries } from "../data/registries.js";

export function advanceWorldDays(store, days) {
  const before = store.getState();
  const actorPersonId = before.playerPersonId;
  const pendingDecision = Object.values(before.entities.gameplayEventRecords ?? {}).find(record => record.personId === actorPersonId && record.status === "pending");
  if (pendingDecision) throw new Error("Resolve the pending gameplay decision before advancing time.");
  const startDate = before.world.date;
  const countsBefore = Object.fromEntries(Object.entries(before.entities).map(([k,v]) => [k,Object.keys(v).length]));
  store.mutate(draft => {
    advanceClock(draft, days);
    simulatePersonnelLifecycle(draft, days, registries, { excludePersonId: actorPersonId });
    processPersonnelAdministration(draft, registries);
    recordAction(draft, { actorPersonId, commandType: "advance_time", payload: { days }, resultCode: "time_advanced" });
  }, ["actions", "people", "billets", "history", "orders", "notifications", "career", "admin"]);
  const after = store.getState();
  const countsAfter = Object.fromEntries(Object.entries(after.entities).map(([k,v]) => [k,Object.keys(v).length]));
  const changes = Object.fromEntries(Object.keys(countsAfter).filter(k => countsAfter[k] !== countsBefore[k]).map(k => [k, countsAfter[k]-countsBefore[k]]));
  return commandResult({ code: "time_advanced", message: `Advanced ${days} days.`, data: { days, startDate, endDate: after.world.date, changes } });
}

export function grantTrainingExperience(store, personId, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error("Invalid experience amount.");
  if (!store.getState().entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  const rounded = Math.floor(amount);
  store.mutate(draft => { draft.entities.people[personId].career.experience += rounded; recordAction(draft, { actorPersonId: personId, commandType: "training", payload: { experience: rounded }, resultCode: "training_completed" }); }, ["actions", "people", "history"]);
  return commandResult({ code: "training_completed", message: `Training complete: +${rounded} experience.`, data: { experience: rounded } });
}
