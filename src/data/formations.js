export const formationDefinitions = [
  {
    id: "formation_82d_airborne",
    schemaVersion: 1,
    name: "82d Airborne Division",
    shortName: "82d Airborne",
    insigniaId: "ssi_82d_airborne",
    careerStartEligible: true,
    lineage: [
      { id: "unit_formation_root", name: "82d Airborne Division", echelonId: "echelon_division", organizationDefinitionId: "orgdef_infantry_division" },
      { id: "unit_formation_brigade", name: "1st Brigade", echelonId: "echelon_brigade", organizationDefinitionId: "orgdef_infantry_brigade" },
      { id: "unit_formation_battalion", name: "1st Battalion, 504th Parachute Infantry Regiment", echelonId: "echelon_battalion", organizationDefinitionId: "orgdef_infantry_battalion" }
    ]
  },
  {
    id: "formation_7th_infantry",
    schemaVersion: 1,
    name: "7th Infantry Division",
    shortName: "7th Infantry",
    insigniaId: "ssi_7th_infantry",
    careerStartEligible: true,
    lineage: [
      { id: "unit_formation_root", name: "7th Infantry Division", echelonId: "echelon_division", organizationDefinitionId: "orgdef_infantry_division" },
      { id: "unit_formation_brigade", name: "1st Brigade", echelonId: "echelon_brigade", organizationDefinitionId: "orgdef_infantry_brigade" },
      { id: "unit_formation_battalion", name: "4th Battalion, 17th Infantry Regiment", echelonId: "echelon_battalion", organizationDefinitionId: "orgdef_infantry_battalion" }
    ]
  },
  {
    id: "formation_5th_infantry",
    schemaVersion: 1,
    name: "5th Infantry Division",
    shortName: "5th Infantry",
    insigniaId: "ssi_5th_infantry",
    careerStartEligible: true,
    lineage: [
      { id: "unit_formation_root", name: "5th Infantry Division", echelonId: "echelon_division", organizationDefinitionId: "orgdef_infantry_division" },
      { id: "unit_formation_brigade", name: "1st Brigade", echelonId: "echelon_brigade", organizationDefinitionId: "orgdef_infantry_brigade" },
      { id: "unit_formation_battalion", name: "4th Battalion, 6th Infantry Regiment", echelonId: "echelon_battalion", organizationDefinitionId: "orgdef_infantry_battalion" }
    ]
  },
  {
    id: "formation_193d_infantry",
    schemaVersion: 1,
    name: "193d Infantry Brigade",
    shortName: "193d Infantry",
    insigniaId: "ssi_193d_infantry",
    careerStartEligible: true,
    lineage: [
      { id: "unit_formation_root", name: "193d Infantry Brigade", echelonId: "echelon_brigade", organizationDefinitionId: "orgdef_infantry_brigade" },
      { id: "unit_formation_battalion", name: "5th Battalion, 87th Infantry Regiment", echelonId: "echelon_battalion", organizationDefinitionId: "orgdef_infantry_battalion" }
    ]
  },
  {
    id: "formation_75th_ranger",
    schemaVersion: 1,
    name: "75th Ranger Regiment",
    shortName: "75th Rangers",
    insigniaId: "ssi_75th_ranger",
    careerStartEligible: false,
    eligibilityNote: "Requires a future Ranger selection / assignment pipeline."
  },
  {
    id: "formation_7th_special_forces",
    schemaVersion: 1,
    name: "7th Special Forces Group",
    shortName: "7th SFG",
    insigniaId: "ssi_7th_special_forces",
    careerStartEligible: false,
    eligibilityNote: "Requires a future Special Forces qualification / assignment pipeline."
  }
];

export const campaignEmblemDefinitions = [
  { id:"campaign_emblem_northern_shield", schemaVersion:1, name:"Northern Shield", insigniaId:"campaign_northern_shield" },
  { id:"campaign_emblem_iron_viper", schemaVersion:1, name:"Iron Viper", insigniaId:"campaign_iron_viper" },
  { id:"campaign_emblem_falcon_spear", schemaVersion:1, name:"Falcon Spear", insigniaId:"campaign_falcon_spear" },
  { id:"campaign_emblem_ember_watch", schemaVersion:1, name:"Ember Watch", insigniaId:"campaign_ember_watch" },
  { id:"campaign_emblem_night_anvil", schemaVersion:1, name:"Night Anvil", insigniaId:"campaign_night_anvil" },
  { id:"campaign_emblem_red_horizon", schemaVersion:1, name:"Red Horizon", insigniaId:"campaign_red_horizon" }
];
