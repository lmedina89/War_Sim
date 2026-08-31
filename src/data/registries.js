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
  careerStartScenarios: createRegistry(careerStartScenarioDefinitions, "careerStartScenarios")
});
