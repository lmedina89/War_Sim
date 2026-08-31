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
    const definition = registries.qualifications.get(record.qualificationId);
    return {
      id,
      name: definition.name,
      category: definition.category,
      completedDate: record.completedDate,
      result: record.result ?? null,
      score: record.score ?? null,
      maxScore: record.maxScore ?? null,
      expiresDate: record.expiresDate ?? null,
      weaponDefinitionId: record.weaponDefinitionId ?? definition.weaponDefinitionId ?? null,
      badgeClasp: record.badgeClasp ?? definition.badgeClasp ?? null,
      schoolId: record.schoolId ?? null,
      sourceId: record.sourceId ?? null
    };
  });

  const educationIds = indexes.militaryEducationByPersonId?.get(personId) ?? [];
  const education = educationIds.map(id => {
    const record=state.entities.militaryEducationRecords[id];
    const school=registries.schools.get(record.schoolId);
    return { id, schoolId:record.schoolId, name:school.name, schoolType:school.schoolType ?? school.category, status:record.status, startDate:record.startDate ?? null, completedDate:record.completedDate ?? null, sourceType:record.sourceType ?? null };
  }).sort((a,b)=>String(b.completedDate??"").localeCompare(String(a.completedDate??""))||a.name.localeCompare(b.name));

  const awardIds = indexes.awardsByPersonId.get(personId) ?? [];
  const awards = awardIds.map(id => {
    const record = state.entities.awardRecords[id];
    const award = registries.awards.get(record.awardId);
    return { id, awardId:record.awardId, name: award.name, category: award.category, awardGroup:award.awardGroup ?? award.category, earnedDate: record.earnedDate, sourceType:record.sourceType ?? null, sourceId:record.sourceId ?? null };
  }).sort((a,b)=>String(b.earnedDate??"").localeCompare(String(a.earnedDate??""))||a.name.localeCompare(b.name));

  const relationshipIds = indexes.relationshipsByPersonId.get(personId) ?? [];
  const relationships = relationshipIds.map(id => {
    const record = state.entities.relationshipRecords[id];
    const otherId = record.personAId === personId ? record.personBId : record.personAId;
    const other = state.entities.people[otherId];
    const otherRank = other?.affiliation.rankId && registries.ranks.has(other.affiliation.rankId) ? registries.ranks.get(other.affiliation.rankId) : null;
    const otherBillet = other?.affiliation.billetId ? state.entities.billets[other.affiliation.billetId] : null;
    const otherBilletDef = otherBillet && registries.billets.has(otherBillet.definitionId) ? registries.billets.get(otherBillet.definitionId) : null;
    return {
      id,
      otherPersonId: otherId,
      otherName: other?.identity.displayName ?? "Unknown",
      otherRank: otherRank?.abbreviation ?? "—",
      otherPayGrade: otherRank?.payGrade ?? "—",
      otherRole: otherBilletDef?.name ?? "Unassigned",
      otherStatus: other?.condition.status ?? "unknown",
      relationshipType: record.relationshipType,
      familiarity: record.familiarity,
      trust: record.trust,
      respect: record.respect,
      rapport: record.rapport ?? 0,
      bond: record.bond,
      personalityTraits: (()=>{ const profileId=indexes.personalityProfileByPersonId?.get(otherId); const profile=profileId?state.entities.personalityProfiles?.[profileId]:null; return (profile?.traitIds??[]).map(id=>registries.personalities.has(id)?registries.personalities.get(id).name:id); })(),
      memories: (indexes.relationshipMemoriesByPersonId?.get(personId)??[]).map(memoryId=>state.entities.relationshipMemoryRecords?.[memoryId]).filter(memory=>memory && (memory.personId===otherId || memory.otherPersonId===otherId)).sort((a,b)=>(b.elapsedDay??0)-(a.elapsedDay??0)).slice(0,3).map(memory=>({id:memory.id,date:memory.gameDate,summary:memory.summary,type:memory.type}))
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
    component: registries.components.get(person.affiliation.componentId).name,
    specialty: `${registries.specialties.get(person.affiliation.specialtyId).code} · ${registries.specialties.get(person.affiliation.specialtyId).name}`,
    experience: person.career.experience,
    prestige: person.career.prestige,
    qualifications,
    education,
    awards,
    achievementCounts: { schools: education.filter(item=>item.status==="graduated").length, qualifications: qualifications.length, badges: awards.filter(item=>item.category==="badge"||item.category==="tab").length, ribbonsAndMedals: awards.filter(item=>["ribbon","medal","decoration"].includes(item.category)).length },
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
