export const capabilityDefinitions = [
  { id:"capability_small_arms", schemaVersion:1, name:"Small Arms", domain:"land", category:"fires", missionTags:["close_combat","security","defense"] },
  { id:"capability_automatic_fire", schemaVersion:1, name:"Automatic Fire", domain:"land", category:"fires", missionTags:["suppression","close_combat","defense"] },
  { id:"capability_anti_armor", schemaVersion:1, name:"Anti-Armor", domain:"land", category:"fires", missionTags:["anti_armor","defense"] },
  { id:"capability_explosive_breaching", schemaVersion:1, name:"Explosive / Breaching", domain:"land", category:"engineering", missionTags:["breaching","mobility"] },
  { id:"capability_ground_mobility", schemaVersion:1, name:"Ground Mobility", domain:"land", category:"mobility", missionTags:["movement","sustainment"] },
  { id:"capability_armored_mobility", schemaVersion:1, name:"Armored Mobility", domain:"land", category:"mobility", missionTags:["mounted_maneuver","protection"] },
  { id:"capability_rotary_wing", schemaVersion:1, name:"Rotary-Wing Aviation", domain:"air", category:"aviation", missionTags:["air_assault","air_mobility","recon"] },
  { id:"capability_fixed_wing", schemaVersion:1, name:"Fixed-Wing Aviation", domain:"air", category:"aviation", missionTags:["air_support","air_mobility"] },
  { id:"capability_maritime_mobility", schemaVersion:1, name:"Maritime Mobility", domain:"sea", category:"mobility", missionTags:["riverine","amphibious","maritime"] },
  { id:"capability_reconnaissance", schemaVersion:1, name:"Reconnaissance", domain:"joint", category:"information", missionTags:["recon","screen","security"] },
  { id:"capability_medical", schemaVersion:1, name:"Medical Support", domain:"joint", category:"support", missionTags:["casualty_care","survivability"] },
  { id:"capability_communications", schemaVersion:1, name:"Communications", domain:"joint", category:"information", missionTags:["command_and_control"] },
  { id:"capability_sustainment", schemaVersion:1, name:"Sustainment", domain:"joint", category:"support", missionTags:["logistics","endurance"] }
];

export const platformClassDefinitions = [
  { id:"platform_small_arm", schemaVersion:1, name:"Individual Small Arm", domain:"land", crewModel:"individual" },
  { id:"platform_crew_served_weapon", schemaVersion:1, name:"Crew-Served Weapon", domain:"land", crewModel:"crew" },
  { id:"platform_explosive_system", schemaVersion:1, name:"Explosive / Breaching System", domain:"land", crewModel:"specialist" },
  { id:"platform_ground_vehicle", schemaVersion:1, name:"Ground Vehicle", domain:"land", crewModel:"crew" },
  { id:"platform_armored_vehicle", schemaVersion:1, name:"Armored Vehicle", domain:"land", crewModel:"crew" },
  { id:"platform_rotary_wing_aircraft", schemaVersion:1, name:"Rotary-Wing Aircraft", domain:"air", crewModel:"crew" },
  { id:"platform_fixed_wing_aircraft", schemaVersion:1, name:"Fixed-Wing Aircraft", domain:"air", crewModel:"crew" },
  { id:"platform_watercraft", schemaVersion:1, name:"Watercraft", domain:"sea", crewModel:"crew" }
];

export const unitDoctrineDefinitions = [
  { id:"doctrine_light_infantry", schemaVersion:1, name:"Light Infantry", organizationDefinitionIds:["orgdef_infantry_squad","orgdef_infantry_platoon","orgdef_infantry_company"], baselineMissionTags:["close_combat","security","defense","patrolling"], capabilityPriorities:["capability_small_arms","capability_automatic_fire","capability_reconnaissance","capability_communications","capability_medical","capability_sustainment"] }
];
