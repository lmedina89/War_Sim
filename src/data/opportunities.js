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
  { id: "objective_report_unit", schemaVersion: 1, name: "Report to Assigned Unit", description: "Join your assigned squad and establish your initial service record.", completionRule: "has_assignment" },
  { id: "objective_complete_training", schemaVersion: 1, name: "Complete Initial Training Activity", description: "Complete at least one focused activity or scheduled unit duty.", completionRule: "has_activity" },
  { id: "objective_build_readiness", schemaVersion: 1, name: "Build Personal Readiness", description: "Reach at least 75% personal readiness.", completionRule: "minimum_readiness", threshold: 75 },
  { id: "objective_promotion_eligible", schemaVersion: 1, name: "Reach Promotion Eligibility", description: "Satisfy all current requirements for your next rank.", completionRule: "promotion_eligible" }
];
