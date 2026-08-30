import { createStableId } from "../core/ids.js";

export function assignPersonToUnit(store, personId, unitId, roleId) {
  const state = store.getState();
  if (!state.entities.people[personId]) throw new Error(`Unknown person: ${personId}`);
  if (!state.entities.units[unitId]) throw new Error(`Unknown unit: ${unitId}`);

  store.transact(draft => {
    const person = draft.entities.people[personId];
    const previousUnitId = person.affiliation.unitId;
    person.affiliation.unitId = unitId;
    person.affiliation.roleId = roleId;

    const eventId = createStableId("career");
    draft.entities.careerEvents[eventId] = {
      id: eventId,
      schemaVersion: 1,
      personId,
      type: "assignment",
      date: draft.world.date,
      references: { previousUnitId, unitId, roleId }
    };
  });
}
