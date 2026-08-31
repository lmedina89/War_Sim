import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function completeSchool(store, registries, personId, schoolId) {
  const state = store.getState(), person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const school = registries.schools.get(schoolId);
  const existing = [...(store.getIndexes().qualificationsByPersonId?.get(personId) ?? [])].some(id => state.entities.qualificationRecords[id]?.schoolId === schoolId);
  if (existing) throw new Error(`${person.identity.displayName} already completed ${school.name}.`);
  const noticeIds = [];
  store.mutate(draft => {
    for (const qualificationId of school.grantsQualificationIds) {
      const qualification = registries.qualifications.get(qualificationId), recordId = createEntityId(draft, "qual");
      draft.entities.qualificationRecords[recordId] = { id: recordId, schemaVersion: 1, personId, schoolId, qualificationId, completedDate: draft.world.date, result: "graduate" };
      noticeIds.push(recordNotification(draft, { personId, type: "qualification_completed", title: `${school.name} Completed`, message: `Qualification earned: ${qualification.name}.`, priority: "high", references: { schoolId, qualificationId, qualificationRecordId: recordId } }));
    }
    for (const awardId of school.completionAwardIds) {
      const award = registries.awards.get(awardId), awardRecordId = createEntityId(draft, "award");
      draft.entities.awardRecords[awardRecordId] = { id: awardRecordId, schemaVersion: 1, personId, awardId, earnedDate: draft.world.date, sourceType: "school_completion", sourceId: schoolId };
      draft.entities.people[personId].career.prestige += award.prestigeValue;
      noticeIds.push(recordNotification(draft, { personId, type: "award_earned", title: "Award Earned", message: `${award.name} · ${award.category}`, priority: "high", references: { awardId, awardRecordId, schoolId } }));
    }
    const eventId = createEntityId(draft, "career");
    draft.entities.careerEvents[eventId] = { id: eventId, schemaVersion: 1, personId, type: "school_completion", date: draft.world.date, references: { schoolId } };
    draft.entities.people[personId].career.prestige += 3;
    recordAction(draft, { actorPersonId: personId, commandType: "complete_school", payload: { schoolId }, resultCode: "school_completed" });
  }, ["history", "notifications", "actions"]);
  return commandResult({ code: "school_completed", message: `${school.name} completed.`, data: { schoolId }, notifications: noticeIds });
}
