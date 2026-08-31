function makePerson(id, firstName, lastName, rankId, health, morale, loadoutId, simulationTier = 1) {
  return {
    id,
    schemaVersion: 2,
    identity: { firstName, lastName, displayName: `${firstName} ${lastName}` },
    affiliation: {
      nationId: "nation_demo",
      branchId: "branch_army",
      unitId: null,
      billetId: null,
      rankId
    },
    career: {
      enlistmentDate: "2046-02-10",
      experience: 0,
      prestige: 0
    },
    condition: {
      health,
      morale,
      fatigue: 0,
      readiness: 90,
      status: "active"
    },
    simulationTier,
    traitIds: [],
    loadoutId,
    serviceRecordId: `service_${id}`
  };
}

export function createInitialWorldState(playerIdentity = { firstName: "Alex", lastName: "Morgan" }) {
  const people = {
    pers_player: makePerson("pers_player", playerIdentity.firstName, playerIdentity.lastName, "rank_army_e1", 100, 80, "loadout_player", 0),
    pers_1002: makePerson("pers_1002", "Marcus", "Hill", "rank_army_e5", 100, 86, "loadout_1002", 1),
    pers_1003: makePerson("pers_1003", "Daniel", "Reyes", "rank_army_e4", 96, 78, "loadout_1003", 1),
    pers_1004: makePerson("pers_1004", "Evan", "Brooks", "rank_army_e3", 91, 72, "loadout_1004", 1),
    pers_1005: makePerson("pers_1005", "Noah", "Carter", "rank_army_e3", 100, 80, "loadout_1005", 1),
    pers_1006: makePerson("pers_1006", "Liam", "Walker", "rank_army_e2", 89, 74, "loadout_1006", 1),
    pers_1007: makePerson("pers_1007", "Mason", "Clark", "rank_army_e2", 98, 76, "loadout_1007", 1),
    pers_1008: makePerson("pers_1008", "Caleb", "Young", "rank_army_e3", 100, 84, "loadout_1008", 1),
    pers_1009: makePerson("pers_1009", "Jordan", "Price", "rank_army_e2", 94, 71, "loadout_1009", 1)
  };

  const units = {
    unit_company_001: {
      id: "unit_company_001",
      schemaVersion: 2,
      organizationDefinitionId: "orgdef_infantry_company",
      nationId: "nation_demo",
      branchId: "branch_army",
      echelonId: "echelon_company",
      name: "Alpha Company",
      parentUnitId: null,
      childUnitIds: ["unit_platoon_001"],
      condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
    },
    unit_platoon_001: {
      id: "unit_platoon_001",
      schemaVersion: 2,
      organizationDefinitionId: "orgdef_infantry_platoon",
      nationId: "nation_demo",
      branchId: "branch_army",
      echelonId: "echelon_platoon",
      name: "1st Platoon",
      parentUnitId: "unit_company_001",
      childUnitIds: ["unit_sq_001"],
      condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
    },
    unit_sq_001: {
      id: "unit_sq_001",
      schemaVersion: 2,
      organizationDefinitionId: "orgdef_infantry_squad",
      nationId: "nation_demo",
      branchId: "branch_army",
      echelonId: "echelon_squad",
      name: "2nd Squad",
      parentUnitId: "unit_platoon_001",
      childUnitIds: [],
      condition: { readiness: 84, morale: 78, cohesion: 81, supply: 92 }
    }
  };

  const billetSpecs = [
    ["billet_001", "billet_squad_leader", "pers_1002"],
    ["billet_002", "billet_team_leader", "pers_1003"],
    ["billet_003", "billet_grenadier", "pers_1004"],
    ["billet_004", "billet_automatic_rifleman", "pers_1005"],
    ["billet_005", "billet_rifleman", "pers_1006"],
    ["billet_006", "billet_rifleman", "pers_1007"],
    ["billet_007", "billet_rifleman", "pers_1008"],
    ["billet_008", "billet_rifleman", "pers_1009"],
    ["billet_009", "billet_rifleman", "pers_player"]
  ];

  const billets = {};
  for (const [id, definitionId, assignedPersonId] of billetSpecs) {
    billets[id] = {
      id,
      schemaVersion: 1,
      unitId: "unit_sq_001",
      definitionId,
      assignedPersonId,
      status: assignedPersonId ? "filled" : "vacant"
    };
    const person = people[assignedPersonId];
    if (person) {
      person.affiliation.unitId = "unit_sq_001";
      person.affiliation.billetId = id;
    }
  }

  const serviceRecords = {};
  for (const person of Object.values(people)) {
    serviceRecords[person.serviceRecordId] = {
      id: person.serviceRecordId,
      schemaVersion: 1,
      personId: person.id,
      status: "active"
    };
  }

  const loadouts = {};
  const equipmentInstances = {};
  for (const person of Object.values(people)) {
    const eqId = `eq_${person.id}`;
    const defId = person.id === "pers_1005" ? "weapon_auto_rifle" : person.id === "pers_1002" ? "weapon_carbine" : "weapon_service_rifle";
    equipmentInstances[eqId] = {
      id: eqId,
      schemaVersion: 1,
      definitionId: defId,
      ownerPersonId: person.id,
      condition: 100
    };
    loadouts[person.loadoutId] = {
      id: person.loadoutId,
      schemaVersion: 1,
      ownerPersonId: person.id,
      primaryEquipmentInstanceId: eqId
    };
  }

  const relationshipRecords = {};
  let relSeq = 1;
  for (const person of Object.values(people)) {
    if (person.id === "pers_player") continue;
    relationshipRecords[`rel_${relSeq++}`] = {
      id: `rel_${relSeq - 1}`,
      schemaVersion: 1,
      personAId: "pers_player",
      personBId: person.id,
      type: "squadmate",
      familiarity: 5,
      trust: 0,
      respect: 0
    };
  }

  return {
    schemaVersion: 4,
    gameVersion: "0.2.0",
    playerPersonId: "pers_player",
    world: {
      date: "2046-02-10",
      clock: { elapsedDays: 0, paused: true, speed: 1 }
    },
    rngState: 3734526327,
    nextEntitySequence: 100,
    entities: {
      people,
      units,
      billets,
      serviceRecords,
      loadouts,
      equipmentInstances,
      careerEvents: {
        career_001: {
          id: "career_001",
          schemaVersion: 1,
          personId: "pers_player",
          type: "career_started",
          date: "2046-02-10",
          references: { branchId: "branch_army" }
        }
      },
      assignmentRecords: {
        assign_001: {
          id: "assign_001",
          schemaVersion: 1,
          personId: "pers_player",
          unitId: "unit_sq_001",
          billetId: "billet_009",
          startedDate: "2046-02-10",
          endedDate: null
        }
      },
      promotionRecords: {},
      awardRecords: {},
      qualificationRecords: {},
      deploymentRecords: {},
      casualtyRecords: {},
      memorialRecords: {},
      relationshipRecords,
      notificationRecords: {},
      actionRecords: {}
    }
  };
}
