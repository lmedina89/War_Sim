import { evaluatePromotionEligibility } from "../services/careerRules.js";

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
      id,
      name: registries.qualifications.get(record.qualificationId).name,
      completedDate: record.completedDate
    };
  });

  const awardIds = indexes.awardsByPersonId.get(personId) ?? [];
  const awards = awardIds.map(id => {
    const record = state.entities.awardRecords[id];
    const award = registries.awards.get(record.awardId);
    return { id, name: award.name, category: award.category, earnedDate: record.earnedDate };
  });

  const relationshipIds = indexes.relationshipsByPersonId.get(personId) ?? [];
  const relationships = relationshipIds.map(id => {
    const record = state.entities.relationshipRecords[id];
    const otherId = record.personAId === personId ? record.personBId : record.personAId;
    return {
      id,
      otherPersonId: otherId,
      otherName: state.entities.people[otherId]?.identity.displayName ?? "Unknown",
      relationshipType: record.relationshipType,
      familiarity: record.familiarity,
      trust: record.trust,
      respect: record.respect,
      bond: record.bond
    };
  });

  const eventIds = indexes.careerEventsByPersonId.get(personId) ?? [];
  const events = eventIds
    .map(id => state.entities.careerEvents[id])
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map(event => ({ id: event.id, date: event.date, label: formatCareerEvent(event, registries) }));

  return {
    personId,
    name: person.identity.displayName,
    branch: branch.name,
    rank: `${rank.abbreviation} · ${rank.name}`,
    payGrade: rank.payGrade,
    role: billetDef?.name ?? "Unassigned",
    component: registries.components.get(person.affiliation.componentId ?? "component_active").name,
    specialty: `${registries.specialties.get(person.affiliation.specialtyId ?? "specialty_army_11b").code} · ${registries.specialties.get(person.affiliation.specialtyId ?? "specialty_army_11b").name}`,
    experience: person.career.experience,
    prestige: person.career.prestige,
    qualifications,
    awards,
    relationships,
    events,
    promotion: evaluatePromotionEligibility(state, indexes, registries, personId)
  };
}

function formatCareerEvent(event, registries) {
  switch (event.type) {
    case "enlistment":
    case "career_started":
      return `Enlisted in the ${registries.branches.get(event.references.branchId).name}`;
    case "promotion":
      return `Promoted to ${registries.ranks.get(event.references.rankId).name}`;
    case "school_completion":
      return `Completed ${registries.schools.get(event.references.schoolId).name}`;
    case "assignment":
      return "New assignment";
    case "reenlistment":
      return "Reenlisted";
    default:
      return event.type.replaceAll("_", " ");
  }
}
