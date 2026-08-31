export const simulationTierDefinitions = [
  { id: "sim_tier_0", schemaVersion: 1, tier: 0, name: "Player", updateMode: "full", description: "Highest-detail persistent simulation for the player." },
  { id: "sim_tier_1", schemaVersion: 1, tier: 1, name: "Immediate Personnel", updateMode: "detailed_event", description: "Persistent detailed simulation for squad and other important nearby personnel." },
  { id: "sim_tier_2", schemaVersion: 1, tier: 2, name: "Military Personnel", updateMode: "event_aggregate", description: "Persistent identity with lower-frequency event-driven simulation." },
  { id: "sim_tier_3", schemaVersion: 1, tier: 3, name: "Population Cohort", updateMode: "aggregate", description: "Statistical cohort simulation for large civilian and military populations." }
];
