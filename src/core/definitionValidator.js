export function validateDefinitions(registries) {
  const errors = [];

  for (const rank of registries.ranks.values()) {
    if (!registries.branches.has(rank.branchId)) errors.push(`${rank.id}: invalid branchId ${rank.branchId}.`);
    for (const qualificationId of rank.promotionRequirements?.requiredQualificationIds ?? []) {
      if (!registries.qualifications.has(qualificationId)) errors.push(`${rank.id}: invalid required qualification ${qualificationId}.`);
    }
  }

  for (const school of registries.schools.values()) {
    for (const id of school.grantsQualificationIds ?? []) {
      if (!registries.qualifications.has(id)) errors.push(`${school.id}: invalid qualification ${id}.`);
    }
    for (const id of school.completionAwardIds ?? []) {
      if (!registries.awards.has(id)) errors.push(`${school.id}: invalid completion award ${id}.`);
    }
  }

  for (const billet of registries.billets.values()) {
    if (!registries.echelons.has(billet.echelonId)) errors.push(`${billet.id}: invalid echelonId ${billet.echelonId}.`);
    if (!registries.branches.has(billet.branchId)) errors.push(`${billet.id}: invalid branchId ${billet.branchId}.`);
    if (!registries.roles.has(billet.roleId)) errors.push(`${billet.id}: invalid roleId ${billet.roleId}.`);
  }

  for (const org of registries.organizations.values()) {
    if (!registries.echelons.has(org.echelonId)) errors.push(`${org.id}: invalid echelonId ${org.echelonId}.`);
    if (!registries.branches.has(org.branchId)) errors.push(`${org.id}: invalid branchId ${org.branchId}.`);
    for (const id of org.billetDefinitionIds ?? []) {
      if (!registries.billets.has(id)) errors.push(`${org.id}: invalid billet definition ${id}.`);
    }
    for (const id of org.childOrganizationDefinitionIds ?? []) {
      if (!registries.organizations.has(id)) errors.push(`${org.id}: invalid child organization ${id}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
