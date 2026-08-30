import { createStableId } from "../core/ids.js";

export function assignPersonToUnit(store, registries, personId, unitId, roleId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  const unit = state.entities.units[unitId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  if (!unit) throw new Error(`Unknown unit: ${unitId}`);
  registries.roles.get(roleId);

  const vacantSlot = Object.values(state.entities.unitSlots).find(slot =>
    slot.unitId === unitId && slot.roleId === roleId && slot.status === "vacant"
  );
  if (!vacantSlot) throw new Error(`No vacant slot for role ${roleId} in ${unit.name}.`);

  const previousUnitId = person.affiliation.unitId;
  const previousSlot = Object.values(state.entities.unitSlots).find(slot => slot.assignedPersonId === personId);
  const openAssignment = Object.values(state.entities.assignmentRecords).find(record => record.personId === personId && !record.endDate);
  const assignmentId = createStableId("assign");
  const eventId = createStableId("career");

  store.mutate(draft => {
    if (previousSlot) {
      draft.entities.unitSlots[previousSlot.id].assignedPersonId = null;
      draft.entities.unitSlots[previousSlot.id].status = "vacant";
    }
    draft.entities.unitSlots[vacantSlot.id].assignedPersonId = personId;
    draft.entities.unitSlots[vacantSlot.id].status = "filled";
    draft.entities.people[personId].affiliation.unitId = unitId;
    draft.entities.people[personId].affiliation.roleId = roleId;
    if (openAssignment) draft.entities.assignmentRecords[openAssignment.id].endDate = draft.world.date;
    draft.entities.assignmentRecords[assignmentId] = {
      id: assignmentId,
      schemaVersion: 1,
      personId,
      unitId,
      roleId,
      startDate: draft.world.date,
      endDate: null,
      reason: "transfer"
    };
    draft.entities.careerEvents[eventId] = {
      id: eventId,
      schemaVersion: 1,
      personId,
      type: "assignment",
      date: draft.world.date,
      references: { previousUnitId, unitId, roleId, assignmentRecordId: assignmentId }
    };
  }, ["people", "history"]);
}
