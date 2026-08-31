export function selectCareerRecord(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);

  const rank = registries.ranks.get(person.affiliation.rankId);
  const branch = registries.branches.get(person.affiliation.branchId);
  const billet = person.affiliation.billetId ? state.entities.billets[person.affiliation.billetId] : null;
  const billetDef = billet ? registries.billets.get(billet.definitionId) : null;

  const qualificationIds = indexes.qualificationsByPersonId.get(personId) ?? [];
  const qualifications = qualificationIds.map(id => {
    const record = state.entities.qualificationRecords[id];
    return {
      name: registries.qualifications.get(record.qualificationId).name,
      completedDate: record.completedDate
    };
  });

  const eventIds = indexes.careerEventsByPersonId.get(personId) ?? [];
  const events = eventIds
    .map(id => state.entities.careerEvents[id])
    .sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map(event => ({
      id: event.id,
      date: event.date,
      label: formatCareerEvent(event, registries)
    }));

  return {
    personId,
    name: person.identity.displayName,
    branch: branch.name,
    rank: `${rank.abbreviation} · ${rank.name}`,
    payGrade: rank.payGrade,
    role: billetDef?.name ?? "Unassigned",
    experience: person.career.experience,
    prestige: person.career.prestige,
    simulationTier: person.simulationTier ?? 0,
    qualifications,
    events
  };
}

function formatCareerEvent(event, registries) {
  switch (event.type) {
    case "career_started":
    case "enlistment":
      return `Enlisted in the ${registries.branches.get(event.references.branchId).name}`;
    case "promotion":
      return `Promoted to ${registries.ranks.get(event.references.rankId).name}`;
    case "school_completion":
    case "qualification_completed":
      return event.references.schoolId
        ? `Completed ${registries.schools.get(event.references.schoolId).name}`
        : "Qualification completed";
    default:
      return event.type.replaceAll("_", " ");
  }
}
