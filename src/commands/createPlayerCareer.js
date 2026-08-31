import { createEntityId } from "../core/ids.js";
import { commandResult } from "../core/commandResult.js";
import { addMonthsIso } from "../services/dateMath.js";
import { recordAction, recordNotification } from "../services/recordServices.js";
import { createInitialWorldState } from "../state/initialState.js";

function normalizeName(value, label) {
  const normalized = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (normalized.length < 1 || normalized.length > 40) throw new Error(`${label} must be 1–40 characters.`);
  if(/[\u0000-\u001F\u007F]/u.test(normalized)) throw new Error(`${label} contains unsupported characters.`);
  return normalized;
}

export function createPlayerCareer(store, registries, input) {
  if (store.getState().playerPersonId) throw new Error("A player career already exists. Start a new career first.");

  const firstName = normalizeName(input.firstName, "First name"), lastName = normalizeName(input.lastName, "Last name");
  const branch = registries.branches.get(input.branchId), component = registries.components.get(input.componentId), specialty = registries.specialties.get(input.specialtyId), contractDef = registries.contracts.get(input.contractDefinitionId);
  if (!component.careerAvailable) throw new Error(`${component.name} careers are not enabled in this organization build yet.`);
  if (!specialty.careerAvailable) throw new Error(`${specialty.code} ${specialty.name} is defined but its unit/training pipeline is not enabled yet.`);
  if (component.branchId !== branch.id || specialty.branchId !== branch.id || contractDef.branchId !== branch.id) throw new Error("Career selections are not compatible.");

  const scenario = registries.careerStartScenarios.values().find(item => item.enabled && item.branchId === branch.id && item.componentId === component.id && item.specialtyId === specialty.id);
  if (!scenario) throw new Error("No enabled career-start scenario matches those selections.");
  if (!scenario.allowedContractDefinitionIds.includes(contractDef.id)) throw new Error(`${contractDef.name} is not allowed for ${scenario.name}.`);
  const requestedSeed = Number.isInteger(input.seed) ? (input.seed >>> 0) : (store.getState().world.seed >>> 0);
  const currentGeneration = store.getState().world.generation;
  if (store.getState().world.seed !== requestedSeed || currentGeneration?.scenarioId !== scenario.id) {
    store.replaceState(createInitialWorldState({ seed: requestedSeed, scenarioId: scenario.id }));
  }
  const state = store.getState();

  const rank = registries.ranks.get(scenario.startingRankId || branch.startingRankId), startingRole = registries.roles.get(specialty.startingRoleId || branch.startingRoleId);
  const unitId = state.world.careerStartUnitByBranchId[branch.id], unit = state.entities.units[unitId];
  if (!unit) throw new Error(`No starting unit is configured for ${branch.name}.`);
  const designatedStartingBilletId = state.world.generation?.startingBilletId;
  const unitBilletIds = store.getIndexes().billetsByUnitId?.get(unitId) ?? [];
  const billet = (designatedStartingBilletId ? state.entities.billets[designatedStartingBilletId] : null) ?? unitBilletIds.map(id => state.entities.billets[id]).find(candidate => candidate?.status === "vacant" && specialty.eligibleBilletDefinitionIds.includes(candidate.definitionId) && registries.billets.get(candidate.definitionId).roleId === startingRole.id);
  if (billet && (billet.status !== "vacant" || !scenario.eligibleStartingBilletDefinitionIds.includes(billet.definitionId))) throw new Error("Generated starting billet is not valid for this career-start scenario.");
  if (!billet) throw new Error(`No vacant ${startingRole.name} billet exists in ${unit.name}.`);

  const startingSquadMateIds = [...(store.getIndexes().peopleByUnitId?.get(unitId) ?? [])];
  let personId, noticeId;
  store.mutate(draft => {
    personId = createEntityId(draft, "pers"); const serviceRecordId = createEntityId(draft, "service"), servicePeriodId = createEntityId(draft, "period"), contractId = createEntityId(draft, "contract"), loadoutId = createEntityId(draft, "loadout"), equipmentInstanceId = createEntityId(draft, "eq"), assignmentId = createEntityId(draft, "assign"), enlistmentEventId = createEntityId(draft, "career"), orderId = createEntityId(draft, "order");
    const bonus = Math.round((specialty.enlistmentBonusBase || 0) * contractDef.bonusMultiplier / 500) * 500, contractEndDate = addMonthsIso(draft.world.date, contractDef.termMonths);

    draft.playerPersonId = personId;
    draft.entities.people[personId] = { id: personId, schemaVersion: 3, identity: { firstName, lastName, displayName: `${firstName} ${lastName}` }, affiliation: { nationId: unit.nationId, branchId: branch.id, componentId: component.id, specialtyId: specialty.id, unitId, billetId: billet.id, rankId: rank.id }, career: { enlistmentDate: draft.world.date, experience: 0, prestige: 0, bonusEarnings: bonus }, condition: { health: 100, morale: 75, fatigue: 0, readiness: 70, status: "active" }, traitIds: [], loadoutId, serviceRecordId, simulationTier: 0 };
    draft.entities.serviceRecords[serviceRecordId] = { id: serviceRecordId, schemaVersion: 2, personId, serviceStatus: "active", entryDate: draft.world.date, separationDate: null, branchId: branch.id, componentId: component.id, specialtyId: specialty.id, currentContractId: contractId, servicePeriodIds: [servicePeriodId] };
    draft.entities.servicePeriodRecords[servicePeriodId] = { id: servicePeriodId, schemaVersion: 1, personId, branchId: branch.id, componentId: component.id, specialtyId: specialty.id, startDate: draft.world.date, endDate: null, status: "active" };
    draft.entities.contractRecords[contractId] = { id: contractId, schemaVersion: 1, personId, contractDefinitionId: contractDef.id, branchId: branch.id, componentId: component.id, specialtyId: specialty.id, startDate: draft.world.date, endDate: contractEndDate, termMonths: contractDef.termMonths, bonus, type: "initial_enlistment", status: "active" };
    draft.entities.equipmentInstances[equipmentInstanceId] = { id: equipmentInstanceId, schemaVersion: 1, definitionId: registries.billets.get(billet.definitionId).primaryEquipmentDefinitionId, ownerPersonId: personId, condition: 100, upgradeIds: [] };
    draft.entities.loadouts[loadoutId] = { id: loadoutId, schemaVersion: 2, ownerPersonId: personId, slots: { primaryWeaponInstanceId: equipmentInstanceId } };
    draft.entities.skillProfiles[`skills_${personId}`] = { id: `skills_${personId}`, schemaVersion: 1, personId, values: Object.fromEntries(registries.skills.values().map(skill => [skill.id, skill.id === "skill_fitness" ? 35 : 25])) };
    draft.entities.billets[billet.id].assignedPersonId = personId; draft.entities.billets[billet.id].status = "filled";
    draft.entities.assignmentRecords[assignmentId] = { id: assignmentId, schemaVersion: 2, personId, unitId, billetId: billet.id, startDate: draft.world.date, endDate: null, reason: "initial_assignment" };
    draft.entities.orderRecords[orderId] = { id: orderId, schemaVersion: 1, personId, type: "initial_assignment", status: "executed", issueDate: draft.world.date, effectiveDate: draft.world.date, unitId, billetId: billet.id, title: "Initial Assignment Orders", summary: `Assigned to ${unit.name} as ${registries.billets.get(billet.definitionId).name}.` };
    draft.entities.careerEvents[enlistmentEventId] = { id: enlistmentEventId, schemaVersion: 1, personId, type: "enlistment", date: draft.world.date, references: { branchId: branch.id, componentId: component.id, specialtyId: specialty.id, contractId, rankId: rank.id, unitId, billetId: billet.id } };
    for (const npcId of startingSquadMateIds) { const npc = draft.entities.people[npcId]; if (!npc) continue; const relationshipId = createEntityId(draft, "rel"); draft.entities.relationshipRecords[relationshipId] = { id: relationshipId, schemaVersion: 1, personAId: personId, personBId: npc.id, familiarity: 5, trust: 0, respect: 0, bond: 0, relationshipType: "squadmate", lastInteractionDate: draft.world.date }; }
    noticeId = recordNotification(draft, { personId, type: "career_started", title: "Career Started", message: `${firstName} ${lastName} enlisted as a ${specialty.code} ${specialty.name} on a ${contractDef.termMonths / 12}-year ${component.name} contract. Bonus: $${bonus.toLocaleString()}.`, priority: "normal", references: { branchId: branch.id, componentId: component.id, specialtyId: specialty.id, contractId, rankId: rank.id, unitId, billetId: billet.id } });
    recordAction(draft, { actorPersonId: personId, commandType: "create_player_career", payload: { branchId: branch.id, componentId: component.id, specialtyId: specialty.id, contractDefinitionId: contractDef.id, billetId: billet.id }, resultCode: "career_created" });
  }, ["people", "billets", "history", "equipment", "notifications", "actions", "orders", "career", "activities"]);
  return commandResult({ code: "career_created", message: "Career created.", data: { personId, billetId: billet.id }, notifications: [noticeId] });
}
