import { createEntityId } from "../core/ids.js";
import { daysBetweenIso } from "./dateMath.js";
import { findNextRank } from "./careerRules.js";

function qualificationSetsByPerson(draft) {
  const byPerson = new Map();
  for (const record of Object.values(draft.entities.qualificationRecords)) {
    const held = byPerson.get(record.personId) ?? new Set();
    held.add(record.qualificationId);
    byPerson.set(record.personId, held);
  }
  return byPerson;
}

function latestPromotionDate(draft, personId) {
  let latest = null;
  for (const record of Object.values(draft.entities.promotionRecords)) {
    if (record.personId !== personId) continue;
    const date = record.effectiveDate ?? record.date;
    if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
}

export function simulatePersonnelLifecycle(draft, days, registries, { excludePersonId = null } = {}) {
  const elapsedAfter = draft.world.clock?.elapsedDays ?? 0;
  const elapsedBefore = Math.max(0, elapsedAfter - days);
  const cycles = Math.max(0, Math.floor(elapsedAfter / 30) - Math.floor(elapsedBefore / 30));
  const qualificationsByPerson = qualificationSetsByPerson(draft);
  for (const person of Object.values(draft.entities.people)) {
    if (person.id === excludePersonId || person.condition.status !== "active") continue;
    if (cycles > 0) {
      person.career.experience += cycles * (12 + (person.id.length % 7));
      person.condition.fatigue = Math.max(0, Math.min(100, person.condition.fatigue - cycles));
      person.condition.readiness = Math.max(40, Math.min(100, 75 + Math.floor(person.career.experience / 500) - Math.floor(person.condition.fatigue / 8)));
    }

    const currentRank = registries.ranks.get(person.affiliation.rankId);
    const nextRank = findNextRank(registries, currentRank);
    const requirements = currentRank.promotionRequirements;
    if (!nextRank || !requirements) continue;

    const tis = daysBetweenIso(person.career.enlistmentDate, draft.world.date);
    const gradeStart = latestPromotionDate(draft, person.id) ?? person.career.enlistmentDate;
    const tig = daysBetweenIso(gradeStart, draft.world.date);
    const held = qualificationsByPerson.get(person.id) ?? new Set();
    if (person.career.experience < (requirements.minimumExperience ?? 0)) continue;
    if (tis < (requirements.minimumTimeInServiceDays ?? 0)) continue;
    if (tig < (requirements.minimumTimeInGradeDays ?? 0)) continue;
    if ((requirements.requiredQualificationIds ?? []).some(id => !held.has(id))) continue;

    const previousRankId = person.affiliation.rankId;
    person.affiliation.rankId = nextRank.id;
    person.career.lastPromotionDate = draft.world.date;
    const recordId = createEntityId(draft, "prom");
    draft.entities.promotionRecords[recordId] = {
      id: recordId, schemaVersion: 1, personId: person.id, previousRankId, rankId: nextRank.id,
      effectiveDate: draft.world.date, authority: "npc_career_progression"
    };
  }
}
