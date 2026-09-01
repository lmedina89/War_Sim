import { ensureInfantryCompanyStructure, npcIdentityForIndex } from "../services/organizationSeed.js";
import { createEntityId } from "./ids.js";
import { initializeUnitTrainingProfiles } from "../services/unitReadiness.js";
import { ensureScheduleCoverageInDraft, seedCareerGameplayRecords, seedScheduleThrough, setTrainingPhaseInDraft } from "../services/careerGameplay.js";
import { syncSimulationTiersForPlayerUnit } from "../services/livingUnit.js";
import { registries } from "../data/registries.js";
import { seedPriorServiceHistories } from "../services/priorServiceHistory.js";
import { seedPersonalityProfiles } from "../services/livingCareer.js";
import { ensureNamedInfantryFormation } from "../services/formationIdentity.js";
export const CURRENT_SAVE_FORMAT_VERSION = 3;
export const CURRENT_WORLD_SCHEMA_VERSION = 16;


function normalizeScheduleAvailabilityFlags(worldState) {
  for (const record of Object.values(worldState.entities?.scheduleRecords ?? {})) {
    if (typeof record.blocksFocusedActivities !== "boolean") record.blocksFocusedActivities = record.calendarVisibility !== "background";
  }
}
function repairLegacyScheduleTemplateIds(worldState) {
  const scheduler = worldState.world?.scheduler ?? null;
  const fallbackPhaseId = registries.trainingPhases.has(scheduler?.trainingPhaseId) ? scheduler.trainingPhaseId : "training_phase_garrison";
  const fallbackPhase = registries.trainingPhases.has(fallbackPhaseId) ? registries.trainingPhases.get(fallbackPhaseId) : null;
  const fallbackTemplateId = fallbackPhase?.scheduleTemplateId ?? "schedule_garrison_cycle";
  for (const record of Object.values(worldState.entities?.scheduleRecords ?? {})) {
    if (registries.scheduleTemplates.has(record.sourceTemplateId)) continue;
    const recordPhase = record.trainingPhaseId && registries.trainingPhases.has(record.trainingPhaseId) ? registries.trainingPhases.get(record.trainingPhaseId) : fallbackPhase;
    record.legacySourceTemplateId ??= record.sourceTemplateId ?? null;
    record.sourceTemplateId = recordPhase?.scheduleTemplateId ?? fallbackTemplateId;
    record.schemaVersion = Math.max(2, record.schemaVersion ?? 1);
  }
  return worldState;
}

function repairLegacyBilletRankViolations(worldState) {
  const people = worldState.entities?.people ?? {};
  const billets = worldState.entities?.billets ?? {};
  for (const person of Object.values(people)) {
    const billet = billets[person.affiliation?.billetId];
    if (!billet || !registries.billets.has(billet.definitionId) || !registries.ranks.has(person.affiliation?.rankId)) continue;
    const billetDef = registries.billets.get(billet.definitionId);
    const currentRank = registries.ranks.get(person.affiliation.rankId);
    if (currentRank.hierarchyLevel >= billetDef.minimumRankLevel) continue;

    const replacementRank = registries.ranks.values()
      .filter(rank => rank.branchId === person.affiliation.branchId && rank.category === currentRank.category && rank.hierarchyLevel >= billetDef.minimumRankLevel)
      .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel || a.id.localeCompare(b.id))[0];
    if (!replacementRank) continue;

    person.affiliation.rankId = replacementRank.id;
  }
  return worldState;
}

function repairLegacyAffiliationFields(worldState) {
  const generation = worldState.world?.generation;
  const profile = generation?.generationProfileId && registries.generationProfiles.has(generation.generationProfileId)
    ? registries.generationProfiles.get(generation.generationProfileId)
    : null;
  const scenario = generation?.scenarioId && registries.careerStartScenarios.has(generation.scenarioId)
    ? registries.careerStartScenarios.get(generation.scenarioId)
    : null;

  for (const person of Object.values(worldState.entities?.people ?? {})) {
    person.affiliation ??= {};
    const service = worldState.entities?.serviceRecords?.[person.serviceRecordId] ?? null;
    const billet = worldState.entities?.billets?.[person.affiliation.billetId] ?? null;
    const mappedSpecialtyId = billet ? profile?.billetSpecialtyIdsByDefinitionId?.[billet.definitionId] : null;

    if (!registries.components.has(person.affiliation.componentId)) {
      person.affiliation.componentId = registries.components.has(service?.componentId)
        ? service.componentId
        : (scenario?.componentId && registries.components.has(scenario.componentId) ? scenario.componentId : "component_active");
    }
    if (!registries.specialties.has(person.affiliation.specialtyId)) {
      person.affiliation.specialtyId = mappedSpecialtyId && registries.specialties.has(mappedSpecialtyId)
        ? mappedSpecialtyId
        : (registries.specialties.has(service?.specialtyId) ? service.specialtyId : scenario?.specialtyId);
    }

    if (service) {
      service.componentId = registries.components.has(service.componentId) ? service.componentId : person.affiliation.componentId;
      service.specialtyId = registries.specialties.has(service.specialtyId) ? service.specialtyId : person.affiliation.specialtyId;
      service.branchId = registries.branches.has(service.branchId) ? service.branchId : person.affiliation.branchId;
    }
  }
  return worldState;
}

function roleToBilletDefinition(roleId) {
  const map = {
    role_squad_leader: "billet_squad_leader",
    role_team_leader: "billet_team_leader",
    role_grenadier: "billet_grenadier",
    role_automatic_rifleman: "billet_automatic_rifleman",
    role_rifleman: "billet_rifleman"
  };
  return map[roleId] ?? "billet_rifleman";
}

function migrateWorldV3ToV4(worldState) {
  const next = structuredClone(worldState);
  const oldUnit = next.entities.units?.unit_sq_001;
  const oldSlots = next.entities.unitSlots ?? {};

  next.schemaVersion = 4;
  next.gameVersion = "0.2.0.1";
  next.entities.billets = {};

  for (const slot of Object.values(oldSlots)) {
    const billetId = slot.id === "slot_player" ? "billet_player" : `billet_from_${slot.id}`;
    next.entities.billets[billetId] = {
      id: billetId,
      schemaVersion: 1,
      unitId: slot.unitId,
      definitionId: roleToBilletDefinition(slot.roleId),
      assignedPersonId: slot.assignedPersonId,
      status: slot.status
    };
    if (slot.assignedPersonId && next.entities.people[slot.assignedPersonId]) {
      const person = next.entities.people[slot.assignedPersonId];
      person.affiliation.billetId = billetId;
      delete person.affiliation.roleId;
    }
  }
  delete next.entities.unitSlots;

  next.entities.units = {
    unit_company_001: {
      id: "unit_company_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_company",
      nationId: "nation_demo", branchId: "branch_army", echelonId: "echelon_company",
      name: "Alpha Company", parentUnitId: null, childUnitIds: ["unit_platoon_001"],
      condition: structuredClone(oldUnit?.condition ?? { readiness: 84, morale: 78, cohesion: 81, supply: 92 })
    },
    unit_platoon_001: {
      id: "unit_platoon_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_platoon",
      nationId: "nation_demo", branchId: "branch_army", echelonId: "echelon_platoon",
      name: "1st Platoon", parentUnitId: "unit_company_001", childUnitIds: ["unit_sq_001"],
      condition: structuredClone(oldUnit?.condition ?? { readiness: 84, morale: 78, cohesion: 81, supply: 92 })
    },
    unit_sq_001: {
      id: "unit_sq_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_squad",
      nationId: oldUnit?.nationId ?? "nation_demo", branchId: oldUnit?.branchId ?? "branch_army",
      echelonId: "echelon_squad", name: oldUnit?.name ?? "2nd Squad",
      parentUnitId: "unit_platoon_001", childUnitIds: [],
      condition: structuredClone(oldUnit?.condition ?? { readiness: 84, morale: 78, cohesion: 81, supply: 92 })
    }
  };

  for (const record of Object.values(next.entities.assignmentRecords ?? {})) {
    if (!record.billetId) {
      const person = next.entities.people[record.personId];
      record.schemaVersion = 2;
      record.billetId = person?.affiliation?.billetId ?? null;
      delete record.roleId;
    }
  }

  return next;
}

function migrateWorldV4ToV5(worldState) {
  const next = structuredClone(worldState);
  next.schemaVersion = 5;
  next.gameVersion = "0.2.1";
  next.entities.orderRecords = next.entities.orderRecords ?? {};
  return next;
}


function addMonthsIso(isoDate, months) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

function migrateWorldV5ToV6(worldState) {
  const next = structuredClone(worldState);
  next.schemaVersion = 6;
  next.gameVersion = "0.3.0";
  next.entities.contractRecords = next.entities.contractRecords ?? {};
  next.entities.servicePeriodRecords = next.entities.servicePeriodRecords ?? {};
  next.entities.reenlistmentOfferRecords = next.entities.reenlistmentOfferRecords ?? {};
  next.entities.careerChangeRequestRecords = next.entities.careerChangeRequestRecords ?? {};
  next.entities.interServiceTransferRecords = next.entities.interServiceTransferRecords ?? {};

  for (const person of Object.values(next.entities.people ?? {})) {
    person.schemaVersion = Math.max(person.schemaVersion ?? 1, 3);
    person.affiliation.componentId = person.affiliation.componentId ?? "component_active";
    person.affiliation.specialtyId = person.affiliation.specialtyId ?? "specialty_army_11b";
    person.career.bonusEarnings = person.career.bonusEarnings ?? 0;
    const service = next.entities.serviceRecords?.[person.serviceRecordId];
    if (!service) continue;
    service.schemaVersion = 2;
    service.branchId = service.branchId ?? person.affiliation.branchId;
    service.componentId = service.componentId ?? person.affiliation.componentId;
    service.specialtyId = service.specialtyId ?? person.affiliation.specialtyId;
    service.servicePeriodIds = service.servicePeriodIds ?? [];
    if (!service.servicePeriodIds.length) {
      const periodId = `period_migrated_${person.id}`;
      next.entities.servicePeriodRecords[periodId] = { id: periodId, schemaVersion: 1, personId: person.id, branchId: service.branchId, componentId: service.componentId, specialtyId: service.specialtyId, startDate: service.entryDate ?? person.career.enlistmentDate, endDate: service.separationDate ?? null, status: service.serviceStatus === "active" ? "active" : "closed" };
      service.servicePeriodIds.push(periodId);
    }
    if (person.id === next.playerPersonId && !service.currentContractId) {
      const contractId = `contract_migrated_${person.id}`;
      const startDate = service.entryDate ?? person.career.enlistmentDate ?? next.world.date;
      next.entities.contractRecords[contractId] = { id: contractId, schemaVersion: 1, personId: person.id, contractDefinitionId: "contract_army_4y", branchId: service.branchId, componentId: service.componentId, specialtyId: service.specialtyId, startDate, endDate: addMonthsIso(startDate, 48), termMonths: 48, bonus: 0, type: "legacy_migration", status: "active" };
      service.currentContractId = contractId;
    } else {
      service.currentContractId = service.currentContractId ?? null;
    }
  }
  return next;
}



function removeGeneratedPerson(state, personId) {
  const person = state.entities.people?.[personId];
  if (!person) return;
  if (person.loadoutId) delete state.entities.loadouts?.[person.loadoutId];
  if (person.serviceRecordId) delete state.entities.serviceRecords?.[person.serviceRecordId];
  for (const [id, instance] of Object.entries(state.entities.equipmentInstances ?? {})) {
    if (instance.ownerPersonId === personId) delete state.entities.equipmentInstances[id];
  }
  for (const [collectionName, collection] of Object.entries(state.entities ?? {})) {
    if (["people","billets","units","loadouts","serviceRecords","equipmentInstances"].includes(collectionName)) continue;
    for (const [id, record] of Object.entries(collection ?? {})) {
      if (record && typeof record === "object" && Object.values(record).includes(personId)) delete collection[id];
    }
  }
  delete state.entities.people[personId];
}

function repairLegacyPlayerSquadDuplicates(state) {
  const billets = Object.values(state.entities.billets ?? {}).filter(b => b.unitId === "unit_sq_001");
  const hasLegacyMigratedBillets = billets.some(b => b.id.startsWith("billet_from_"));
  if (!hasLegacyMigratedBillets || billets.length <= 9) return;

  // v0.3.1 added billet_1..8 and pers_org_* NPCs on top of an already complete
  // migrated squad. Remove only those generated additions; preserve the legacy
  // people, player billet, history, and all user career data.
  for (let i = 1; i <= 8; i++) {
    const billetId = `billet_${i}`;
    const billet = state.entities.billets?.[billetId];
    if (!billet || billet.unitId !== "unit_sq_001") continue;
    const generatedPersonId = billet.assignedPersonId;
    if (generatedPersonId?.startsWith("pers_org_")) removeGeneratedPerson(state, generatedPersonId);
    delete state.entities.billets[billetId];
  }
}




function migrateWorldV12ToV13(worldState) {
  const next = structuredClone(worldState);
  next.entities.unitTrainingProfiles ??= {};
  next.entities.scheduleRecords ??= {};
  next.entities.opportunityRecords ??= {};
  next.entities.objectiveRecords ??= {};
  next.world ??= {};
  next.world.scheduler ??= null;
  const scenario = next.world?.generation?.scenarioId && registries.careerStartScenarios.has(next.world.generation.scenarioId) ? registries.careerStartScenarios.get(next.world.generation.scenarioId) : null;
  const readinessModelId = scenario?.readinessModelId ?? registries.readinessModels.values()[0]?.id;
  for (const unit of Object.values(next.entities.units ?? {})) unit.readinessModelId ??= readinessModelId;
  initializeUnitTrainingProfiles(next, readinessModelId);
  if (next.playerPersonId) {
    const person = next.entities.people?.[next.playerPersonId];
    if (person?.affiliation?.unitId && !Object.values(next.entities.objectiveRecords).some(record => record.personId === next.playerPersonId)) seedCareerGameplayRecords(next, registries, next.playerPersonId, person.affiliation.unitId);
  }
  next.schemaVersion = 13;
  next.gameVersion = "0.4.1";
  return next;
}

function migrateWorldV13ToV14(worldState) {
  const next=structuredClone(worldState);
  repairLegacyScheduleTemplateIds(next);
  next.entities.unitEventRecords ??= {};
  next.entities.unitReadinessSnapshots ??= {};
  next.world ??= {}; next.world.scheduler ??= {};
  if (next.playerPersonId) syncSimulationTiersForPlayerUnit(next,next.playerPersonId);
  const person=next.entities.people?.[next.playerPersonId];
  const currentTemplate=next.world.scheduler?.scheduleTemplateId;
  if (person?.affiliation?.unitId && (!next.world.scheduler.trainingPhaseId || currentTemplate === "schedule_standard_training_cycle")) {
    setTrainingPhaseInDraft(next,registries,"training_phase_garrison",{clearFutureTemplateRecords:true});
    ensureScheduleCoverageInDraft(next,registries,next.playerPersonId,person.affiliation.unitId);
  }
  for (const profile of Object.values(next.entities.unitTrainingProfiles ?? {})) profile.readinessHistory ??= [];
  next.schemaVersion=14; next.gameVersion="0.4.1.2";
  return next;
}


function migrateWorldV14ToV15(worldState) {
  const next=structuredClone(worldState);
  next.entities.militaryEducationRecords ??= {};

  // Backfill school history from durable qualification records created by earlier builds.
  for (const record of Object.values(next.entities.qualificationRecords ?? {})) {
    if (!record.schoolId || !registries.schools.has(record.schoolId)) continue;
    const exists=Object.values(next.entities.militaryEducationRecords).some(edu=>edu.personId===record.personId&&edu.schoolId===record.schoolId&&edu.status==="graduated");
    if (exists) continue;
    const id=`edu_migrated_${record.id}`;
    next.entities.militaryEducationRecords[id]={id,schemaVersion:1,personId:record.personId,schoolId:record.schoolId,status:"graduated",startDate:null,completedDate:record.completedDate??next.world.date,sourceType:"legacy_qualification_backfill",sourceQualificationRecordId:record.id};
  }

  // Existing generated NPCs receive deterministic, rank/TIS-consistent prior-service records.
  // The player is deliberately excluded by the seeding service.
  seedPriorServiceHistories(next,registries);
  next.schemaVersion=15;
  next.gameVersion="0.4.2.1";
  return next;
}


function migrateWorldV15ToV16(worldState) {
  const next=structuredClone(worldState);
  next.entities.personalityProfiles ??= {};
  next.entities.relationshipMemoryRecords ??= {};
  for (const relationship of Object.values(next.entities.relationshipRecords ?? {})) {
    relationship.schemaVersion=Math.max(2,relationship.schemaVersion??1);
    relationship.rapport=Number.isFinite(Number(relationship.rapport))?Number(relationship.rapport):0;
  }
  seedPersonalityProfiles(next,registries);
  next.world ??={};
  next.world.livingCareer ??={version:1,lastPlayerEventElapsedDay:-999};
  next.schemaVersion=16;
  next.gameVersion="0.4.3.2";
  return next;
}

function migrateWorldV11ToV12(worldState) {
  const next = structuredClone(worldState);
  next.entities.skillProfiles ??= {};
  next.entities.activityRecords ??= {};
  next.entities.performanceRecords ??= {};
  next.entities.gameplayEventRecords ??= {};
  const skillIds = ["skill_fitness","skill_marksmanship","skill_fieldcraft","skill_mos_proficiency","skill_leadership"];
  for (const person of Object.values(next.entities.people ?? {})) {
    const profileId = `skills_${person.id}`;
    if (next.entities.skillProfiles[profileId]) continue;
    const rankId = String(person.affiliation?.rankId ?? "");
    const levelMatch = /_(?:e|o)(\d+)$/.exec(rankId);
    const rankLevel = levelMatch ? Number(levelMatch[1]) : 1;
    const base = Math.max(20, Math.min(55, 22 + rankLevel * 3));
    next.entities.skillProfiles[profileId] = { id: profileId, schemaVersion: 1, personId: person.id, values: Object.fromEntries(skillIds.map(id => [id, base])) };
  }
  next.schemaVersion = 12;
  next.gameVersion = "0.4.0";
  return next;
}

function migrateWorldV10ToV11(worldState) {
  const next = structuredClone(worldState);
  next.world ??= {};
  next.world.generation ??= {
    generatorVersion: 0,
    scenarioId: "career_start_army_active_11b_new_enlistee",
    generationProfileId: "generation_profile_army_infantry_company_v1",
    startingBilletId: next.playerPersonId ? (next.entities.people?.[next.playerPersonId]?.affiliation?.billetId ?? null) : (Object.values(next.entities.billets ?? {}).find(b => b.status === "vacant" && b.definitionId === "billet_rifleman")?.id ?? null),
    generatedAtWorldDate: next.world.date ?? null,
    legacyWorld: true
  };
  next.schemaVersion = 11;
  next.gameVersion = "0.3.2.3";
  return next;
}

function migrateWorldV9ToV10(worldState) {
  const next = structuredClone(worldState);
  next.entities.personnelActionRecords ??= {};
  next.entities.replacementRequestRecords ??= {};
  next.schemaVersion = 10;
  next.gameVersion = "0.3.2";
  return next;
}

function migrateWorldV8ToV9(worldState) {
  const next = structuredClone(worldState);
  // Repair the pathological v0.3.1 surname blocks for generated organization NPCs.
  // Player identity and any non-generated personnel are intentionally untouched.
  for (const person of Object.values(next.entities.people ?? {})) {
    const match = /^pers_org_(\d+)$/.exec(person.id);
    if (!match) continue;
    person.identity = npcIdentityForIndex(Number(match[1]));
  }
  next.schemaVersion = 9;
  next.gameVersion = "0.3.1.2";
  return next;
}

function migrateWorldV7ToV8(worldState) {
  const next = structuredClone(worldState);
  repairLegacyPlayerSquadDuplicates(next);
  ensureInfantryCompanyStructure(next);
  next.schemaVersion = 8;
  next.gameVersion = "0.3.1.1";
  return next;
}

function migrateWorldV6ToV7(worldState) {
  const next = structuredClone(worldState);
  next.schemaVersion = 7;
  next.gameVersion = "0.3.1";
  ensureInfantryCompanyStructure(next);
  return next;
}

function migrateWorldV2ToV3(worldState) {
  const next = structuredClone(worldState);
  next.schemaVersion = 3;
  next.gameVersion = "0.1.2";
  next.world.seed = Number.isInteger(next.world.seed) ? next.world.seed : 0x4f1bbcdc;
  next.world.rngState = Number.isInteger(next.world.rngState) ? next.world.rngState : next.world.seed;
  next.world.nextEntitySequence = Number.isInteger(next.world.nextEntitySequence) ? next.world.nextEntitySequence : 1000;
  next.world.clock = next.world.clock ?? { elapsedDays: 0, paused: true, speed: 1 };
  next.entities.notificationRecords = next.entities.notificationRecords ?? {};
  next.entities.actionRecords = next.entities.actionRecords ?? {};
  return next;
}


function backfillArmyServiceRibbon(worldState) {
  const personId=worldState.playerPersonId;
  const person=worldState.entities?.people?.[personId];
  if(!person || person.affiliation?.branchId!=="branch_army") return worldState;
  worldState.entities.awardRecords ??= {};
  const awards=Object.values(worldState.entities.awardRecords);
  if(awards.some(record=>record.personId===personId&&record.awardId==="award_army_service_ribbon")) return worldState;

  // Upgrade the retired pre-v0.4.3 representation in place so prestige/history are not duplicated.
  const legacy=awards.find(record=>record.personId===personId&&record.awardId==="award_basic_training");
  if(legacy){
    legacy.awardId="award_army_service_ribbon";
    legacy.schemaVersion=Math.max(3,legacy.schemaVersion??1);
    legacy.sourceType=legacy.sourceType??"legacy_initial_entry_training";
    legacy.reason=legacy.reason??"Initial entry training completed before assignment to the operational unit.";
    return worldState;
  }

  // Player careers in the current Army scenario enter the operational unit only after IET.
  // A durable enlistment event + initial assignment is therefore the canonical legacy evidence.
  const enlistment=Object.values(worldState.entities.careerEvents??{}).find(record=>record.personId===personId&&record.type==="enlistment");
  const assignment=Object.values(worldState.entities.assignmentRecords??{}).find(record=>record.personId===personId&&record.reason==="initial_assignment");
  if(!enlistment || !assignment) return worldState;

  const id=createEntityId(worldState,"award");
  worldState.entities.awardRecords[id]={
    id,schemaVersion:3,personId,awardId:"award_army_service_ribbon",
    earnedDate:enlistment.date??assignment.startDate??person.career?.enlistmentDate??worldState.world?.date,
    sourceType:"legacy_initial_entry_training_backfill",sourceId:enlistment.id,
    reason:"Initial entry training completed before assignment to the operational unit."
  };
  const def=registries.awards.get("award_army_service_ribbon");
  person.career ??= {};
  person.career.prestige=(person.career.prestige??0)+(def?.prestigeValue??0);
  return worldState;
}


function normalizeCareerBoundaryHotfix(worldState) {
  const contracts = Object.values(worldState.entities?.contractRecords ?? {});
  for (const person of Object.values(worldState.entities?.people ?? {})) {
    const service = worldState.entities?.serviceRecords?.[person.serviceRecordId];
    if (!service || service.personId !== person.id) continue;
    const current = service.currentContractId ? worldState.entities.contractRecords?.[service.currentContractId] : null;
    // v0.4.3.3.1 made an accepted future reenlistment active immediately and
    // prematurely completed the still-effective contract. Restore the intended
    // current/pending relationship when that save is loaded before the effective date.
    if (current?.type === "reenlistment" && current.status === "active" && current.startDate > worldState.world.date) {
      const predecessor = contracts
        .filter(record => record.personId === person.id && record.id !== current.id && record.endDate === current.startDate && record.status === "completed")
        .sort((a,b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id))[0];
      if (predecessor) {
        current.status = "pending";
        predecessor.status = "active";
        service.currentContractId = predecessor.id;
      }
    }
    // bonusEarnings is cumulative career accounting; accepted contracts are durable evidence.
    const contractedBonuses = contracts
      .filter(record => record.personId === person.id)
      .reduce((total, record) => total + Math.max(0, Number(record.bonus ?? 0) || 0), 0);
    person.career ??= {};
    person.career.bonusEarnings = Math.max(Number(person.career.bonusEarnings ?? 0) || 0, contractedBonuses);
    if (["separated","retired","deceased"].includes(person.condition?.status)) {
      for (const schedule of Object.values(worldState.entities?.scheduleRecords ?? {})) {
        if (schedule.personId === person.id && ["scheduled","in_progress"].includes(schedule.status)) { schedule.status="cancelled"; schedule.cancelledDate ??= worldState.world.date; schedule.cancellationReason ??= "service_separation"; }
      }
      for (const opportunity of Object.values(worldState.entities?.opportunityRecords ?? {})) {
        if (opportunity.personId === person.id && ["open","accepted","in_progress"].includes(opportunity.status)) {
          opportunity.status="expired"; opportunity.expiredDate ??= worldState.world.date; opportunity.expirationReason ??= "service_separation";
          const order=opportunity.orderId ? worldState.entities?.orderRecords?.[opportunity.orderId] : null; if(order && ["pending","executing"].includes(order.status)) order.status="cancelled";
        }
      }
    }
  }
  return worldState;
}

export function migratePayload(payload) {
  let next = structuredClone(payload);

  if (next.saveFormatVersion === 2) {
    next = {
      saveFormatVersion: 3,
      saveId: next.saveId ?? null,
      createdAt: next.savedAt ?? new Date().toISOString(),
      savedAt: next.savedAt ?? new Date().toISOString(),
      gameVersion: "0.1.2",
      worldState: migrateWorldV2ToV3(next.worldState)
    };
  }

  if (next.saveFormatVersion !== CURRENT_SAVE_FORMAT_VERSION) {
    throw new Error(`Unsupported save format: ${next.saveFormatVersion}`);
  }

  if (next.worldState.schemaVersion === 2) next.worldState = migrateWorldV2ToV3(next.worldState);
  if (next.worldState.schemaVersion === 3) next.worldState = migrateWorldV3ToV4(next.worldState);
  if (next.worldState.schemaVersion === 4) next.worldState = migrateWorldV4ToV5(next.worldState);
  if (next.worldState.schemaVersion === 5) next.worldState = migrateWorldV5ToV6(next.worldState);
  if (next.worldState.schemaVersion === 6) next.worldState = migrateWorldV6ToV7(next.worldState);
  if (next.worldState.schemaVersion === 7) next.worldState = migrateWorldV7ToV8(next.worldState);
  if (next.worldState.schemaVersion === 8) next.worldState = migrateWorldV8ToV9(next.worldState);
  if (next.worldState.schemaVersion === 9) next.worldState = migrateWorldV9ToV10(next.worldState);
  if (next.worldState.schemaVersion === 10) next.worldState = migrateWorldV10ToV11(next.worldState);
  if (next.worldState.schemaVersion === 11) next.worldState = migrateWorldV11ToV12(next.worldState);
  if (next.worldState.schemaVersion === 12) next.worldState = migrateWorldV12ToV13(next.worldState);
  if (next.worldState.schemaVersion === 13) next.worldState = migrateWorldV13ToV14(next.worldState);
  if (next.worldState.schemaVersion === 14) next.worldState = migrateWorldV14ToV15(next.worldState);
  if (next.worldState.schemaVersion === 15) next.worldState = migrateWorldV15ToV16(next.worldState);

  if (next.worldState.schemaVersion !== CURRENT_WORLD_SCHEMA_VERSION) {
    throw new Error(`Unsupported world schema: ${next.worldState.schemaVersion}`);
  }

  next.worldState.entities.qualificationAttemptRecords ??= {};
  next.worldState.entities.militaryEducationRecords ??= {};
  next.worldState.entities.personalityProfiles ??= {};
  next.worldState.entities.relationshipMemoryRecords ??= {};
  for (const relationship of Object.values(next.worldState.entities.relationshipRecords ?? {})) relationship.rapport ??= 0;
  seedPersonalityProfiles(next.worldState,registries);
  repairLegacyAffiliationFields(next.worldState);
  repairLegacyBilletRankViolations(next.worldState);
  repairLegacyScheduleTemplateIds(next.worldState);
  normalizeScheduleAvailabilityFlags(next.worldState);
  backfillArmyServiceRibbon(next.worldState);
  normalizeCareerBoundaryHotfix(next.worldState);
  ensureNamedInfantryFormation(next.worldState);
  initializeUnitTrainingProfiles(next.worldState);
  next.gameVersion = "0.4.3.7";
  next.worldState.gameVersion = "0.4.3.7";
  return next;
}
