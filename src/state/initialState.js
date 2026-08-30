const squadMembers = [
  ["pers_player", "Alex", "Morgan", "rank_army_e1", "role_rifleman", 95, 82, "loadout_player"],
  ["pers_1002", "Marcus", "Hill", "rank_army_e5", "role_squad_leader", 100, 86, "loadout_1002"],
  ["pers_1003", "Daniel", "Reyes", "rank_army_e4", "role_team_leader", 96, 78, "loadout_1003"],
  ["pers_1004", "Evan", "Brooks", "rank_army_e3", "role_grenadier", 91, 72, "loadout_1004"],
  ["pers_1005", "Noah", "Carter", "rank_army_e3", "role_automatic_rifleman", 100, 80, "loadout_1005"],
  ["pers_1006", "Liam", "Walker", "rank_army_e2", "role_rifleman", 89, 74, "loadout_1006"],
  ["pers_1007", "Mason", "Clark", "rank_army_e2", "role_rifleman", 98, 76, "loadout_1007"],
  ["pers_1008", "Caleb", "Young", "rank_army_e3", "role_rifleman", 100, 84, "loadout_1008"],
  ["pers_1009", "Jordan", "Price", "rank_army_e2", "role_rifleman", 94, 71, "loadout_1009"]
];

const people = Object.fromEntries(
  squadMembers.map(([id, firstName, lastName, rankId, roleId, health, morale, loadoutId], index) => [
    id,
    {
      id,
      schemaVersion: 1,
      identity: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`
      },
      affiliation: {
        nationId: "nation_demo",
        branchId: "branch_army",
        unitId: "unit_sq_001",
        roleId,
        rankId
      },
      career: {
        enlistmentDate: index === 0 ? "2046-02-10" : "2043-01-15",
        experience: index === 0 ? 0 : 700 + index * 95,
        prestige: index === 0 ? 0 : 20 + index * 4
      },
      condition: {
        health,
        morale,
        fatigue: 10 + index * 2,
        readiness: Math.max(60, 90 - index),
        status: "active"
      },
      traitIds: index === 0 ? [] : ["trait_steady"],
      loadoutId,
      serviceRecordId: `service_${id}`
    }
  ])
);

const unitSlots = {};
squadMembers.forEach(([personId, , , , roleId], i) => {
  const slotId = `slot_${String(i + 1).padStart(2, "0")}`;
  unitSlots[slotId] = {
    id: slotId,
    schemaVersion: 1,
    unitId: "unit_sq_001",
    roleId,
    assignedPersonId: personId,
    status: "filled"
  };
});

const loadouts = {};
squadMembers.forEach(([personId, , , , roleId, , , loadoutId]) => {
  loadouts[loadoutId] = {
    id: loadoutId,
    schemaVersion: 1,
    ownerPersonId: personId,
    primaryEquipmentId: roleId === "role_automatic_rifleman"
      ? "weapon_auto_rifle"
      : roleId === "role_squad_leader"
        ? "weapon_carbine"
        : "weapon_service_rifle"
  };
});

export function createInitialWorldState() {
  return {
    schemaVersion: 1,
    gameVersion: "0.1.0",
    playerPersonId: "pers_player",
    world: {
      date: "2046-02-10",
      nationIds: ["nation_demo"]
    },
    entities: {
      people,
      units: {
        unit_sq_001: {
          id: "unit_sq_001",
          schemaVersion: 1,
          definitionId: "unitdef_infantry_squad",
          nationId: "nation_demo",
          branchId: "branch_army",
          name: "2nd Squad",
          parentUnitId: null,
          commanderId: "pers_1002",
          slotIds: Object.keys(unitSlots),
          condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 },
          locationId: "location_demo"
        }
      },
      unitSlots,
      loadouts,
      careerEvents: {
        career_001: {
          id: "career_001",
          schemaVersion: 1,
          personId: "pers_player",
          type: "enlistment",
          date: "2046-02-10",
          references: { branchId: "branch_army" }
        }
      },
      qualificationRecords: {}
    }
  };
}
