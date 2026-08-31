export function validateDefinitions(registries) {
  const errors = [];
  const branchIds = new Set(registries.branches.values().map(item => item.id));

  for (const branch of registries.branches.values()) {
    if (!registries.ranks.has(branch.startingRankId)) errors.push(`${branch.id}: invalid startingRankId.`);
    if (!registries.roles.has(branch.startingRoleId)) errors.push(`${branch.id}: invalid startingRoleId.`);
  }

  for (const rank of registries.ranks.values()) {
    if (!branchIds.has(rank.branchId)) errors.push(`${rank.id}: invalid branchId.`);
    for (const qualificationId of rank.promotionRequirements?.requiredQualificationIds ?? []) {
      if (!registries.qualifications.has(qualificationId)) errors.push(`${rank.id}: invalid required qualification ${qualificationId}.`);
    }
  }

  for (const school of registries.schools.values()) {
    for (const qualificationId of school.grantsQualificationIds ?? []) {
      if (!registries.qualifications.has(qualificationId)) errors.push(`${school.id}: invalid qualification ${qualificationId}.`);
    }
    for (const awardId of school.completionAwardIds ?? []) {
      if (!registries.awards.has(awardId)) errors.push(`${school.id}: invalid completion award ${awardId}.`);
    }
  }

  for (const unit of registries.unitDefinitions.values()) {
    for (const roleId of unit.defaultSlotRoles ?? []) {
      if (!registries.roles.has(roleId)) errors.push(`${unit.id}: invalid slot role ${roleId}.`);
    }
  }

  for (const tier of registries.simulationTiers.values()) {
    if (!Number.isInteger(tier.tier) || tier.tier < 0) errors.push(`${tier.id}: invalid tier.`);
  }

  return { ok: errors.length === 0, errors };
}
