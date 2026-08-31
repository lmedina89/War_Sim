import { daysBetweenIso } from "./dateMath.js";

function currentQualificationRecord(state, personId, qualificationId) {
  return Object.values(state.entities.qualificationRecords ?? {})
    .filter(record => record.personId === personId && record.qualificationId === qualificationId)
    .sort((a,b) => String(b.completedDate ?? "").localeCompare(String(a.completedDate ?? "")) || b.id.localeCompare(a.id))[0] ?? null;
}

export function evaluateSchoolEligibility(state, registries, personId, schoolId) {
  const person = state.entities.people?.[personId];
  if (!person) return { eligible:false, reasons:["person not found"], satisfied:[] };
  const school = registries.schools.get(schoolId);
  const rank = registries.ranks.get(person.affiliation.rankId);
  const skillProfile = state.entities.skillProfiles?.[`skills_${personId}`] ?? Object.values(state.entities.skillProfiles ?? {}).find(profile => profile.personId === personId) ?? null;
  const serviceDays = daysBetweenIso(person.career.enlistmentDate, state.world.date);
  const rule = school.eligibility ?? {};
  const reasons = [], satisfied = [];

  const require = (ok, success, failure) => { if (ok) satisfied.push(success); else reasons.push(failure); };
  if (rule.minimumServiceDays != null) require(serviceDays >= rule.minimumServiceDays, `${rule.minimumServiceDays}+ days service`, `${rule.minimumServiceDays} days service required`);
  if (rule.minimumRankLevel != null) require(rank.hierarchyLevel >= rule.minimumRankLevel, `rank requirement met`, `rank level ${rule.minimumRankLevel}+ required`);
  if (rule.maximumRankLevel != null) require(rank.hierarchyLevel <= rule.maximumRankLevel, `rank ceiling met`, `rank level ${rule.maximumRankLevel} or below required`);
  if (rule.minimumHealth != null) require(person.condition.health >= rule.minimumHealth, `health requirement met`, `${rule.minimumHealth}% health required`);
  if (rule.minimumReadiness != null) require(person.condition.readiness >= rule.minimumReadiness, `readiness requirement met`, `${rule.minimumReadiness}% readiness required`);
  if (rule.maximumFatigue != null) require(person.condition.fatigue <= rule.maximumFatigue, `fatigue requirement met`, `fatigue must be ${rule.maximumFatigue}% or lower`);
  if (rule.allowedStatuses?.length) require(rule.allowedStatuses.includes(person.condition.status), `status eligible`, `status ${person.condition.status} is not eligible`);
  if (rule.allowedRankCategories?.length) require(rule.allowedRankCategories.includes(rank.category), `rank category eligible`, `${rank.category} personnel are not eligible`);
  if (rule.allowedSpecialtyIds?.length) require(rule.allowedSpecialtyIds.includes(person.affiliation.specialtyId), `MOS/specialty eligible`, `MOS/specialty is not eligible`);
  if (rule.allowedComponentIds?.length) require(rule.allowedComponentIds.includes(person.affiliation.componentId), `component eligible`, `component is not eligible`);
  for (const [skillId, minimum] of Object.entries(rule.minimumSkills ?? {})) {
    const skill = registries.skills.get(skillId), value = Number(skillProfile?.values?.[skillId] ?? 0);
    require(value >= minimum, `${skill.name} ${minimum}+`, `${skill.name} ${minimum}+ required (current ${value})`);
  }
  for (const qualificationId of rule.prerequisiteQualificationIds ?? []) {
    const def = registries.qualifications.get(qualificationId), record = currentQualificationRecord(state, personId, qualificationId);
    const valid = Boolean(record && (!record.expiresDate || record.expiresDate >= state.world.date));
    require(valid, `${def.name} current`, `${def.name} required`);
  }

  const completed = Object.values(state.entities.militaryEducationRecords ?? {}).some(record => record.personId === personId && record.schoolId === schoolId && record.status === "graduated")
    || Object.values(state.entities.qualificationRecords ?? {}).some(record => record.personId === personId && record.schoolId === schoolId);
  if (completed && school.repeatable !== true) reasons.push("school already completed");

  return { eligible: reasons.length === 0, reasons, satisfied, serviceDays, completed };
}

export function schoolOpportunitySourceLabel(sourceType) {
  const labels = {
    random_eligible: "Career opportunity",
    player_request: "Volunteer request",
    command_nomination: "Command nomination",
    unit_requirement: "Unit requirement",
    billet_requirement: "Billet requirement",
    reenlistment_incentive: "Reenlistment incentive",
    training_pipeline: "Training pipeline",
    special_event: "Special career event"
  };
  return labels[sourceType] ?? String(sourceType ?? "Career opportunity").replaceAll("_", " ");
}
