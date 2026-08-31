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


export const statusPresentationDefinitions = [
  { id: "active", schemaVersion: 1, label: "ACTIVE", tone: "good", priority: 20 },
  { id: "available", schemaVersion: 1, label: "AVAILABLE", tone: "good", priority: 20 },
  { id: "training", schemaVersion: 1, label: "IN TRAINING", tone: "attention", priority: 30 },
  { id: "leave", schemaVersion: 1, label: "ON LEAVE", tone: "routine", priority: 20 },
  { id: "tdy", schemaVersion: 1, label: "TDY", tone: "attention", priority: 30 },
  { id: "deployed", schemaVersion: 1, label: "DEPLOYED", tone: "attention", priority: 40 },
  { id: "hospitalized", schemaVersion: 1, label: "HOSPITALIZED", tone: "critical", priority: 70 },
  { id: "wounded", schemaVersion: 1, label: "WOUNDED", tone: "critical", priority: 80 },
  { id: "missing", schemaVersion: 1, label: "MISSING", tone: "critical", priority: 90 },
  { id: "pow", schemaVersion: 1, label: "POW", tone: "critical", priority: 100 },
  { id: "separated", schemaVersion: 1, label: "SEPARATED", tone: "routine", priority: 10 },
  { id: "retired", schemaVersion: 1, label: "RETIRED", tone: "routine", priority: 10 },
  { id: "deceased", schemaVersion: 1, label: "DECEASED", tone: "critical", priority: 100 },
  { id: "vacant", schemaVersion: 1, label: "VACANT", tone: "warning", priority: 50 },
  { id: "filled", schemaVersion: 1, label: "FILLED", tone: "good", priority: 20 },
  { id: "executed", schemaVersion: 1, label: "EXECUTED", tone: "good", priority: 20 },
  { id: "pending", schemaVersion: 1, label: "PENDING", tone: "attention", priority: 40 },
  { id: "cancelled", schemaVersion: 1, label: "CANCELLED", tone: "warning", priority: 30 },
  { id: "open", schemaVersion: 1, label: "OPEN", tone: "attention", priority: 40 },
  { id: "completed", schemaVersion: 1, label: "COMPLETED", tone: "good", priority: 20 }
];

export const documentPresentationDefinitions = [
  { id: "personnel_file", schemaVersion: 1, label: "PERSONNEL FILE", prefix: "PERS", classification: "OFFICIAL USE" },
  { id: "order", schemaVersion: 1, label: "OFFICIAL ORDERS", prefix: "ORD", classification: "HEADQUARTERS" },
  { id: "aar", schemaVersion: 1, label: "AFTER ACTION REPORT", prefix: "AAR", classification: "TRAINING RECORD" },
  { id: "notification", schemaVersion: 1, label: "MESSAGE CENTER", prefix: "MSG", classification: "PERSONNEL NOTICE" },
  { id: "service_record", schemaVersion: 1, label: "SERVICE RECORD", prefix: "SRV", classification: "PERMANENT RECORD" },
  { id: "unit_status", schemaVersion: 1, label: "UNIT STATUS", prefix: "UNIT", classification: "COMMAND DISPLAY" },
  { id: "career_record", schemaVersion: 1, label: "MILITARY SERVICE RECORD", prefix: "CAREER", classification: "PERSONNEL" }
];
