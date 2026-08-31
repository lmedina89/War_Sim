const EFFECT_FIELDS = Object.freeze({
  person: new Set(["career.experience","career.prestige","condition.health","condition.morale","condition.fatigue","condition.readiness"]),
  unit: new Set(["condition.readiness","condition.morale","condition.cohesion","condition.supply"]),
  relationships: new Set(["familiarity","trust","respect","rapport","bond"]),
  unitTraining: new Set(["physical","weapons","tactical","cohesion","discipline","equipmentReadiness"])
});

function validateEffect(errors, ownerId, effect, registries) {
  if (!["skill","person","unit","relationships","unitTraining"].includes(effect.target)) { errors.push(`${ownerId}: invalid effect target ${effect.target}.`); return; }
  if (!["add","set"].includes(effect.operation)) errors.push(`${ownerId}: invalid effect operation ${effect.operation}.`);
  if (!Number.isFinite(effect.value)) errors.push(`${ownerId}: effect value must be numeric.`);
  if (effect.target === "skill") { if (!registries.skills.has(effect.skillId)) errors.push(`${ownerId}: invalid skill ${effect.skillId}.`); }
  else if (!EFFECT_FIELDS[effect.target].has(effect.field)) errors.push(`${ownerId}: invalid ${effect.target} field ${effect.field}.`);
  if (effect.clamp && (!Array.isArray(effect.clamp) || effect.clamp.length !== 2 || !effect.clamp.every(Number.isFinite) || effect.clamp[1] < effect.clamp[0])) errors.push(`${ownerId}: invalid effect clamp.`);
}

export function validateDefinitions(registries) {
  const errors = [];

  for (const rank of registries.ranks.values()) {
    if (!registries.branches.has(rank.branchId)) errors.push(`${rank.id}: invalid branchId ${rank.branchId}.`);
    if (rank.promotionTargetRankId != null) {
      if (!registries.ranks.has(rank.promotionTargetRankId)) errors.push(`${rank.id}: invalid promotion target ${rank.promotionTargetRankId}.`);
      else {
        const target = registries.ranks.get(rank.promotionTargetRankId);
        if (target.branchId !== rank.branchId || target.category !== rank.category) errors.push(`${rank.id}: promotion target must remain in the same branch/category.`);
        if (target.hierarchyLevel < rank.hierarchyLevel) errors.push(`${rank.id}: promotion target cannot be lower in hierarchy.`);
      }
      if (!rank.promotionRequirements) errors.push(`${rank.id}: a promotion target requires promotionRequirements.`);
    }
    for (const qualificationId of rank.promotionRequirements?.requiredQualificationIds ?? []) {
      if (!registries.qualifications.has(qualificationId)) errors.push(`${rank.id}: invalid required qualification ${qualificationId}.`);
    }
  }

  for (const qualification of registries.qualifications.values()) {
    if (qualification.weaponDefinitionId && !registries.equipment.has(qualification.weaponDefinitionId)) errors.push(`${qualification.id}: invalid weaponDefinitionId ${qualification.weaponDefinitionId}.`);
    if (qualification.renewable && (!Number.isInteger(qualification.validityDays) || qualification.validityDays <= 0)) errors.push(`${qualification.id}: renewable qualification requires positive validityDays.`);
    if (qualification.scoring) {
      if (!Number.isInteger(qualification.scoring.maxScore) || qualification.scoring.maxScore <= 0) errors.push(`${qualification.id}: invalid scoring.maxScore.`);
      const bands = qualification.scoring.resultBands ?? [];
      if (!Array.isArray(bands) || !bands.length) errors.push(`${qualification.id}: scoring requires resultBands.`);
      for (const band of bands) if (!Number.isFinite(band.minimumScore) || !band.result || !band.label) errors.push(`${qualification.id}: invalid qualification result band.`);
    }
  }

  for (const award of registries.awards.values()) {
    if (!["ribbon","medal","decoration","badge","tab"].includes(award.category)) errors.push(`${award.id}: invalid award category ${award.category}.`);
    if (!Number.isFinite(award.prestigeValue) || award.prestigeValue < 0) errors.push(`${award.id}: invalid prestigeValue.`);
    if (!Number.isFinite(award.precedence) || award.precedence < 0) errors.push(`${award.id}: invalid precedence.`);
    if (!award.display?.kind || !["ribbon","badge","tab"].includes(award.display.kind)) errors.push(`${award.id}: missing or invalid display.kind.`);
    if (!award.display?.iconId) errors.push(`${award.id}: missing display.iconId.`);
    if (award.display?.kind === "ribbon" && (!Array.isArray(award.display.ribbonPattern) || award.display.ribbonPattern.length < 1)) errors.push(`${award.id}: ribbon display requires ribbonPattern.`);
    if (award.repeatDevice && !["oak_leaf_cluster","service_star","numeral","knot"].includes(award.repeatDevice.type)) errors.push(`${award.id}: invalid repeatDevice type.`);
    if (award.dd214Label != null && typeof award.dd214Label !== "string") errors.push(`${award.id}: invalid dd214Label.`);
  }

  for (const school of registries.schools.values()) {
    if (!Number.isInteger(school.durationDays) || school.durationDays <= 0) errors.push(`${school.id}: invalid durationDays.`);
    for (const id of school.grantsQualificationIds ?? []) {
      if (!registries.qualifications.has(id)) errors.push(`${school.id}: invalid qualification ${id}.`);
    }
    for (const id of school.completionAwardIds ?? []) {
      if (!registries.awards.has(id)) errors.push(`${school.id}: invalid completion award ${id}.`);
    }
    const eligibility=school.eligibility ?? {};
    for (const key of ["minimumServiceDays","minimumRankLevel","maximumRankLevel","minimumHealth","minimumReadiness","maximumFatigue"]) if (eligibility[key] != null && (!Number.isFinite(eligibility[key]) || eligibility[key] < 0)) errors.push(`${school.id}: invalid eligibility.${key}.`);
    for (const [skillId,value] of Object.entries(eligibility.minimumSkills ?? {})) { if (!registries.skills.has(skillId)) errors.push(`${school.id}: invalid minimum skill ${skillId}.`); if (!Number.isFinite(value)) errors.push(`${school.id}: invalid minimum skill value for ${skillId}.`); }
    for (const id of eligibility.prerequisiteQualificationIds ?? []) if (!registries.qualifications.has(id)) errors.push(`${school.id}: invalid prerequisite qualification ${id}.`);
    for (const id of eligibility.allowedSpecialtyIds ?? []) if (!registries.specialties.has(id)) errors.push(`${school.id}: invalid allowed specialty ${id}.`);
    for (const id of eligibility.allowedComponentIds ?? []) if (!registries.components.has(id)) errors.push(`${school.id}: invalid allowed component ${id}.`);
    for (const category of eligibility.allowedRankCategories ?? []) if (!["enlisted","warrant","officer"].includes(category)) errors.push(`${school.id}: invalid allowed rank category ${category}.`);
    for (const effect of school.completionEffects ?? []) validateEffect(errors, school.id, effect, registries);
  }

  for (const billet of registries.billets.values()) {
    if (!registries.echelons.has(billet.echelonId)) errors.push(`${billet.id}: invalid echelonId ${billet.echelonId}.`);
    if (!registries.branches.has(billet.branchId)) errors.push(`${billet.id}: invalid branchId ${billet.branchId}.`);
    if (!registries.roles.has(billet.roleId)) errors.push(`${billet.id}: invalid roleId ${billet.roleId}.`);
    if (!billet.primaryEquipmentDefinitionId || !registries.equipment.has(billet.primaryEquipmentDefinitionId)) errors.push(`${billet.id}: invalid primaryEquipmentDefinitionId ${billet.primaryEquipmentDefinitionId}.`);
  }


  for (const role of registries.roles.values()) {
    for (const authorityId of role.authorityIds ?? []) if (!registries.authorities.has(authorityId)) errors.push(`${role.id}: invalid authority ${authorityId}.`);
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
    if (!registries.readinessModels.has(profile.readinessModelId)) errors.push(`${profile.id}: invalid readinessModelId ${profile.readinessModelId}.`);
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
    if (!registries.scheduleTemplates.has(scenario.scheduleTemplateId)) errors.push(`${scenario.id}: invalid scheduleTemplateId ${scenario.scheduleTemplateId}.`);
    if (!registries.readinessModels.has(scenario.readinessModelId)) errors.push(`${scenario.id}: invalid readinessModelId ${scenario.readinessModelId}.`);
    if (scenario.defaultStartingSkillValue != null && !Number.isFinite(scenario.defaultStartingSkillValue)) errors.push(`${scenario.id}: invalid defaultStartingSkillValue.`);
    for (const [skillId, value] of Object.entries(scenario.startingSkillValues ?? {})) { if (!registries.skills.has(skillId)) errors.push(`${scenario.id}: invalid starting skill ${skillId}.`); if (!Number.isFinite(value)) errors.push(`${scenario.id}: invalid starting skill value for ${skillId}.`); }
    for (const id of scenario.eligibleStartingBilletDefinitionIds ?? []) if (!registries.billets.has(id)) errors.push(`${scenario.id}: invalid starting billet ${id}.`);
    for (const id of scenario.allowedContractDefinitionIds ?? []) if (!registries.contracts.has(id)) errors.push(`${scenario.id}: invalid allowed contract ${id}.`);
  }


  for (const activity of registries.activities.values()) {
    if (!Number.isInteger(activity.durationDays) || activity.durationDays <= 0) errors.push(`${activity.id}: invalid durationDays.`);
    if (activity.presentationId && !registries.feedbackPresentations.has(activity.presentationId)) errors.push(`${activity.id}: invalid presentationId ${activity.presentationId}.`);
    if (activity.eventTableId && !registries.eventTables.has(activity.eventTableId)) errors.push(`${activity.id}: invalid eventTableId ${activity.eventTableId}.`);
    for (const effect of activity.effects ?? []) validateEffect(errors, activity.id, effect, registries);
  }
  for (const table of registries.eventTables.values()) {
    if (!Array.isArray(table.entries) || !table.entries.length) errors.push(`${table.id}: event table must contain entries.`);
    for (const entry of table.entries ?? []) { if (entry.eventId && !registries.gameplayEvents.has(entry.eventId)) errors.push(`${table.id}: invalid event ${entry.eventId}.`); if (!Number.isInteger(entry.weight) || entry.weight <= 0) errors.push(`${table.id}: invalid weight.`); }
  }
  for (const event of registries.gameplayEvents.values()) {
    if (event.presentationId && !registries.feedbackPresentations.has(event.presentationId)) errors.push(`${event.id}: invalid presentationId ${event.presentationId}.`);
    for (const effect of event.effects ?? []) validateEffect(errors, event.id, effect, registries);
    const choiceIds = new Set();
    for (const choice of event.choices ?? []) {
      if (!choice.id || choiceIds.has(choice.id)) errors.push(`${event.id}: duplicate/invalid choice id ${choice.id}.`);
      choiceIds.add(choice.id);
      for (const effect of choice.effects ?? []) validateEffect(errors, `${event.id}/${choice.id}`, effect, registries);
    }
    if (event.defaultChoiceId && !choiceIds.has(event.defaultChoiceId)) errors.push(`${event.id}: invalid defaultChoiceId ${event.defaultChoiceId}.`);
    if (event.decisionDeadlineDays != null && (!Number.isInteger(event.decisionDeadlineDays) || event.decisionDeadlineDays < 1)) errors.push(`${event.id}: invalid decisionDeadlineDays.`);
    if (event.blocksTimeAdvance != null && typeof event.blocksTimeAdvance !== "boolean") errors.push(`${event.id}: blocksTimeAdvance must be boolean.`);
    if (event.minimumPerformanceScore != null && (!Number.isFinite(event.minimumPerformanceScore) || event.minimumPerformanceScore < 0 || event.minimumPerformanceScore > 100)) errors.push(`${event.id}: invalid minimumPerformanceScore.`);
    if (event.maximumPerformanceScore != null && (!Number.isFinite(event.maximumPerformanceScore) || event.maximumPerformanceScore < 0 || event.maximumPerformanceScore > 100)) errors.push(`${event.id}: invalid maximumPerformanceScore.`);
    if (Number.isFinite(event.minimumPerformanceScore) && Number.isFinite(event.maximumPerformanceScore) && event.minimumPerformanceScore > event.maximumPerformanceScore) errors.push(`${event.id}: performance score range is inverted.`);
  }



  for (const duty of registries.duties.values()) {
    if (!Number.isInteger(duty.durationDays) || duty.durationDays <= 0) errors.push(`${duty.id}: invalid durationDays.`);
    if (duty.eventTableId && !registries.eventTables.has(duty.eventTableId)) errors.push(`${duty.id}: invalid eventTableId ${duty.eventTableId}.`);
    if (duty.blocksFocusedActivities != null && typeof duty.blocksFocusedActivities !== "boolean") errors.push(`${duty.id}: blocksFocusedActivities must be boolean.`);
    for (const effect of duty.playerEffects ?? []) validateEffect(errors, duty.id, effect, registries);
    for (const [key, value] of Object.entries(duty.trainingEffects ?? {})) {
      if (!["physical","weapons","tactical","cohesion","discipline","equipmentReadiness"].includes(key)) errors.push(`${duty.id}: invalid unit-training field ${key}.`);
      if (!Number.isFinite(value)) errors.push(`${duty.id}: invalid unit-training effect ${key}.`);
    }
  }
  for (const template of registries.scheduleTemplates.values()) {
    if (!Number.isInteger(template.horizonDays) || template.horizonDays < 1) errors.push(`${template.id}: invalid horizonDays.`);
    for (const entry of template.entries ?? []) {
      if (!registries.duties.has(entry.dutyDefinitionId)) errors.push(`${template.id}: invalid duty ${entry.dutyDefinitionId}.`);
      if (!Number.isInteger(entry.offsetDays) || entry.offsetDays < 1 || !Number.isInteger(entry.repeatEveryDays) || entry.repeatEveryDays < 1) errors.push(`${template.id}: invalid schedule entry for ${entry.dutyDefinitionId}.`);
    }
  }
  for (const model of registries.readinessModels.values()) {
    const values = Object.values(model.weights ?? {});
    if (!values.length || values.some(v => !Number.isFinite(v) || v < 0)) errors.push(`${model.id}: invalid readiness weights.`);
    const sum = values.reduce((a,b)=>a+b,0); if (Math.abs(sum - 1) > 0.0001) errors.push(`${model.id}: readiness weights must sum to 1.`);
  }
  for (const opportunity of registries.opportunities.values()) {
    if (opportunity.schoolId && !registries.schools.has(opportunity.schoolId)) errors.push(`${opportunity.id}: invalid schoolId ${opportunity.schoolId}.`);
    if (opportunity.presentationId && !registries.feedbackPresentations.has(opportunity.presentationId)) errors.push(`${opportunity.id}: invalid presentationId ${opportunity.presentationId}.`);
    for (const key of ["expiresAfterDays","reportDelayDays"]) if (opportunity[key] != null && (!Number.isFinite(opportunity[key]) || opportunity[key] < 0)) errors.push(`${opportunity.id}: invalid ${key}.`);
    if (!Array.isArray(opportunity.sourceTypes) || !opportunity.sourceTypes.length) errors.push(`${opportunity.id}: school opportunity requires sourceTypes.`);
  }
  for (const objective of registries.careerObjectives.values()) {
    if (!["has_assignment","has_activity","minimum_readiness","promotion_eligible","unit_readiness_at_phase_target","qualification_current","no_open_opportunity"].includes(objective.completionRule)) errors.push(`${objective.id}: invalid completionRule ${objective.completionRule}.`);
    if (objective.activationRule && !["readiness_below","unit_readiness_below_phase_target","qualification_missing_or_due","promotion_not_eligible","open_opportunity"].includes(objective.activationRule)) errors.push(`${objective.id}: invalid activationRule ${objective.activationRule}.`);
    if (objective.qualificationId && !registries.qualifications.has(objective.qualificationId)) errors.push(`${objective.id}: invalid qualificationId ${objective.qualificationId}.`);
    if (objective.repeatable != null && typeof objective.repeatable !== "boolean") errors.push(`${objective.id}: repeatable must be boolean.`);
    if (objective.cooldownDays != null && (!Number.isInteger(objective.cooldownDays) || objective.cooldownDays < 0)) errors.push(`${objective.id}: invalid cooldownDays.`);
    if (objective.order != null && !Number.isFinite(objective.order)) errors.push(`${objective.id}: invalid order.`);
  }

  const relationshipBands = registries.relationshipBands.values().slice().sort((a,b) => a.minimumTrust - b.minimumTrust);
  if (!relationshipBands.length || relationshipBands[0].minimumTrust > -100 || relationshipBands.at(-1).maximumTrust < 100) errors.push("relationshipBands: trust range must cover -100 through 100.");
  for (let i = 0; i < relationshipBands.length; i++) {
    const band = relationshipBands[i];
    if (!Number.isFinite(band.minimumTrust) || !Number.isFinite(band.maximumTrust) || band.maximumTrust < band.minimumTrust) errors.push(`${band.id}: invalid trust range.`);
    if (i > 0 && band.minimumTrust !== relationshipBands[i-1].maximumTrust + 1) errors.push(`${band.id}: relationship trust bands must be contiguous.`);
  }

  const allowedPresentationTones = new Set(["routine","attention","critical","good","warning","bad","excellent"]);
  for (const status of registries.statusPresentations.values()) {
    if (!status.label || typeof status.label !== "string") errors.push(`${status.id}: status presentation missing label.`);
    if (!allowedPresentationTones.has(status.tone)) errors.push(`${status.id}: invalid status presentation tone ${status.tone}.`);
    if (!Number.isFinite(status.priority)) errors.push(`${status.id}: invalid status presentation priority.`);
  }
  for (const document of registries.documentPresentations.values()) {
    if (!document.label || typeof document.label !== "string") errors.push(`${document.id}: document presentation missing label.`);
    if (!/^[A-Z0-9-]{2,12}$/.test(document.prefix ?? "")) errors.push(`${document.id}: invalid document prefix.`);
  }

  return { ok: errors.length === 0, errors };
}
