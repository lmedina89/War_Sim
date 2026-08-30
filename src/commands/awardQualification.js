import { createStableId } from "../core/ids.js";

export function awardQualification(store, registries, personId, schoolId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);

  const school = registries.schools.get(schoolId);
  const existing = Object.values(state.entities.qualificationRecords)
    .some(record => record.personId === personId && record.schoolId === schoolId);

  if (existing) throw new Error(`${person.identity.displayName} already completed ${school.name}.`);

  store.transact(draft => {
    const recordId = createStableId("qual");
    draft.entities.qualificationRecords[recordId] = {
      id: recordId,
      schemaVersion: 1,
      personId,
      schoolId,
      qualificationId: school.grantsQualificationId,
      completedDate: draft.world.date,
      result: "graduate"
    };

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
  });
}
