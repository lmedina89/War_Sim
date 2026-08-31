export const specialtyDefinitions = [
  {
    id: "specialty_army_11b", schemaVersion: 1, branchId: "branch_army", code: "11B", name: "Infantryman",
    careerField: "Infantry", startingRoleId: "role_rifleman", careerAvailable: true,
    eligibleBilletDefinitionIds: ["billet_rifleman", "billet_grenadier", "billet_automatic_rifleman", "billet_team_leader", "billet_squad_leader"],
    enlistmentBonusBase: 5000
  },
  {
    id: "specialty_army_12b", schemaVersion: 1, branchId: "branch_army", code: "12B", name: "Combat Engineer",
    careerField: "Engineer", startingRoleId: null, careerAvailable: false, eligibleBilletDefinitionIds: [], enlistmentBonusBase: 7500
  },
  {
    id: "specialty_army_92a", schemaVersion: 1, branchId: "branch_army", code: "92A", name: "Automated Logistical Specialist",
    careerField: "Logistics", startingRoleId: null, careerAvailable: false, eligibleBilletDefinitionIds: [], enlistmentBonusBase: 6000
  }
];
