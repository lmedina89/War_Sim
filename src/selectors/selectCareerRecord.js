import { evaluatePromotionEligibility } from "../services/careerRules.js";

export function selectCareerRecord(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);
  const rank = registries.ranks.get(person.affiliation.rankId);
  const role = registries.roles.get(person.affiliation.roleId);
  const branch = registries.branches.get(person.affiliation.branchId);

  const qualificationIds = indexes.qualificationsByPersonId.get(personId) ?? [];
  const qualifications = qualificationIds.map(id => {
    const record = state.entities.qualificationRecords[id];
    return {
      id: record.qualificationId,
      name: registries.qualifications.get(record.qualificationId).name,
      schoolName: registries.schools.get(record.schoolId).name,
      completedDate: record.completedDate
    };
  });

  const awardIds = indexes.awardsByPersonId.get(personId) ?? [];
  const awards = awardIds.map(id => {
    const record = state.entities.awardRecords[id];
    const definition = registries.awards.get(record.awardId);
    return { id: record.awardId, name: definition.name, category: definition.category, earnedDate: record.earnedDate };
  });

  const relationshipIds = indexes.relationshipsByPersonId.get(personId) ?? [];
  const relationships = relationshipIds.map(id => {
    const record = state.entities.relationshipRecords[id];
    const otherId = record.personAId === personId ? record.personBId : record.personAId;
    return { id, otherPersonId: otherId, otherName: state.entities.people[otherId]?.identity.displayName ?? "Unknown", ...record };
  });

  const eventIds = indexes.careerEventsByPersonId.get(personId) ?? [];
  const events = eventIds
    .map(id => state.entities.careerEvents[id])
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map(event => ({ id: event.id, date: event.date, label: formatCareerEvent(event, registries, state) }));

  const promotion = evaluatePromotionEligibility(state, indexes, registries, personId);

  return {
    personId,
    name: person.identity.displayName,
    branch: branch.name,
    rank: `${rank.abbreviation} · ${rank.name}`,
    payGrade: rank.payGrade,
    role: role.name,
    experience: person.career.experience,
    prestige: person.career.prestige,
    qualifications,
    awards,
    relationships,
    events,
    promotion
  };
}

function formatCareerEvent(event, registries, state) {
  switch (event.type) {
    case "enlistment":
      return `Enlisted in the ${registries.branches.get(event.references.branchId).name}`;
    case "promotion":
      return `Promoted to ${registries.ranks.get(event.references.rankId).name}`;
    case "school_completion":
      return `Completed ${registries.schools.get(event.references.schoolId).name}`;
    case "assignment":
      return `Assigned to ${state.entities.units[event.references.unitId]?.name ?? event.references.unitId}`;
    default:
      return event.type.replaceAll("_", " ");
  }
}
