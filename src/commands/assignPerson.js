import { createEntityId } from "../core/ids.js";

export function assignPersonToUnit(store, registries, personId, unitId, roleId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  const unit = state.entities.units[unitId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  if (!unit) throw new Error(`Unknown unit: ${unitId}`);
  registries.roles.get(roleId);

  const vacantBillet = Object.values(state.entities.billets).find(billet =>
    billet.unitId === unitId &&
    billet.status === "vacant" &&
    registries.billets.get(billet.definitionId).roleId === roleId
  );
  if (!vacantBillet) throw new Error(`No vacant billet for role ${roleId} in ${unit.name}.`);

  const previousBilletId = person.affiliation.billetId;
  let assignmentId;
  store.mutate(draft => {
    if (previousBilletId) {
      const previous = draft.entities.billets[previousBilletId];
      if (previous?.assignedPersonId === personId) {
        previous.assignedPersonId = null;
        previous.status = "vacant";
      }
    }

    const target = draft.entities.billets[vacantBillet.id];
    target.assignedPersonId = personId;
    target.status = "filled";
    draft.entities.people[personId].affiliation.unitId = unitId;
    draft.entities.people[personId].affiliation.billetId = target.id;

    assignmentId = createEntityId(draft, "assign");
    draft.entities.assignmentRecords[assignmentId] = {
      id: assignmentId, schemaVersion: 2, personId, unitId,
      billetId: target.id, startDate: draft.world.date,
      endDate: null, reason: "reassignment"
    };
  }, ["people", "billets", "history"]);

  return { ok: true, assignmentId, billetId: vacantBillet.id };
}
