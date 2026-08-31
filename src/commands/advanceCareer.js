import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { recordAction } from "../services/recordServices.js";

export function advanceWorldDays(store, days) {
  const actorPersonId = store.getState().playerPersonId;
  store.mutate(draft => {
    advanceClock(draft, days);
    recordAction(draft, { actorPersonId, commandType: "advance_time", payload: { days }, resultCode: "time_advanced" });
  }, ["actions"]);
  return commandResult({ code: "time_advanced", message: `Advanced ${days} days.`, data: { days } });
}

export function grantTrainingExperience(store, personId, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error("Invalid experience amount.");
  if (!store.getState().entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  const rounded = Math.floor(amount);
  store.mutate(draft => {
    draft.entities.people[personId].career.experience += rounded;
    recordAction(draft, { actorPersonId: personId, commandType: "training", payload: { experience: rounded }, resultCode: "training_completed" });
  }, ["actions"]);
  return commandResult({ code: "training_completed", message: `Training complete: +${rounded} experience.`, data: { experience: rounded } });
}
