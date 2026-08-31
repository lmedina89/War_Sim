export const awardDefinitions = [
  {
    id: "award_army_service_ribbon", schemaVersion: 1, name: "Army Service Ribbon", category: "ribbon",
    awardGroup: "service_award", permanent: true, prestigeValue: 2,
    eligibilitySource: "initial_entry_training_completion"
  },
  {
    id: "award_nco_professional_development_ribbon", schemaVersion: 1, name: "NCO Professional Development Ribbon", category: "ribbon",
    awardGroup: "professional_development", permanent: true, prestigeValue: 4,
    eligibilitySource: "professional_military_education"
  },
  {
    id: "award_army_good_conduct_medal", schemaVersion: 1, name: "Army Good Conduct Medal", category: "medal",
    awardGroup: "service_award", permanent: true, prestigeValue: 5,
    eligibilitySource: "qualifying_enlisted_service"
  },
  { id: "award_campaign_01", schemaVersion: 1, name: "Campaign Service Ribbon", category: "ribbon", awardGroup:"campaign", permanent:true, prestigeValue: 8 },
  { id: "award_combat_badge", schemaVersion: 1, name: "Combat Infantry Badge", category: "badge", awardGroup:"combat_special_skill", permanent:true, prestigeValue: 15 },
  {
    id: "award_parachutist_badge", schemaVersion: 2, name: "Parachutist Badge", category: "badge",
    awardGroup:"special_skill", permanent:true, prestigeValue: 6,
    eligibilitySource:"school_airborne"
  },

  // Legacy definition retained for old saves. New records should use award_army_service_ribbon.
  { id: "award_basic_training", schemaVersion: 2, name: "Army Service Ribbon (Legacy)", category: "ribbon", awardGroup:"legacy", permanent:true, prestigeValue: 2, legacy:true }
];
