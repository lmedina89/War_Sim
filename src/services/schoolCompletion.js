import { createEntityId } from "../core/ids.js";
import { recordNotification } from "./recordServices.js";

export function completeSchoolInDraft(draft, registries, personId, schoolId, { sourceType = "school_completion" } = {}) {
  const person = draft.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const school = registries.schools.get(schoolId);
  const existing = Object.values(draft.entities.qualificationRecords).some(record => record.personId === personId && record.schoolId === schoolId);
  if (existing) return { schoolId, alreadyCompleted: true, qualificationRecordIds: [], awardRecordIds: [], notificationIds: [] };
  const qualificationRecordIds = [], awardRecordIds = [], notificationIds = [];
  for (const qualificationId of school.grantsQualificationIds ?? []) {
    const qualification = registries.qualifications.get(qualificationId), recordId = createEntityId(draft, "qual");
    draft.entities.qualificationRecords[recordId] = { id: recordId, schemaVersion: 1, personId, schoolId, qualificationId, completedDate: draft.world.date, result: "graduate" };
    qualificationRecordIds.push(recordId);
    notificationIds.push(recordNotification(draft, { personId, type: "qualification_completed", title: `${school.name} Completed`, message: `Qualification earned: ${qualification.name}.`, priority: "high", references: { schoolId, qualificationId, qualificationRecordId: recordId } }));
  }
  for (const awardId of school.completionAwardIds ?? []) {
    const award = registries.awards.get(awardId), awardRecordId = createEntityId(draft, "award");
    draft.entities.awardRecords[awardRecordId] = { id: awardRecordId, schemaVersion: 1, personId, awardId, earnedDate: draft.world.date, sourceType, sourceId: schoolId };
    draft.entities.people[personId].career.prestige += award.prestigeValue;
    awardRecordIds.push(awardRecordId);
    notificationIds.push(recordNotification(draft, { personId, type: "award_earned", title: "Award Earned", message: `${award.name} · ${award.category}`, priority: "high", references: { awardId, awardRecordId, schoolId } }));
  }
  const eventId = createEntityId(draft, "career");
  draft.entities.careerEvents[eventId] = { id: eventId, schemaVersion: 1, personId, type: "school_completion", date: draft.world.date, references: { schoolId } };
  draft.entities.people[personId].career.prestige += 3;
  return { schoolId, alreadyCompleted: false, qualificationRecordIds, awardRecordIds, notificationIds, careerEventId: eventId };
}
