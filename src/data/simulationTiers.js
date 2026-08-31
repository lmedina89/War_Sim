export const simulationTierDefinitions = [
  { id: "sim_tier_0", schemaVersion: 2, tier: 0, name: "Player", playerLabel: "Player Simulation", updateMode: "full", description: "Highest-detail persistent simulation for the player." },
  { id: "sim_tier_1", schemaVersion: 2, tier: 1, name: "Immediate Personnel", playerLabel: "Detailed Simulation", updateMode: "detailed_event", description: "Persistent detailed simulation for your squad and other immediately relevant personnel." },
  { id: "sim_tier_2", schemaVersion: 2, tier: 2, name: "Military Personnel", playerLabel: "Background Simulation", updateMode: "event_aggregate", description: "Persistent identity and career progression using lower-frequency event-driven simulation until this person becomes directly relevant." },
  { id: "sim_tier_3", schemaVersion: 2, tier: 3, name: "Population Cohort", playerLabel: "Aggregate Simulation", updateMode: "aggregate", description: "Statistical cohort simulation for large populations that do not currently require individual detail." }
];
