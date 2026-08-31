export const dutyDefinitions = [
  {
    id: "duty_pt", schemaVersion: 2, name: "Unit Physical Training", shortName: "PT", category: "training", durationDays: 1,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_light", defaultVisibility: "background", priority: 20,
    description: "Routine unit physical training builds fitness and supports physical readiness without normally occupying the major-event calendar.",
    playerEffects: [
      { target: "skill", skillId: "skill_fitness", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 12 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 2, clamp: [0,100] }
    ],
    trainingEffects: { physical: 2, cohesion: 1 }, npcEffects: { experience: 8, fatigue: 2, readiness: 1, skillIds: ["skill_fitness"] }
  },
  {
    id: "duty_range", schemaVersion: 2, name: "Weapons Qualification", shortName: "Range", category: "training", durationDays: 2,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_range", defaultVisibility: "significant", priority: 60,
    qualificationId: "qualification_service_rifle", qualificationValidityDays: 180, resultBands: [{ minimumScore: 88, result: "expert", label: "EXPERT" }, { minimumScore: 72, result: "sharpshooter", label: "SHARPSHOOTER" }, { minimumScore: 50, result: "marksman", label: "MARKSMAN" }, { minimumScore: 0, result: "unqualified", label: "UNQUALIFIED" }],
    description: "Periodic live-fire qualification validates weapons proficiency and renews an expiring service-rifle qualification.",
    playerEffects: [
      { target: "skill", skillId: "skill_marksmanship", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 35 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 4, clamp: [0,100] }
    ],
    trainingEffects: { weapons: 4, discipline: 1, equipmentReadiness: -1 }, npcEffects: { experience: 24, fatigue: 4, readiness: 2, equipmentWear: 1, skillIds: ["skill_marksmanship"] }
  },
  {
    id: "duty_squad_drills", schemaVersion: 2, name: "Squad Tactical Drills", shortName: "Squad Drills", category: "training", durationDays: 3,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_field", defaultVisibility: "significant", priority: 50,
    description: "Collective maneuver repetitions improve tactical proficiency and cohesion.",
    playerEffects: [
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 45 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 5, clamp: [0,100] },
      { target: "relationships", field: "trust", operation: "add", value: 1, clamp: [-100,100] }
    ],
    trainingEffects: { tactical: 4, cohesion: 3, discipline: 1 }, npcEffects: { experience: 32, fatigue: 5, readiness: 2, familiarity: 1, trust: 1, skillIds: ["skill_fieldcraft"] }
  },
  {
    id: "duty_maintenance", schemaVersion: 2, name: "Weapons & Equipment Maintenance", shortName: "Maintenance", category: "maintenance", durationDays: 1,
    statusWhileActive: "active", mandatory: true, defaultVisibility: "significant", priority: 45,
    description: "Preventive maintenance restores equipment readiness and reinforces technical proficiency.",
    playerEffects: [
      { target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 1 },
      { target: "person", field: "career.experience", operation: "add", value: 15 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 1, clamp: [0,100] }
    ],
    trainingEffects: { equipmentReadiness: 4, discipline: 1 }, npcEffects: { experience: 10, fatigue: 1, readiness: 1, equipmentRestore: 2, skillIds: ["skill_mos_proficiency"] }
  },
  {
    id: "duty_field_exercise", schemaVersion: 2, name: "Field Training Exercise", shortName: "FTX", category: "field", durationDays: 4,
    statusWhileActive: "training", mandatory: true, eventTableId: "event_table_training_field", defaultVisibility: "significant", priority: 70,
    description: "A multi-day field exercise stresses tactical proficiency, cohesion, equipment, and individual stamina.",
    playerEffects: [
      { target: "skill", skillId: "skill_fieldcraft", operation: "add", value: 3 },
      { target: "skill", skillId: "skill_mos_proficiency", operation: "add", value: 2 },
      { target: "person", field: "career.experience", operation: "add", value: 75 },
      { target: "person", field: "condition.fatigue", operation: "add", value: 10, clamp: [0,100] },
      { target: "relationships", field: "trust", operation: "add", value: 2, clamp: [-100,100] }
    ],
    trainingEffects: { physical: 2, weapons: 2, tactical: 5, cohesion: 3, equipmentReadiness: -2 }, npcEffects: { experience: 52, fatigue: 9, readiness: 3, equipmentWear: 2, familiarity: 2, trust: 1, skillIds: ["skill_fieldcraft","skill_mos_proficiency"] }
  },
  {
    id: "duty_recovery", schemaVersion: 2, name: "Recovery & Reset", shortName: "Recovery", category: "recovery", durationDays: 1,
    statusWhileActive: "active", mandatory: false, defaultVisibility: "significant", priority: 35,
    description: "A deliberate lower-tempo recovery period reduces accumulated fatigue and restores individual readiness.",
    playerEffects: [
      { target: "person", field: "condition.fatigue", operation: "add", value: -8, clamp: [0,100] },
      { target: "person", field: "condition.readiness", operation: "add", value: 2, clamp: [0,100] },
      { target: "person", field: "condition.health", operation: "add", value: 1, clamp: [0,100] }
    ],
    trainingEffects: { cohesion: 1 }, npcEffects: { fatigue: -7, readiness: 2, health: 1 }
  }
];

export const trainingPhaseDefinitions = [
  { id: "training_phase_garrison", schemaVersion: 1, name: "Garrison / Normal Cycle", scheduleTemplateId: "schedule_garrison_cycle", planningHorizonDays: 70, readinessTarget: 82, description: "Normal home-station rhythm with routine duties in the background and major events spaced across the calendar." },
  { id: "training_phase_elevated", schemaVersion: 1, name: "Elevated Readiness", scheduleTemplateId: "schedule_elevated_cycle", planningHorizonDays: 56, readinessTarget: 88, description: "Higher training tempo used when readiness requirements increase." },
  { id: "training_phase_predeployment", schemaVersion: 1, name: "Pre-Deployment Train-Up", scheduleTemplateId: "schedule_predeployment_cycle", planningHorizonDays: 42, readinessTarget: 94, description: "Dense qualification, collective training, maintenance, and recovery rhythm reserved for deployment preparation." },
  { id: "training_phase_reset", schemaVersion: 1, name: "Post-Deployment / Reset", scheduleTemplateId: "schedule_reset_cycle", planningHorizonDays: 56, readinessTarget: 80, description: "Reduced tempo emphasizing recovery, equipment reset, and rebuilding proficiency." },
  { id: "training_phase_operational", schemaVersion: 1, name: "Deployment / Operational", scheduleTemplateId: "schedule_operational_cycle", planningHorizonDays: 28, readinessTarget: 90, description: "Normal garrison scheduling is suspended; duties are expected to come from operational orders." }
];

export const scheduleTemplateDefinitions = [
  {
    id: "schedule_garrison_cycle", schemaVersion: 2, name: "Garrison Training Cycle", horizonDays: 70,
    entries: [
      { dutyDefinitionId: "duty_pt", offsetDays: 3, repeatEveryDays: 7, visibility: "background", weekdayOnly: true },
      { dutyDefinitionId: "duty_maintenance", offsetDays: 20, repeatEveryDays: 60, visibility: "significant", weekdayOnly: true, need: { component: "equipmentReadiness", below: 93 } },
      { dutyDefinitionId: "duty_range", offsetDays: 45, repeatEveryDays: 120, visibility: "significant", weekdayOnly: true, qualificationDueWithinDays: 75 },
      { dutyDefinitionId: "duty_squad_drills", offsetDays: 70, repeatEveryDays: 75, visibility: "significant", weekdayOnly: true, need: { component: "tactical", below: 91 } },
      { dutyDefinitionId: "duty_field_exercise", offsetDays: 105, repeatEveryDays: 150, visibility: "significant", allowWeekend: true, need: { component: "tactical", below: 88 } }
    ]
  },
  {
    id: "schedule_elevated_cycle", schemaVersion: 2, name: "Elevated Readiness Cycle", horizonDays: 56,
    entries: [
      { dutyDefinitionId: "duty_pt", offsetDays: 2, repeatEveryDays: 6, visibility: "background", weekdayOnly: true },
      { dutyDefinitionId: "duty_maintenance", offsetDays: 12, repeatEveryDays: 28, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_squad_drills", offsetDays: 18, repeatEveryDays: 35, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_range", offsetDays: 28, repeatEveryDays: 75, visibility: "significant", weekdayOnly: true, qualificationDueWithinDays: 75 },
      { dutyDefinitionId: "duty_field_exercise", offsetDays: 42, repeatEveryDays: 70, visibility: "significant", allowWeekend: true }
    ]
  },
  {
    id: "schedule_predeployment_cycle", schemaVersion: 2, name: "Pre-Deployment Train-Up", horizonDays: 42,
    entries: [
      { dutyDefinitionId: "duty_pt", offsetDays: 3, repeatEveryDays: 7, visibility: "background", weekdayOnly: true },
      { dutyDefinitionId: "duty_maintenance", offsetDays: 6, repeatEveryDays: 21, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_range", offsetDays: 10, repeatEveryDays: 42, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_squad_drills", offsetDays: 17, repeatEveryDays: 28, visibility: "significant", allowWeekend: true },
      { dutyDefinitionId: "duty_recovery", offsetDays: 23, repeatEveryDays: 28, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_field_exercise", offsetDays: 31, repeatEveryDays: 42, visibility: "significant", allowWeekend: true }
    ]
  },
  {
    id: "schedule_reset_cycle", schemaVersion: 2, name: "Reset / Recovery Cycle", horizonDays: 56,
    entries: [
      { dutyDefinitionId: "duty_recovery", offsetDays: 5, repeatEveryDays: 21, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_maintenance", offsetDays: 12, repeatEveryDays: 35, visibility: "significant", weekdayOnly: true },
      { dutyDefinitionId: "duty_pt", offsetDays: 9, repeatEveryDays: 10, visibility: "background", weekdayOnly: true },
      { dutyDefinitionId: "duty_squad_drills", offsetDays: 40, repeatEveryDays: 56, visibility: "significant", weekdayOnly: true, need: { component: "tactical", below: 82 } }
    ]
  },
  { id: "schedule_operational_cycle", schemaVersion: 2, name: "Operational Requirements", horizonDays: 28, entries: [] }
];

export const readinessModelDefinitions = [
  {
    id: "readiness_standard_unit", schemaVersion: 1, name: "Standard Unit Readiness Model",
    weights: { personnelFill: 0.25, individualReadiness: 0.20, training: 0.20, cohesion: 0.10, equipment: 0.15, fatigue: 0.10 }
  }
];
