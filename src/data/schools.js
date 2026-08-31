export const schoolDefinitions = [
  {
    id: "school_airborne",
    schemaVersion: 1,
    name: "Airborne School",
    category: "military_school",
    durationDays: 21,
    grantsQualificationIds: ["qualification_airborne"],
    completionAwardIds: ["award_parachutist_badge"],
    completionEffects: [
      { target: "skill", skillId: "skill_fitness", operation: "add", value: 2 },
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 180 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 8, clamp: [0,100] }
    ]
  },
  {
    id: "school_leadership",
    schemaVersion: 1,
    name: "Basic Leader Course",
    category: "military_school",
    durationDays: 22,
    grantsQualificationIds: ["qualification_basic_leader"],
    completionAwardIds: [],
    completionEffects: [
      { target: "skill", skillId: "skill_leadership", operation: "add", value: 4 },
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 220 },
      { target: "person", field: "career.prestige", operation: "add", value: 2 }
    ]
  }
];
