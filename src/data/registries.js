import { createRegistry } from "../core/registry.js";
import { branchDefinitions } from "./branches.js";
import { rankDefinitions } from "./ranks.js";
import { roleDefinitions } from "./roles.js";
import { unitDefinitions } from "./unitDefinitions.js";
import { equipmentDefinitions } from "./equipment.js";
import { awardDefinitions } from "./awards.js";
import { schoolDefinitions } from "./schools.js";
import { qualificationDefinitions } from "./qualifications.js";
import { simulationTierDefinitions } from "./simulationTiers.js";
import { echelonDefinitions } from "./echelons.js";
import { billetDefinitions } from "./billetDefinitions.js";
import { organizationDefinitions } from "./organizationDefinitions.js";
import { componentDefinitions } from "./components.js";
import { specialtyDefinitions } from "./specialties.js";
import { contractDefinitions } from "./contracts.js";
import { generationProfileDefinitions } from "./generationProfiles.js";
import { careerStartScenarioDefinitions } from "./careerStartScenarios.js";
import { skillDefinitions } from "./skills.js";
import { activityDefinitions } from "./activities.js";
import { gameplayEventDefinitions, eventTableDefinitions } from "./gameplayEvents.js";
import { feedbackPresentationDefinitions, performanceRatingDefinitions, relationshipBandDefinitions, statusPresentationDefinitions, documentPresentationDefinitions } from "./presentation.js";
import { dutyDefinitions, trainingPhaseDefinitions, scheduleTemplateDefinitions, readinessModelDefinitions } from "./duties.js";
import { opportunityDefinitions, careerObjectiveDefinitions } from "./opportunities.js";
import { authorityDefinitions } from "./authorities.js";

export const registries = Object.freeze({
  branches: createRegistry(branchDefinitions, "branches"),
  ranks: createRegistry(rankDefinitions, "ranks"),
  roles: createRegistry(roleDefinitions, "roles"),
  unitDefinitions: createRegistry(unitDefinitions, "unitDefinitions"),
  equipment: createRegistry(equipmentDefinitions, "equipment"),
  awards: createRegistry(awardDefinitions, "awards"),
  schools: createRegistry(schoolDefinitions, "schools"),
  qualifications: createRegistry(qualificationDefinitions, "qualifications"),
  simulationTiers: createRegistry(simulationTierDefinitions, "simulationTiers"),
  echelons: createRegistry(echelonDefinitions, "echelons"),
  billets: createRegistry(billetDefinitions, "billets"),
  organizations: createRegistry(organizationDefinitions, "organizations"),
  components: createRegistry(componentDefinitions, "components"),
  specialties: createRegistry(specialtyDefinitions, "specialties"),
  contracts: createRegistry(contractDefinitions, "contracts"),
  generationProfiles: createRegistry(generationProfileDefinitions, "generationProfiles"),
  careerStartScenarios: createRegistry(careerStartScenarioDefinitions, "careerStartScenarios"),
  skills: createRegistry(skillDefinitions, "skills"),
  activities: createRegistry(activityDefinitions, "activities"),
  gameplayEvents: createRegistry(gameplayEventDefinitions, "gameplayEvents"),
  eventTables: createRegistry(eventTableDefinitions, "eventTables"),
  feedbackPresentations: createRegistry(feedbackPresentationDefinitions, "feedbackPresentations"),
  performanceRatings: createRegistry(performanceRatingDefinitions, "performanceRatings"),
  relationshipBands: createRegistry(relationshipBandDefinitions, "relationshipBands"),
  statusPresentations: createRegistry(statusPresentationDefinitions, "statusPresentations"),
  documentPresentations: createRegistry(documentPresentationDefinitions, "documentPresentations"),
  duties: createRegistry(dutyDefinitions, "duties"),
  trainingPhases: createRegistry(trainingPhaseDefinitions, "trainingPhases"),
  scheduleTemplates: createRegistry(scheduleTemplateDefinitions, "scheduleTemplates"),
  readinessModels: createRegistry(readinessModelDefinitions, "readinessModels"),
  opportunities: createRegistry(opportunityDefinitions, "opportunities"),
  careerObjectives: createRegistry(careerObjectiveDefinitions, "careerObjectives"),
  authorities: createRegistry(authorityDefinitions, "authorities")
});
