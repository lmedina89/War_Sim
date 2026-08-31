export const generationProfileDefinitions = [
  {
    id: "generation_profile_army_infantry_company_v1",
    schemaVersion: 1,
    branchId: "branch_army",
    nationId: "nation_demo",
    rootUnitId: "unit_company_001",
    readinessModelId: "readiness_standard_unit",
    units: [
      { id: "unit_company_001", name: "Alpha Company", organizationDefinitionId: "orgdef_infantry_company", parentUnitId: null },
      { id: "unit_platoon_001", name: "1st Platoon", organizationDefinitionId: "orgdef_infantry_platoon", parentUnitId: "unit_company_001" },
      { id: "unit_platoon_002", name: "2nd Platoon", organizationDefinitionId: "orgdef_infantry_platoon", parentUnitId: "unit_company_001" },
      { id: "unit_platoon_003", name: "3rd Platoon", organizationDefinitionId: "orgdef_infantry_platoon", parentUnitId: "unit_company_001" },
      { id: "unit_sq_11", name: "1st Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_001" },
      { id: "unit_sq_001", name: "2nd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_001" },
      { id: "unit_sq_13", name: "3rd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_001" },
      { id: "unit_sq_21", name: "1st Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_002" },
      { id: "unit_sq_22", name: "2nd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_002" },
      { id: "unit_sq_23", name: "3rd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_002" },
      { id: "unit_sq_31", name: "1st Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_003" },
      { id: "unit_sq_32", name: "2nd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_003" },
      { id: "unit_sq_33", name: "3rd Squad", organizationDefinitionId: "orgdef_infantry_squad", parentUnitId: "unit_platoon_003" }
    ],
    rankServiceYearsByRankId: {
      rank_army_e1: 0, rank_army_e2: 1, rank_army_e3: 2, rank_army_e4: 3,
      rank_army_e5: 5, rank_army_e6: 7, rank_army_e7: 10, rank_army_e8: 14,
      rank_army_o1: 2, rank_army_o2: 4, rank_army_o3: 7
    },
    billetSpecialtyIdsByDefinitionId: {
      billet_company_commander: "specialty_army_11a", billet_executive_officer: "specialty_army_11a", billet_first_sergeant: "specialty_army_11b", billet_company_clerk: "specialty_army_42a",
      billet_platoon_leader: "specialty_army_11a", billet_platoon_sergeant: "specialty_army_11b", billet_squad_leader: "specialty_army_11b", billet_team_leader: "specialty_army_11b",
      billet_grenadier: "specialty_army_11b", billet_automatic_rifleman: "specialty_army_11b", billet_rifleman: "specialty_army_11b"
    },
    billetRankIdsByDefinitionId: {
      billet_company_commander: "rank_army_o3",
      billet_executive_officer: "rank_army_o2",
      billet_first_sergeant: "rank_army_e8",
      billet_company_clerk: "rank_army_e3",
      billet_platoon_leader: "rank_army_o1",
      billet_platoon_sergeant: "rank_army_e7",
      billet_squad_leader: "rank_army_e5",
      billet_team_leader: "rank_army_e4",
      billet_grenadier: "rank_army_e3",
      billet_automatic_rifleman: "rank_army_e3",
      billet_rifleman: "rank_army_e2"
    }
  }
];
