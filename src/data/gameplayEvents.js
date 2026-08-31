export const gameplayEventDefinitions = [
  {
    id: "event_training_breakthrough", schemaVersion: 1, name: "Training Breakthrough", type: "activity", priority: "normal",
    presentationId: "feedback_routine",
    title: "Training Breakthrough", message: "The training period clicked. Your performance noticeably improved.",
    effects: [{ target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 1 }, { target: "person", field: "career.experience", operation: "add", value: 25 }]
  },
  {
    id: "event_minor_training_injury", schemaVersion: 1, name: "Minor Training Injury", type: "activity", priority: "attention",
    presentationId: "feedback_attention",
    title: "Minor Training Injury", message: "A minor training injury reduces readiness and requires recovery.",
    effects: [{ target: "person", field: "condition.health", operation: "add", value: -4, clamp: [0,100] }, { target: "person", field: "condition.readiness", operation: "add", value: -3, clamp: [0,100] }]
  },
  {
    id: "event_squad_cohesion_gain", schemaVersion: 1, name: "Squad Cohesion Gain", type: "activity", priority: "normal",
    presentationId: "feedback_routine",
    title: "Squad Working Better Together", message: "The squad's repetitions are paying off. Coordination and trust improve.",
    effects: [{ target: "unit", field: "condition.cohesion", operation: "add", value: 2, clamp: [0,100] }, { target: "relationships", field: "trust", operation: "add", value: 1, clamp: [-100,100] }]
  },
  {
    id: "event_training_leadership_moment", schemaVersion: 1, name: "Leadership Moment", type: "decision", priority: "attention",
    presentationId: "feedback_attention",
    title: "A Teammate Is Struggling", message: "During squad drills, a teammate falls behind and the team starts to lose rhythm. How do you respond?",
    choices: [
      { id: "choice_help_teammate", label: "Coach the teammate", effects: [{ target: "skill", skillId: "skill_leadership", operation: "add", value: 2 }, { target: "relationships", field: "trust", operation: "add", value: 2, clamp: [-100,100] }, { target: "person", field: "career.experience", operation: "add", value: 20 }] },
      { id: "choice_focus_mission", label: "Focus on your own task", effects: [{ target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 2 }, { target: "person", field: "career.experience", operation: "add", value: 25 }] }
    ]
  }
];

export const eventTableDefinitions = [
  { id: "event_table_training_light", schemaVersion: 1, entries: [{ eventId: "event_training_breakthrough", weight: 18 }, { eventId: null, weight: 82 }] },
  { id: "event_table_training_range", schemaVersion: 1, entries: [{ eventId: "event_training_breakthrough", weight: 20 }, { eventId: "event_minor_training_injury", weight: 4 }, { eventId: null, weight: 76 }] },
  { id: "event_table_training_field", schemaVersion: 1, entries: [{ eventId: "event_squad_cohesion_gain", weight: 18 }, { eventId: "event_training_leadership_moment", weight: 8 }, { eventId: "event_minor_training_injury", weight: 5 }, { eventId: null, weight: 69 }] }
];
