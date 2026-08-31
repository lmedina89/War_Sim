export const opportunityDefinitions = [
  {
    id: "opportunity_airborne_school", schemaVersion: 1, name: "Airborne School Volunteer Slot", type: "school",
    schoolId: "school_airborne", minimumServiceDays: 45, minimumRankLevel: 1, minimumHealth: 75,
    allowedStatuses: ["active", "training"], expiresAfterDays: 21, reportDelayDays: 10, presentationId: "feedback_attention",
    title: "Volunteer Request — Airborne School",
    message: "A volunteer training seat is available. Accepting generates school orders and reserves a report date."
  },
  {
    id: "opportunity_basic_leader_course", schemaVersion: 1, name: "Basic Leader Course Seat", type: "school",
    schoolId: "school_leadership", minimumServiceDays: 180, minimumRankLevel: 2, minimumHealth: 70,
    allowedStatuses: ["active", "training"], expiresAfterDays: 30, reportDelayDays: 14, presentationId: "feedback_attention",
    title: "Professional Military Education Opportunity",
    message: "A Basic Leader Course seat is available for eligible personnel."
  }
];

export const careerObjectiveDefinitions = [
  {
    id: "objective_report_unit", schemaVersion: 2, groupId: "objective_group_initial_career", phase: "onboarding", order: 10,
    name: "Report to Assigned Unit", description: "Join your assigned squad and establish your initial service record.", completionRule: "has_assignment"
  },
  {
    id: "objective_complete_training", schemaVersion: 2, groupId: "objective_group_initial_career", phase: "onboarding", order: 20,
    name: "Complete Initial Training Activity", description: "Complete at least one focused activity or scheduled unit duty.", completionRule: "has_activity"
  },
  {
    id: "objective_build_readiness", schemaVersion: 2, groupId: "objective_group_initial_career", phase: "onboarding", order: 30,
    name: "Build Personal Readiness", description: "Reach at least 75% personal readiness.", completionRule: "minimum_readiness", threshold: 75
  },
  {
    id: "objective_promotion_eligible", schemaVersion: 2, groupId: "objective_group_initial_career", phase: "onboarding", order: 40,
    name: "Reach Promotion Eligibility", description: "Satisfy all current requirements for your next rank.", completionRule: "promotion_eligible"
  },

  // Continuity objectives are definition-driven and repeatable. They are generated only after
  // the initial-career objective group is complete, based on current canonical world state.
  {
    id: "objective_continuity_personal_readiness", schemaVersion: 1, groupId: "objective_group_career_continuity", phase: "continuity", order: 110,
    name: "Restore Personal Readiness", description: "Bring personal readiness back to at least 85%.",
    activationRule: "readiness_below", activationThreshold: 85, completionRule: "minimum_readiness", threshold: 85,
    repeatable: true, cooldownDays: 21
  },
  {
    id: "objective_continuity_unit_readiness", schemaVersion: 1, groupId: "objective_group_career_continuity", phase: "continuity", order: 120,
    name: "Support Unit Readiness", description: "Help your assigned unit meet the current training-phase readiness target.",
    activationRule: "unit_readiness_below_phase_target", completionRule: "unit_readiness_at_phase_target",
    repeatable: true, cooldownDays: 30
  },
  {
    id: "objective_continuity_qualification", schemaVersion: 1, groupId: "objective_group_career_continuity", phase: "continuity", order: 130,
    name: "Maintain Service-Rifle Qualification", description: "Earn or renew your service-rifle qualification before it becomes a readiness problem.",
    activationRule: "qualification_missing_or_due", qualificationId: "qualification_service_rifle", dueWithinDays: 60,
    completionRule: "qualification_current", repeatable: true, cooldownDays: 60
  },
  {
    id: "objective_continuity_promotion", schemaVersion: 1, groupId: "objective_group_career_continuity", phase: "continuity", order: 140,
    name: "Prepare for the Next Promotion", description: "Meet the requirements for your next rank as your career develops.",
    activationRule: "promotion_not_eligible", completionRule: "promotion_eligible", repeatable: true, cooldownDays: 30
  },
  {
    id: "objective_continuity_opportunity", schemaVersion: 1, groupId: "objective_group_career_continuity", phase: "continuity", order: 150,
    name: "Respond to Career Opportunity", description: "Review and respond to an active school or career opportunity before its deadline.",
    activationRule: "open_opportunity", completionRule: "no_open_opportunity", repeatable: true, cooldownDays: 0
  }
];
