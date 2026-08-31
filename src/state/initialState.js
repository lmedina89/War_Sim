const NPC_SEED = [
  ["pers_1002", "Marcus", "Hill", "rank_army_e5", "role_squad_leader", 100, 86, "weapon_carbine"],
  ["pers_1003", "Daniel", "Reyes", "rank_army_e4", "role_team_leader", 96, 78, "weapon_service_rifle"],
  ["pers_1004", "Evan", "Brooks", "rank_army_e3", "role_grenadier", 91, 72, "weapon_service_rifle"],
  ["pers_1005", "Noah", "Carter", "rank_army_e3", "role_automatic_rifleman", 100, 80, "weapon_auto_rifle"],
  ["pers_1006", "Liam", "Walker", "rank_army_e2", "role_rifleman", 89, 74, "weapon_service_rifle"],
  ["pers_1007", "Mason", "Clark", "rank_army_e2", "role_rifleman", 98, 76, "weapon_service_rifle"],
  ["pers_1008", "Caleb", "Young", "rank_army_e3", "role_rifleman", 100, 84, "weapon_service_rifle"],
  ["pers_1009", "Jordan", "Price", "rank_army_e2", "role_rifleman", 94, 71, "weapon_service_rifle"]
];

function makeNpc([id, firstName, lastName, rankId, roleId, health, morale, equipmentDefinitionId], index) {
  return {
    person: {
      id, schemaVersion: 2,
      identity: { firstName, lastName, displayName: `${firstName} ${lastName}` },
      affiliation: { nationId: "nation_demo", branchId: "branch_army", unitId: "unit_sq_001", roleId, rankId },
      career: { enlistmentDate: "2042-01-15", experience: 900 + index * 175, prestige: 25 + index * 4 },
      condition: { health, morale, fatigue: 12 + index * 2, readiness: Math.max(65, 92 - index), status: "active" },
      traitIds: ["trait_steady"], loadoutId: `loadout_${id}`, serviceRecordId: `service_${id}`, simulationTier: 1
    },
    serviceRecord: { id: `service_${id}`, schemaVersion: 1, personId: id, serviceStatus: "active", entryDate: "2042-01-15", separationDate: null },
    equipment: { id: `eq_${id}_primary`, schemaVersion: 1, definitionId: equipmentDefinitionId, ownerPersonId: id, condition: 100, upgradeIds: [] },
    loadout: { id: `loadout_${id}`, schemaVersion: 2, ownerPersonId: id, slots: { primaryWeaponInstanceId: `eq_${id}_primary` } }
  };
}

export function createInitialWorldState({ seed = 0x4f1bbcdc } = {}) {
  const people = {}, serviceRecords = {}, equipmentInstances = {}, loadouts = {};
  const unitSlots = {
    slot_player: { id: "slot_player", schemaVersion: 1, unitId: "unit_sq_001", roleId: "role_rifleman", assignedPersonId: null, status: "vacant" }
  };

  NPC_SEED.forEach((seedRow, index) => {
    const built = makeNpc(seedRow, index);
    people[built.person.id] = built.person;
    serviceRecords[built.serviceRecord.id] = built.serviceRecord;
    equipmentInstances[built.equipment.id] = built.equipment;
    loadouts[built.loadout.id] = built.loadout;
    unitSlots[`slot_${index + 1}`] = { id: `slot_${index + 1}`, schemaVersion: 1, unitId: "unit_sq_001", roleId: built.person.affiliation.roleId, assignedPersonId: built.person.id, status: "filled" };
  });

  return {
    schemaVersion: 3,
    gameVersion: "0.1.2",
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
        unit_sq_001: {
          id: "unit_sq_001", schemaVersion: 1, definitionId: "unitdef_infantry_squad", nationId: "nation_demo", branchId: "branch_army",
          name: "2nd Squad", parentUnitId: null, commanderId: "pers_1002", slotIds: Object.keys(unitSlots),
          condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }, locationId: "location_demo"
        }
      },
      unitSlots, serviceRecords, loadouts, equipmentInstances,
      careerEvents: {}, assignmentRecords: {}, promotionRecords: {}, awardRecords: {}, qualificationRecords: {}, deploymentRecords: {}, casualtyRecords: {}, memorialRecords: {}, relationshipRecords: {},
      notificationRecords: {}, actionRecords: {}
    }
  };
}
