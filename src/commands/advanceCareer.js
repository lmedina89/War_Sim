import { commandResult } from "../core/commandResult.js";
import { advanceClock } from "../services/simulationClock.js";
import { recordAction } from "../services/recordServices.js";
import { simulatePersonnelLifecycle } from "../services/personnelLifecycle.js";
import { processPersonnelAdministration } from "../services/personnelAdministration.js";
import { registries } from "../data/registries.js";

function indexedCount(indexes, indexName, personId) {
  return indexes[indexName]?.get(personId)?.length ?? 0;
}

function unitSnapshot(state, personId) {
  const person = state.entities.people[personId];
  const unit = person?.affiliation.unitId ? state.entities.units[person.affiliation.unitId] : null;
  return unit ? { unitId: unit.id, unitName: unit.name, readiness: unit.condition?.readiness ?? null, morale: unit.condition?.morale ?? null } : null;
}

export function advanceWorldDays(store, days) {
  const before = store.getState();
  const beforeIndexes = store.getIndexes();
  const actorPersonId = before.playerPersonId;
  const pendingIds = beforeIndexes.gameplayEventsByPersonId?.get(actorPersonId) ?? [];
  const pendingDecision = pendingIds.map(id => before.entities.gameplayEventRecords[id]).find(record => record?.status === "pending");
  if (pendingDecision) throw new Error("Resolve the pending gameplay decision before advancing time.");
  const startDate = before.world.date;
  const personBefore = before.entities.people[actorPersonId];
  const statusBefore = personBefore?.condition.status ?? null;
  const unitBefore = unitSnapshot(before, actorPersonId);
  const playerCountsBefore = {
    notifications: indexedCount(beforeIndexes, "notificationsByPersonId", actorPersonId),
    orders: indexedCount(beforeIndexes, "ordersByPersonId", actorPersonId),
    promotions: indexedCount(beforeIndexes, "promotionsByPersonId", actorPersonId),
    qualifications: indexedCount(beforeIndexes, "qualificationsByPersonId", actorPersonId),
    awards: indexedCount(beforeIndexes, "awardsByPersonId", actorPersonId),
    personnelActions: indexedCount(beforeIndexes, "personnelActionsByPersonId", actorPersonId)
  };

  store.mutate(draft => {
    advanceClock(draft, days);
    simulatePersonnelLifecycle(draft, days, registries, { excludePersonId: actorPersonId });
    processPersonnelAdministration(draft, registries);
    recordAction(draft, { actorPersonId, commandType: "advance_time", payload: { days }, resultCode: "time_advanced" });
  }, ["actions", "people", "billets", "history", "orders", "notifications", "career", "admin"]);

  const after = store.getState();
  const afterIndexes = store.getIndexes();
  const statusAfter = after.entities.people[actorPersonId]?.condition.status ?? null;
  const unitAfter = unitSnapshot(after, actorPersonId);
  const playerCountsAfter = {
    notifications: indexedCount(afterIndexes, "notificationsByPersonId", actorPersonId),
    orders: indexedCount(afterIndexes, "ordersByPersonId", actorPersonId),
    promotions: indexedCount(afterIndexes, "promotionsByPersonId", actorPersonId),
    qualifications: indexedCount(afterIndexes, "qualificationsByPersonId", actorPersonId),
    awards: indexedCount(afterIndexes, "awardsByPersonId", actorPersonId),
    personnelActions: indexedCount(afterIndexes, "personnelActionsByPersonId", actorPersonId)
  };

  const summaryItems = [{ id: "service_time", label: `${days} day${days === 1 ? "" : "s"} of service time accrued`, tone: "routine" }];
  const countLabels = {
    notifications: "new notification",
    orders: "new order",
    promotions: "promotion recorded",
    qualifications: "qualification earned",
    awards: "award earned",
    personnelActions: "personnel action affecting you"
  };
  for (const [key, label] of Object.entries(countLabels)) {
    const delta = playerCountsAfter[key] - playerCountsBefore[key];
    if (delta > 0) summaryItems.push({ id: key, label: `${delta} ${label}${delta === 1 ? "" : "s"}`, tone: key === "notifications" || key === "orders" ? "attention" : "good" });
  }
  if (statusBefore && statusAfter && statusBefore !== statusAfter) summaryItems.push({ id: "status", label: `Status changed: ${statusBefore} → ${statusAfter}`, tone: "attention" });
  if (unitBefore && unitAfter && unitBefore.unitId === unitAfter.unitId) {
    if (unitBefore.readiness != null && unitAfter.readiness !== unitBefore.readiness) summaryItems.push({ id: "unit_readiness", label: `${unitAfter.unitName} readiness ${unitBefore.readiness}% → ${unitAfter.readiness}%`, tone: unitAfter.readiness > unitBefore.readiness ? "good" : "warning" });
    if (unitBefore.morale != null && unitAfter.morale !== unitBefore.morale) summaryItems.push({ id: "unit_morale", label: `${unitAfter.unitName} morale ${unitBefore.morale}% → ${unitAfter.morale}%`, tone: unitAfter.morale > unitBefore.morale ? "good" : "warning" });
  }
  if (summaryItems.length === 1) summaryItems.push({ id: "quiet_period", label: "No major career or unit events occurred", tone: "muted" });

  return commandResult({ code: "time_advanced", message: `Advanced ${days} days.`, data: { days, startDate, endDate: after.world.date, summaryItems } });
}

export function grantTrainingExperience(store, personId, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error("Invalid experience amount.");
  if (!store.getState().entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  const rounded = Math.floor(amount);
  store.mutate(draft => { draft.entities.people[personId].career.experience += rounded; recordAction(draft, { actorPersonId: personId, commandType: "training", payload: { experience: rounded }, resultCode: "training_completed" }); }, ["actions", "people", "history"]);
  return commandResult({ code: "training_completed", message: `Training complete: +${rounded} experience.`, data: { experience: rounded } });
}
