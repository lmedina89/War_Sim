function daysBetween(startIso, endIso) {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

export function findNextRank(registries, currentRank) {
  if (!currentRank) return null;
  if (Object.prototype.hasOwnProperty.call(currentRank, "promotionTargetRankId")) {
    return currentRank.promotionTargetRankId && registries.ranks.has(currentRank.promotionTargetRankId)
      ? registries.ranks.get(currentRank.promotionTargetRankId)
      : null;
  }
  return registries.ranks.values().find(rank =>
    rank.branchId === currentRank.branchId &&
    rank.category === currentRank.category &&
    rank.hierarchyLevel === currentRank.hierarchyLevel + 1
  ) ?? null;
}

export function evaluatePromotionEligibility(state, indexes, registries, personId) {
  const person = state.entities.people[personId];
  if (!person) throw new Error(`Unknown person: ${personId}`);

  const currentRank = registries.ranks.get(person.affiliation.rankId);
  const nextRank = findNextRank(registries, currentRank);
  if (!nextRank) {
    return { eligible: false, nextRank: null, reasons: [currentRank.terminalReason ?? "No higher rank is defined in this build."], progress: {} };
  }
  if (!currentRank.promotionRequirements) {
    return { eligible: false, nextRank, reasons: ["Promotion requirements are not implemented for this grade."], progress: {} };
  }

  const requirements = currentRank.promotionRequirements;
  const serviceDays = daysBetween(person.career.enlistmentDate, state.world.date);
  const promotionIds = indexes.promotionsByPersonId.get(personId) ?? [];
  const latestPromotion = promotionIds
    .map(id => state.entities.promotionRecords[id])
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  const gradeStartDate = latestPromotion?.effectiveDate ?? person.career.enlistmentDate;
  const gradeDays = daysBetween(gradeStartDate, state.world.date);

  const qualificationRecordIds = indexes.qualificationsByPersonId.get(personId) ?? [];
  const heldQualifications = new Set(
    qualificationRecordIds.map(id => state.entities.qualificationRecords[id].qualificationId)
  );

  const reasons = [];
  if (person.career.experience < (requirements.minimumExperience ?? 0)) reasons.push(`Experience ${person.career.experience}/${requirements.minimumExperience}`);
  if (serviceDays < (requirements.minimumTimeInServiceDays ?? 0)) reasons.push(`Time in service ${serviceDays}/${requirements.minimumTimeInServiceDays} days`);
  if (gradeDays < (requirements.minimumTimeInGradeDays ?? 0)) reasons.push(`Time in grade ${gradeDays}/${requirements.minimumTimeInGradeDays} days`);

  const missingQualifications = (requirements.requiredQualificationIds ?? []).filter(id => !heldQualifications.has(id));
  if (missingQualifications.length) reasons.push(`Missing qualification: ${missingQualifications.map(id => registries.qualifications.get(id).name).join(", ")}`);

  return {
    eligible: reasons.length === 0,
    nextRank,
    reasons,
    progress: {
      experience: person.career.experience,
      serviceDays,
      gradeDays,
      requiredExperience: requirements.minimumExperience ?? 0,
      requiredServiceDays: requirements.minimumTimeInServiceDays ?? 0,
      requiredGradeDays: requirements.minimumTimeInGradeDays ?? 0
    }
  };
}
