import { createRegistry } from "../core/registry.js";
import { branchDefinitions } from "./branches.js";
import { rankDefinitions } from "./ranks.js";
import { roleDefinitions } from "./roles.js";
import { unitDefinitions } from "./unitDefinitions.js";
import { equipmentDefinitions } from "./equipment.js";
import { awardDefinitions } from "./awards.js";
import { schoolDefinitions } from "./schools.js";
import { qualificationDefinitions } from "./qualifications.js";

export const registries = Object.freeze({
  branches: createRegistry(branchDefinitions, "branches"),
  ranks: createRegistry(rankDefinitions, "ranks"),
  roles: createRegistry(roleDefinitions, "roles"),
  unitDefinitions: createRegistry(unitDefinitions, "unitDefinitions"),
  equipment: createRegistry(equipmentDefinitions, "equipment"),
  awards: createRegistry(awardDefinitions, "awards"),
  schools: createRegistry(schoolDefinitions, "schools"),
  qualifications: createRegistry(qualificationDefinitions, "qualifications")
});
