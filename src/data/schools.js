export const schoolDefinitions = [
  {
    id: "school_airborne",
    schemaVersion: 2,
    name: "Airborne School",
    category: "military_school",
    schoolType: "special_skill",
    durationDays: 21,
    repeatable: false,
    opportunitySources: ["player_request","command_nomination","unit_requirement","reenlistment_incentive","special_event","random_eligible"],
    eligibility: {
      minimumServiceDays: 30,
      minimumRankLevel: 1,
      minimumHealth: 80,
      minimumReadiness: 70,
      maximumFatigue: 75,
      allowedStatuses: ["active"],
      minimumSkills: { skill_fitness: 30 }
    },
    grantsQualificationIds: ["qualification_airborne"],
    completionAwardIds: ["award_parachutist_badge"],
    capabilityContributions: [
      { capability: "airborne_mobility", weight: 1.0 },
      { capability: "fieldcraft", weight: 0.2 },
      { capability: "fitness", weight: 0.15 }
    ],
    completionEffects: [
      { target: "skill", skillId: "skill_fitness", operation: "add", value: 2 },
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 180 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 8, clamp: [0,100] }
    ]
  },
  {
    id: "school_leadership",
    schemaVersion: 2,
    name: "Basic Leader Course",
    category: "military_school",
    schoolType: "professional_military_education",
    durationDays: 22,
    repeatable: false,
    opportunitySources: ["player_request","command_nomination","promotion_requirement","unit_requirement"],
    eligibility: {
      minimumServiceDays: 365,
      minimumRankLevel: 4,
      minimumHealth: 70,
      minimumReadiness: 65,
      maximumFatigue: 80,
      allowedStatuses: ["active"],
      allowedRankCategories: ["enlisted"]
    },
    grantsQualificationIds: ["qualification_basic_leader"],
    completionAwardIds: ["award_nco_professional_development_ribbon"],
    capabilityContributions: [
      { capability: "small_unit_leadership", weight: 0.55 },
      { capability: "fieldcraft", weight: 0.1 }
    ],
    completionEffects: [
      { target: "skill", skillId: "skill_leadership", operation: "add", value: 4 },
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 220 },
      { target: "person", field: "career.prestige", operation: "add", value: 2 }
    ]
  }
];
