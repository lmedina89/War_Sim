import { commandResult } from "../core/commandResult.js";
import { recordAction } from "../services/recordServices.js";
import { completeSchoolInDraft } from "../services/schoolCompletion.js";

export function completeSchool(store, registries, personId, schoolId) {
  const state = store.getState(), person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const school = registries.schools.get(schoolId);
  const existing = [...(store.getIndexes().qualificationsByPersonId?.get(personId) ?? [])].some(id => state.entities.qualificationRecords[id]?.schoolId === schoolId);
  if (existing) throw new Error(`${person.identity.displayName} already completed ${school.name}.`);
  let completed;
  store.mutate(draft => {
    completed = completeSchoolInDraft(draft, registries, personId, schoolId);
    recordAction(draft, { actorPersonId: personId, commandType: "complete_school", payload: { schoolId }, resultCode: "school_completed" });
  }, ["history", "notifications", "actions"]);
  return commandResult({ code: "school_completed", message: `${school.name} completed.`, data: { schoolId }, notifications: completed.notificationIds });
}
