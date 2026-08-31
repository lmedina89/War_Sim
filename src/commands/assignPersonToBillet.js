export function assignPersonToBillet(store, registries, personId, billetId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  const billet = state.entities.billets[billetId];

  if (!person) return { ok: false, code: "PERSON_NOT_FOUND" };
  if (!billet) return { ok: false, code: "BILLET_NOT_FOUND" };
  if (billet.assignedPersonId && billet.assignedPersonId !== personId) {
    return { ok: false, code: "BILLET_OCCUPIED" };
  }

  const billetDef = registries.billets.get(billet.definitionId);
  const rank = registries.ranks.get(person.affiliation.rankId);
  if (rank.hierarchyLevel < billetDef.minimumRankLevel) {
    return { ok: false, code: "RANK_TOO_LOW", details: { minimumRankLevel: billetDef.minimumRankLevel } };
  }

  store.mutate(draft => {
    const draftPerson = draft.entities.people[personId];

    if (draftPerson.affiliation.billetId) {
      const oldBillet = draft.entities.billets[draftPerson.affiliation.billetId];
      if (oldBillet?.assignedPersonId === personId) {
        oldBillet.assignedPersonId = null;
        oldBillet.status = "vacant";
      }
    }

    billet.assignedPersonId = personId;
    billet.status = "filled";

    draftPerson.affiliation.billetId = billetId;
    draftPerson.affiliation.unitId = billet.unitId;
  }, ["people", "billets"]);

  return { ok: true, code: "ASSIGNED", personId, billetId };
}
