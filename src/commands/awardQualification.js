import { createStableId } from "../core/ids.js";

export function completeSchool(store, registries, personId, schoolId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const school = registries.schools.get(schoolId);

  const existingSchoolCompletion = Object.values(state.entities.qualificationRecords)
    .some(record => record.personId === personId && record.schoolId === schoolId);
  if (existingSchoolCompletion) throw new Error(`${person.identity.displayName} already completed ${school.name}.`);

  store.mutate(draft => {
    for (const qualificationId of school.grantsQualificationIds) {
      registries.qualifications.get(qualificationId);
      const recordId = createStableId("qual");
      draft.entities.qualificationRecords[recordId] = {
        id: recordId,
        schemaVersion: 1,
        personId,
        schoolId,
        qualificationId,
        completedDate: draft.world.date,
        result: "graduate"
      };
    }

    for (const awardId of school.completionAwardIds) {
      const award = registries.awards.get(awardId);
      const awardRecordId = createStableId("award");
      draft.entities.awardRecords[awardRecordId] = {
        id: awardRecordId,
        schemaVersion: 1,
        personId,
        awardId,
        earnedDate: draft.world.date,
        sourceType: "school_completion",
        sourceId: schoolId
      };
      draft.entities.people[personId].career.prestige += award.prestigeValue;
    }

    const eventId = createStableId("career");
    draft.entities.careerEvents[eventId] = {
      id: eventId,
      schemaVersion: 1,
      personId,
      type: "school_completion",
      date: draft.world.date,
      references: { schoolId }
    };
    draft.entities.people[personId].career.prestige += 3;
  }, ["history"]);
}
