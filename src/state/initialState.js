import { ensureInfantryCompanyStructure } from "../services/organizationSeed.js";
const NPC_SEED = [
  ["pers_1002", "Marcus", "Hill", "rank_army_e5", "billet_squad_leader", 100, 86, "weapon_carbine"],
  ["pers_1003", "Daniel", "Reyes", "rank_army_e4", "billet_team_leader", 96, 78, "weapon_service_rifle"],
  ["pers_1004", "Evan", "Brooks", "rank_army_e3", "billet_grenadier", 91, 72, "weapon_service_rifle"],
  ["pers_1005", "Noah", "Carter", "rank_army_e3", "billet_automatic_rifleman", 100, 80, "weapon_auto_rifle"],
  ["pers_1006", "Liam", "Walker", "rank_army_e2", "billet_rifleman", 89, 74, "weapon_service_rifle"],
  ["pers_1007", "Mason", "Clark", "rank_army_e2", "billet_rifleman", 98, 76, "weapon_service_rifle"],
  ["pers_1008", "Caleb", "Young", "rank_army_e3", "billet_rifleman", 100, 84, "weapon_service_rifle"],
  ["pers_1009", "Jordan", "Price", "rank_army_e2", "billet_rifleman", 94, 71, "weapon_service_rifle"]
];

function makeNpc([id, firstName, lastName, rankId, billetDefinitionId, health, morale, equipmentDefinitionId], index) {
  return {
    person: {
      id,
      schemaVersion: 2,
      identity: { firstName, lastName, displayName: `${firstName} ${lastName}` },
      affiliation: {
        nationId: "nation_demo",
        branchId: "branch_army",
        unitId: "unit_sq_001",
        billetId: `billet_${index + 1}`,
        rankId
      },
      career: { enlistmentDate: "2042-01-15", experience: 900 + index * 175, prestige: 25 + index * 4 },
      condition: { health, morale, fatigue: 12 + index * 2, readiness: Math.max(65, 92 - index), status: "active" },
      traitIds: ["trait_steady"],
      loadoutId: `loadout_${id}`,
      serviceRecordId: `service_${id}`,
      simulationTier: 1
    },
    billet: {
      id: `billet_${index + 1}`,
      schemaVersion: 1,
      unitId: "unit_sq_001",
      definitionId: billetDefinitionId,
      assignedPersonId: id,
      status: "filled"
    },
    serviceRecord: {
      id: `service_${id}`,
      schemaVersion: 2,
      personId: id,
      serviceStatus: "active",
      entryDate: "2042-01-15",
      separationDate: null,
      branchId: "branch_army",
      componentId: "component_active",
      specialtyId: "specialty_army_11b",
      currentContractId: null,
      servicePeriodIds: []
    },
    equipment: {
      id: `eq_${id}_primary`,
      schemaVersion: 1,
      definitionId: equipmentDefinitionId,
      ownerPersonId: id,
      condition: 100,
      upgradeIds: []
    },
    loadout: {
      id: `loadout_${id}`,
      schemaVersion: 2,
      ownerPersonId: id,
      slots: { primaryWeaponInstanceId: `eq_${id}_primary` }
    }
  };
}

export function createInitialWorldState({ seed = 0x4f1bbcdc } = {}) {
  const people = {};
  const billets = {
    billet_player: {
      id: "billet_player",
      schemaVersion: 1,
      unitId: "unit_sq_001",
      definitionId: "billet_rifleman",
      assignedPersonId: null,
      status: "vacant"
    }
  };
  const serviceRecords = {};
  const equipmentInstances = {};
  const loadouts = {};

  NPC_SEED.forEach((seedRow, index) => {
    const built = makeNpc(seedRow, index);
    people[built.person.id] = built.person;
    billets[built.billet.id] = built.billet;
    serviceRecords[built.serviceRecord.id] = built.serviceRecord;
    equipmentInstances[built.equipment.id] = built.equipment;
    loadouts[built.loadout.id] = built.loadout;
  });

  const state = {
    schemaVersion: 10,
    gameVersion: "0.3.2",
    playerPersonId: null,
    world: {
      date: "2046-02-10",
      seed: seed >>> 0,
      rngState: seed >>> 0,
      nextEntitySequence: 1,
      clock: { elapsedDays: 0, paused: true, speed: 1 },
      nationIds: ["nation_demo"],
      careerStartUnitByBranchId: { branch_army: "unit_sq_001" }
    },
    entities: {
      people,
      units: {
        unit_company_001: {
          id: "unit_company_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_company",
          nationId: "nation_demo", branchId: "branch_army", echelonId: "echelon_company",
          name: "Alpha Company", parentUnitId: null, childUnitIds: ["unit_platoon_001"],
          condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
        },
        unit_platoon_001: {
          id: "unit_platoon_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_platoon",
          nationId: "nation_demo", branchId: "branch_army", echelonId: "echelon_platoon",
          name: "1st Platoon", parentUnitId: "unit_company_001", childUnitIds: ["unit_sq_001"],
          condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
        },
        unit_sq_001: {
          id: "unit_sq_001", schemaVersion: 2, organizationDefinitionId: "orgdef_infantry_squad",
          nationId: "nation_demo", branchId: "branch_army", echelonId: "echelon_squad",
          name: "2nd Squad", parentUnitId: "unit_platoon_001", childUnitIds: [],
          condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
        }
      },
      billets,
      serviceRecords,
      loadouts,
      equipmentInstances,
      careerEvents: {},
      assignmentRecords: {},
      promotionRecords: {},
      awardRecords: {},
      qualificationRecords: {},
      deploymentRecords: {},
      casualtyRecords: {},
      memorialRecords: {},
      relationshipRecords: {},
      notificationRecords: {},
      actionRecords: {},
      orderRecords: {},
      contractRecords: {},
      servicePeriodRecords: {},
      reenlistmentOfferRecords: {},
      careerChangeRequestRecords: {},
      interServiceTransferRecords: {},
      personnelActionRecords: {},
      replacementRequestRecords: {}
    }
  };
  return ensureInfantryCompanyStructure(state);
}
