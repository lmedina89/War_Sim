export const activityDefinitions = [
  {
    id: "activity_pt", schemaVersion: 1, name: "Physical Training", shortName: "PT", category: "individual", durationDays: 1,
    description: "Structured physical training improves fitness and general readiness.",
    presentationId: "feedback_routine",
    eligibility: { allowedStatuses: ["active"], minimumHealth: 60 },
    effects: [
      { target: "skill", skillId: "skill_fitness", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 35 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 4, clamp: [0,100] },
      { target: "person", field: "condition.readiness", operation: "add", value: 1, clamp: [0,100] }
    ],
    eventTableId: "event_table_training_light"
  },
  {
    id: "activity_range", schemaVersion: 1, name: "Weapons Qualification Range", shortName: "Range", category: "individual", durationDays: 2,
    description: "Live-fire range time improves marksmanship and weapons proficiency.",
    presentationId: "feedback_routine",
    eligibility: { allowedStatuses: ["active"], minimumHealth: 70 },
    effects: [
      { target: "skill", skillId: "skill_marksmanship", operation: "add", value: 4 },
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 80 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 6, clamp: [0,100] }
    ],
    eventTableId: "event_table_training_range"
  },
  {
    id: "activity_mos_training", schemaVersion: 1, name: "MOS Training", shortName: "MOS", category: "individual", durationDays: 3,
    description: "Job-specific training develops specialty proficiency.",
    presentationId: "feedback_routine",
    eligibility: { allowedStatuses: ["active"], minimumHealth: 60 },
    effects: [
      { target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 4 },
      { target: "person", field: "career.experience", operation: "add", value: 110 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 5, clamp: [0,100] }
    ],
    eventTableId: "event_table_training_light"
  },
  {
    id: "activity_squad_drills", schemaVersion: 1, name: "Squad Drills", shortName: "Squad Drills", category: "unit", durationDays: 3,
    description: "Collective drills improve fieldcraft, cohesion, relationships, and squad readiness.",
    presentationId: "feedback_routine",
    eligibility: { allowedStatuses: ["active"], minimumHealth: 70, requiresAssignedUnit: true },
    effects: [
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 3 },
      { target: "person", field: "career.experience", operation: "add", value: 100 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 7, clamp: [0,100] },
      { target: "unit", field: "condition.cohesion", operation: "add", value: 2, clamp: [0,100] },
      { target: "unit", field: "condition.readiness", operation: "add", value: 2, clamp: [0,100] },
      { target: "relationships", field: "trust", operation: "add", value: 1, clamp: [-100,100] }
    ],
    eventTableId: "event_table_training_field"
  },
  {
    id: "activity_leadership_development", schemaVersion: 1, name: "Leadership Development", shortName: "Leadership", category: "individual", durationDays: 2,
    description: "Leader development builds judgment and leadership proficiency.",
    presentationId: "feedback_routine",
    eligibility: { allowedStatuses: ["active"], minimumHealth: 60, minimumRankLevel: 3 },
    effects: [
      { target: "skill", skillId: "skill_leadership", operation: "add", value: 3 },
      { target: "person", field: "career.experience", operation: "add", value: 75 },
      { target: "person", field: "career.prestige", operation: "add", value: 1 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 3, clamp: [0,100] }
    ],
    eventTableId: "event_table_training_light"
  }
];
