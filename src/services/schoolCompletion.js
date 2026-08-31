import { createEntityId } from "../core/ids.js";
import { recordNotification } from "./recordServices.js";
import { applyEffects } from "./effectEngine.js";
import { addDaysIso } from "./dateMath.js";

function existingEducationRecord(draft, personId, schoolId) {
  return Object.values(draft.entities.militaryEducationRecords ?? {}).find(record => record.personId === personId && record.schoolId === schoolId && record.status === "graduated") ?? null;
}
function existingQualification(draft, personId, qualificationId) {
  return Object.values(draft.entities.qualificationRecords ?? {}).find(record => record.personId === personId && record.qualificationId === qualificationId) ?? null;
}
function existingAward(draft, personId, awardId) {
  return Object.values(draft.entities.awardRecords ?? {}).find(record => record.personId === personId && record.awardId === awardId) ?? null;
}

export function completeSchoolInDraft(draft, registries, personId, schoolId, { sourceType = "school_completion", opportunityRecordId = null } = {}) {
  const person = draft.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const school = registries.schools.get(schoolId);
  draft.entities.militaryEducationRecords ??= {};
  const completed = existingEducationRecord(draft,personId,schoolId);
  if (completed && school.repeatable !== true) return { schoolId, alreadyCompleted: true, educationRecordId:completed.id, qualificationRecordIds: [], awardRecordIds: [], notificationIds: [] };

  const qualificationRecordIds = [], awardRecordIds = [], notificationIds = [];
  const beforeSkills={ ...(draft.entities.skillProfiles?.[`skills_${personId}`]?.values ?? {}) };
  if (school.completionEffects?.length) applyEffects(draft, registries, { personId, unitId: person.affiliation?.unitId ?? null, effects: school.completionEffects });

  const educationRecordId=createEntityId(draft,"edu");
  draft.entities.militaryEducationRecords[educationRecordId]={
    id:educationRecordId,schemaVersion:1,personId,schoolId,status:"graduated",
    startDate:addDaysIso(draft.world.date,-Math.max(0,(school.durationDays??1)-1)),completedDate:draft.world.date,
    sourceType,sourceOpportunityRecordId:opportunityRecordId
  };

  for (const qualificationId of school.grantsQualificationIds ?? []) {
    if(existingQualification(draft,personId,qualificationId) && school.repeatable !== true) continue;
    const qualification = registries.qualifications.get(qualificationId), recordId = createEntityId(draft, "qual");
    draft.entities.qualificationRecords[recordId] = { id: recordId, schemaVersion: 2, personId, schoolId, qualificationId, completedDate: draft.world.date, result: "graduate", sourceType, sourceId:educationRecordId };
    qualificationRecordIds.push(recordId);
    notificationIds.push(recordNotification(draft, { personId, type: "qualification_completed", title: `${school.name} Completed`, message: `Qualification earned: ${qualification.name}.`, priority: "high", references: { schoolId, qualificationId, qualificationRecordId: recordId, educationRecordId } }));
  }
  for (const awardId of school.completionAwardIds ?? []) {
    if(existingAward(draft,personId,awardId) && school.repeatable !== true) continue;
    const award = registries.awards.get(awardId), awardRecordId = createEntityId(draft, "award");
    draft.entities.awardRecords[awardRecordId] = { id: awardRecordId, schemaVersion: 2, personId, awardId, earnedDate: draft.world.date, sourceType, sourceId: educationRecordId };
    draft.entities.people[personId].career.prestige += award.prestigeValue;
    awardRecordIds.push(awardRecordId);
    notificationIds.push(recordNotification(draft, { personId, type: "award_earned", title: "Award Earned", message: `${award.name} · ${award.category}`, priority: "high", references: { awardId, awardRecordId, schoolId, educationRecordId } }));
  }
  const eventId = createEntityId(draft, "career");
  draft.entities.careerEvents[eventId] = { id: eventId, schemaVersion: 2, personId, type: "school_completion", date: draft.world.date, references: { schoolId, educationRecordId } };
  draft.entities.people[personId].career.prestige += 3;
  const afterSkills={ ...(draft.entities.skillProfiles?.[`skills_${personId}`]?.values ?? {}) };
  return { schoolId, alreadyCompleted: false, educationRecordId, qualificationRecordIds, awardRecordIds, notificationIds, careerEventId: eventId, skillChanges:Object.fromEntries(Object.keys(afterSkills).filter(id=>afterSkills[id]!==beforeSkills[id]).map(id=>[id,afterSkills[id]-(beforeSkills[id]??0)])) };
}
