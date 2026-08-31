export const qualificationDefinitions = [
  {
    id: "qualification_service_rifle", schemaVersion: 3, name: "Service Rifle / Carbine", category: "weapons", renewable: true, validityDays: 365,
    weaponDefinitionId: "weapon_service_rifle", badgeClasp: "RIFLE",
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
  { id: "qualification_airborne", schemaVersion: 1, name: "Airborne Qualified", category: "mobility" },
  { id: "qualification_basic_leader", schemaVersion: 1, name: "Basic Leader Qualified", category: "leadership" }
];
