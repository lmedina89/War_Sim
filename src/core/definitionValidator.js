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
    if (!billet.primaryEquipmentDefinitionId || !registries.equipment.has(billet.primaryEquipmentDefinitionId)) errors.push(`${billet.id}: invalid primaryEquipmentDefinitionId ${billet.primaryEquipmentDefinitionId}.`);
  }

  for (const component of registries.components.values()) {
    if (!registries.branches.has(component.branchId)) errors.push(`${component.id}: invalid branchId ${component.branchId}.`);
    if (!registries.contracts.has(component.defaultContractDefinitionId)) errors.push(`${component.id}: invalid default contract ${component.defaultContractDefinitionId}.`);
  }

  for (const specialty of registries.specialties.values()) {
    if (!registries.branches.has(specialty.branchId)) errors.push(`${specialty.id}: invalid branchId ${specialty.branchId}.`);
    if (specialty.startingRoleId && !registries.roles.has(specialty.startingRoleId)) errors.push(`${specialty.id}: invalid startingRoleId ${specialty.startingRoleId}.`);
    for (const id of specialty.eligibleBilletDefinitionIds ?? []) if (!registries.billets.has(id)) errors.push(`${specialty.id}: invalid eligible billet ${id}.`);
  }

  for (const contract of registries.contracts.values()) {
    if (!registries.branches.has(contract.branchId)) errors.push(`${contract.id}: invalid branchId ${contract.branchId}.`);
    if (!Number.isInteger(contract.termMonths) || contract.termMonths <= 0) errors.push(`${contract.id}: invalid termMonths.`);
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

  for (const profile of registries.generationProfiles.values()) {
    if (!registries.branches.has(profile.branchId)) errors.push(`${profile.id}: invalid branchId ${profile.branchId}.`);
    if (!Array.isArray(profile.units) || profile.units.length === 0) errors.push(`${profile.id}: generation profile must define units.`);
    const unitIds = new Set(profile.units.map(unit => unit.id));
    if (!unitIds.has(profile.rootUnitId)) errors.push(`${profile.id}: missing rootUnitId ${profile.rootUnitId}.`);
    for (const unit of profile.units) {
      if (!registries.organizations.has(unit.organizationDefinitionId)) errors.push(`${profile.id}/${unit.id}: invalid organizationDefinitionId ${unit.organizationDefinitionId}.`);
      if (unit.parentUnitId && !unitIds.has(unit.parentUnitId)) errors.push(`${profile.id}/${unit.id}: invalid parentUnitId ${unit.parentUnitId}.`);
    }
    for (const [rankId, years] of Object.entries(profile.rankServiceYearsByRankId ?? {})) {
      if (!registries.ranks.has(rankId)) errors.push(`${profile.id}: invalid service-years rank ${rankId}.`);
      if (!Number.isFinite(years) || years < 0) errors.push(`${profile.id}: invalid service-years value for ${rankId}.`);
    }
    for (const [billetId, specialtyId] of Object.entries(profile.billetSpecialtyIdsByDefinitionId ?? {})) {
      if (!registries.billets.has(billetId)) errors.push(`${profile.id}: invalid billet specialty mapping ${billetId}.`);
      if (!registries.specialties.has(specialtyId)) errors.push(`${profile.id}: invalid specialty mapping ${specialtyId}.`);
    }
    for (const [billetId, rankId] of Object.entries(profile.billetRankIdsByDefinitionId ?? {})) {
      if (!registries.billets.has(billetId)) errors.push(`${profile.id}: invalid billet rank mapping ${billetId}.`);
      if (!registries.ranks.has(rankId)) errors.push(`${profile.id}: invalid rank mapping ${rankId}.`);
    }
  }

  for (const scenario of registries.careerStartScenarios.values()) {
    if (!registries.branches.has(scenario.branchId)) errors.push(`${scenario.id}: invalid branchId ${scenario.branchId}.`);
    if (!registries.components.has(scenario.componentId)) errors.push(`${scenario.id}: invalid componentId ${scenario.componentId}.`);
    if (!registries.specialties.has(scenario.specialtyId)) errors.push(`${scenario.id}: invalid specialtyId ${scenario.specialtyId}.`);
    if (!registries.generationProfiles.has(scenario.generationProfileId)) errors.push(`${scenario.id}: invalid generationProfileId ${scenario.generationProfileId}.`);
    if (!registries.ranks.has(scenario.startingRankId)) errors.push(`${scenario.id}: invalid startingRankId ${scenario.startingRankId}.`);
    for (const id of scenario.eligibleStartingBilletDefinitionIds ?? []) if (!registries.billets.has(id)) errors.push(`${scenario.id}: invalid starting billet ${id}.`);
    for (const id of scenario.allowedContractDefinitionIds ?? []) if (!registries.contracts.has(id)) errors.push(`${scenario.id}: invalid allowed contract ${id}.`);
  }

  return { ok: errors.length === 0, errors };
}
