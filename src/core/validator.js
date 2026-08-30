const REQUIRED_STORES = [
  "people",
  "units",
  "unitSlots",
  "loadouts",
  "careerEvents",
  "qualificationRecords"
];

export function validateWorldState(state, registries) {
  const errors = [];

  if (!state || typeof state !== "object") errors.push("State must be an object.");
  if (state?.schemaVersion !== 1) errors.push("Unsupported world-state schemaVersion.");
  if (!state?.playerPersonId) errors.push("Missing playerPersonId.");

  for (const storeName of REQUIRED_STORES) {
    if (!state?.entities?.[storeName] || typeof state.entities[storeName] !== "object") {
      errors.push(`Missing entity store: ${storeName}`);
    }
  }

  const people = state?.entities?.people ?? {};
  for (const person of Object.values(people)) {
    if (!person.id) errors.push("Person missing id.");
    if (person.schemaVersion !== 1) errors.push(`${person.id}: unsupported Person schema.`);
    if (!registries.ranks.has(person.affiliation.rankId)) errors.push(`${person.id}: invalid rankId.`);
    if (!registries.roles.has(person.affiliation.roleId)) errors.push(`${person.id}: invalid roleId.`);
    if (!registries.branches.has(person.affiliation.branchId)) errors.push(`${person.id}: invalid branchId.`);
    if (person.affiliation.unitId && !state.entities.units[person.affiliation.unitId]) {
      errors.push(`${person.id}: unitId does not exist.`);
    }
  }

  const units = state?.entities?.units ?? {};
  for (const unit of Object.values(units)) {
    if (unit.schemaVersion !== 1) errors.push(`${unit.id}: unsupported Unit schema.`);
    if (!registries.unitDefinitions.has(unit.definitionId)) errors.push(`${unit.id}: invalid unit definition.`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
