export const CURRENT_SAVE_FORMAT_VERSION = 3;
export const CURRENT_WORLD_SCHEMA_VERSION = 6;

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

  if (next.worldState.schemaVersion !== CURRENT_WORLD_SCHEMA_VERSION) {
    throw new Error(`Unsupported world schema: ${next.worldState.schemaVersion}`);
  }

  next.gameVersion = "0.3.0";
  next.worldState.gameVersion = "0.3.0";
  return next;
}
