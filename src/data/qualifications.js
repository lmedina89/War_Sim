export const qualificationDefinitions = [
  {
    id: "qualification_service_rifle", schemaVersion: 4, name: "Service Rifle / Carbine", category: "weapons", renewable: true, validityDays: 365,
    recordGroup: "weapon_qualification", weaponDefinitionId: "weapon_service_rifle", badgeClasp: "RIFLE",
    capabilityContributions: [{ capability:"individual_marksmanship", weight:0.45 }],
    scoring: {
      type: "targets_hit", maxScore: 40,
      resultBands: [
        { minimumScore: 36, result: "expert", label: "EXPERT" },
        { minimumScore: 30, result: "sharpshooter", label: "SHARPSHOOTER" },
        { minimumScore: 23, result: "marksman", label: "MARKSMAN" },
        { minimumScore: 0, result: "unqualified", label: "UNQUALIFIED" }
      ]
    }
  },
  {
    id: "qualification_airborne", schemaVersion: 2, name: "Airborne Qualified", category: "mobility", recordGroup:"special_skill_qualification",
    capabilityContributions:[{capability:"airborne_mobility",weight:1.0}]
  },
  {
    id: "qualification_basic_leader", schemaVersion: 2, name: "Basic Leader Course Graduate", category: "leadership", recordGroup:"professional_military_education",
    capabilityContributions:[{capability:"small_unit_leadership",weight:0.4}]
  }
];
