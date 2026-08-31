export const organizationDefinitions = [
  {
    id: "orgdef_infantry_company",
    schemaVersion: 1,
    name: "Infantry Company",
    echelonId: "echelon_company",
    branchId: "branch_army",
    childOrganizationDefinitionIds: ["orgdef_infantry_platoon"]
  },
  {
    id: "orgdef_infantry_platoon",
    schemaVersion: 1,
    name: "Infantry Platoon",
    echelonId: "echelon_platoon",
    branchId: "branch_army",
    childOrganizationDefinitionIds: ["orgdef_infantry_squad"]
  },
  {
    id: "orgdef_infantry_squad",
    schemaVersion: 1,
    name: "Infantry Squad",
    echelonId: "echelon_squad",
    branchId: "branch_army",
    billetDefinitionIds: [
      "billet_squad_leader",
      "billet_team_leader",
      "billet_grenadier",
      "billet_automatic_rifleman",
      "billet_rifleman",
      "billet_rifleman",
      "billet_rifleman",
      "billet_rifleman",
      "billet_rifleman"
    ]
  }
];
