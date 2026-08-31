export const equipmentDefinitions = [
  {
    id: "weapon_service_rifle",
    schemaVersion: 2,
    type: "primary_weapon",
    name: "Service Rifle",
    platformClassId: "platform_small_arm", domain: "land", operatorSkillIds:["skill_marksmanship"],
    capabilityContributions:[{ capabilityId:"capability_small_arms", weight:1.0 }],
    stats: { damage: 62, accuracy: 71, range: 68, reliability: 88, suppression: 44, weight: 36 }
  },
  {
    id: "weapon_auto_rifle",
    schemaVersion: 2,
    type: "primary_weapon",
    name: "Automatic Rifle",
    platformClassId: "platform_small_arm", domain: "land", operatorSkillIds:["skill_marksmanship"],
    capabilityContributions:[{ capabilityId:"capability_small_arms", weight:.75 },{ capabilityId:"capability_automatic_fire", weight:1.0 }],
    stats: { damage: 67, accuracy: 64, range: 64, reliability: 83, suppression: 78, weight: 58 }
  },
  {
    id: "weapon_carbine",
    schemaVersion: 2,
    type: "primary_weapon",
    name: "Carbine",
    platformClassId: "platform_small_arm", domain: "land", operatorSkillIds:["skill_marksmanship"],
    capabilityContributions:[{ capabilityId:"capability_small_arms", weight:.9 }],
    stats: { damage: 55, accuracy: 68, range: 56, reliability: 90, suppression: 38, weight: 28 }
  }
];
