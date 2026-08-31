export const feedbackPresentationDefinitions = [
  { id: "feedback_routine", schemaVersion: 1, priority: "normal", label: "ROUTINE", tone: "routine", emphasis: "standard" },
  { id: "feedback_attention", schemaVersion: 1, priority: "attention", label: "ATTENTION", tone: "attention", emphasis: "highlight" },
  { id: "feedback_critical", schemaVersion: 1, priority: "critical", label: "CRITICAL", tone: "critical", emphasis: "interrupt" }
];

export const performanceRatingDefinitions = [
  { id: "exceptional", schemaVersion: 1, label: "EXCEPTIONAL", tone: "excellent", description: "Performance significantly exceeded the expected standard." },
  { id: "strong", schemaVersion: 1, label: "STRONG", tone: "good", description: "Performance exceeded the expected standard." },
  { id: "satisfactory", schemaVersion: 1, label: "SATISFACTORY", tone: "routine", description: "Performance met the expected standard." },
  { id: "poor", schemaVersion: 1, label: "POOR", tone: "warning", description: "Performance fell below the expected standard." }
];

export const relationshipBandDefinitions = [
  { id: "relationship_hostile", schemaVersion: 1, minimumTrust: -100, maximumTrust: -40, label: "Hostile", tone: "bad" },
  { id: "relationship_strained", schemaVersion: 1, minimumTrust: -39, maximumTrust: -10, label: "Strained", tone: "warning" },
  { id: "relationship_neutral", schemaVersion: 1, minimumTrust: -9, maximumTrust: 19, label: "Neutral", tone: "routine" },
  { id: "relationship_positive", schemaVersion: 1, minimumTrust: 20, maximumTrust: 49, label: "Positive", tone: "good" },
  { id: "relationship_trusted", schemaVersion: 1, minimumTrust: 50, maximumTrust: 100, label: "Trusted", tone: "excellent" }
];
