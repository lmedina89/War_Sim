export const dutyDefinitions = [
  {
    id: "duty_pt", schemaVersion: 1, name: "Unit Physical Training", shortName: "PT", category: "training", durationDays: 1,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_light",
    description: "Scheduled unit physical training builds fitness and supports physical readiness.",
    playerEffects: [
      { target: "skill", skillId: "skill_fitness", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 20 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 2, clamp: [0,100] }
    ],
    trainingEffects: { physical: 3, cohesion: 1 }
  },
  {
    id: "duty_range", schemaVersion: 1, name: "Weapons Qualification", shortName: "Range", category: "training", durationDays: 2,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_range",
    description: "Collective range training improves weapons proficiency and exposes equipment to normal wear.",
    playerEffects: [
      { target: "skill", skillId: "skill_marksmanship", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 35 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 4, clamp: [0,100] }
    ],
    trainingEffects: { weapons: 4, discipline: 1, equipmentReadiness: -1 }
  },
  {
    id: "duty_squad_drills", schemaVersion: 1, name: "Squad Tactical Drills", shortName: "Squad Drills", category: "training", durationDays: 3,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_field",
    description: "Collective maneuver repetitions improve tactical proficiency and cohesion.",
    playerEffects: [
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 45 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 5, clamp: [0,100] },
      { target: "relationships", field: "trust", operation: "add", value: 1, clamp: [-100,100] }
    ],
    trainingEffects: { tactical: 4, cohesion: 3, discipline: 1 }
  },
  {
    id: "duty_maintenance", schemaVersion: 1, name: "Weapons & Equipment Maintenance", shortName: "Maintenance", category: "maintenance", durationDays: 1,
    statusWhileActive: "active", mandatory: true,
    description: "Preventive maintenance restores equipment readiness and reinforces technical proficiency.",
    playerEffects: [
      { target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 15 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 1, clamp: [0,100] }
    ],
    trainingEffects: { equipmentReadiness: 4, discipline: 1 }
  },
  {
    id: "duty_field_exercise", schemaVersion: 1, name: "Field Training Exercise", shortName: "FTX", category: "field", durationDays: 4,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_field",
    description: "A multi-day field exercise stresses tactical proficiency, cohesion, equipment, and individual stamina.",
    playerEffects: [
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 3 },
      { target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 75 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 10, clamp: [0,100] },
      { target: "relationships", field: "trust", operation: "add", value: 2, clamp: [-100,100] }
    ],
    trainingEffects: { physical: 2, weapons: 2, tactical: 5, cohesion: 3, equipmentReadiness: -2 }
  },
  {
    id: "duty_recovery", schemaVersion: 1, name: "Recovery & Reset", shortName: "Recovery", category: "recovery", durationDays: 1,
    statusWhileActive: "active", mandatory: false,
    description: "A lower-tempo recovery period reduces fatigue and restores individual readiness.",
    playerEffects: [
      { target: "person", field: "condition.fatigue", operation: "add", value: -8, clamp: [0,100] },
      { target: "person", field: "condition.readiness", operation: "add", value: 2, clamp: [0,100] },
      { target: "person", field: "condition.health", operation: "add", value: 1, clamp: [0,100] }
    ],
    trainingEffects: { cohesion: 1 }
  }
];

export const scheduleTemplateDefinitions = [
  {
    id: "schedule_standard_training_cycle", schemaVersion: 1, name: "Standard Training Cycle", horizonDays: 70,
    entries: [
      { dutyDefinitionId: "duty_pt", offsetDays: 3, repeatEveryDays: 14 },
      { dutyDefinitionId: "duty_maintenance", offsetDays: 6, repeatEveryDays: 21 },
      { dutyDefinitionId: "duty_range", offsetDays: 10, repeatEveryDays: 35 },
      { dutyDefinitionId: "duty_squad_drills", offsetDays: 17, repeatEveryDays: 28 },
      { dutyDefinitionId: "duty_recovery", offsetDays: 23, repeatEveryDays: 28 },
      { dutyDefinitionId: "duty_field_exercise", offsetDays: 31, repeatEveryDays: 42 }
    ]
  }
];

export const readinessModelDefinitions = [
  {
    id: "readiness_standard_unit", schemaVersion: 1, name: "Standard Unit Readiness Model",
    weights: { personnelFill: 0.25, individualReadiness: 0.20, training: 0.20, cohesion: 0.10, equipment: 0.15, fatigue: 0.10 }
  }
];
