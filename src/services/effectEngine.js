import { ensureUnitTrainingProfile } from "./unitReadiness.js";
function getPath(object, path) {
  const parts = String(path).split(".");
  let current = object;
  for (let i = 0; i < parts.length - 1; i++) current = current?.[parts[i]];
  return { object: current, key: parts.at(-1) };
}

function numericEffect(target, field, effect) {
  const ref = getPath(target, field);
  if (!ref.object) throw new Error(`Cannot apply effect to ${field}.`);
  const prior = Number(ref.object[ref.key] ?? 0);
  let next = effect.operation === "set" ? Number(effect.value) : prior + Number(effect.value);
  if (effect.clamp) next = Math.max(effect.clamp[0], Math.min(effect.clamp[1], next));
  ref.object[ref.key] = next;
}

export function ensureSkillProfile(draft, registries, personId, initialValue = 20) {
  const id = `skills_${personId}`;
  const direct = draft.entities.skillProfiles?.[id];
  if (direct?.personId === personId) return direct;
  const existing = Object.values(draft.entities.skillProfiles ?? {}).find(profile => profile.personId === personId);
  if (existing) return existing;
  const values = Object.fromEntries(registries.skills.values().map(skill => [skill.id, initialValue]));
  const profile = { id, schemaVersion: 1, personId, values };
  draft.entities.skillProfiles[id] = profile;
  return profile;
}

export function applyEffects(draft, registries, { personId, unitId = null, relationshipIds = null, effects = [] }) {
  const person = draft.entities.people[personId];
  if (!person) throw new Error(`Unknown person ${personId}.`);
  const profile = ensureSkillProfile(draft, registries, personId);
  const unit = unitId ? draft.entities.units[unitId] : null;
  for (const effect of effects) {
    if (effect.target === "skill") {
      if (!registries.skills.has(effect.skillId)) throw new Error(`Unknown skill ${effect.skillId}.`);
      const prior = Number(profile.values[effect.skillId] ?? 0);
      const def = registries.skills.get(effect.skillId);
      const value = effect.operation === "set" ? Number(effect.value) : prior + Number(effect.value);
      profile.values[effect.skillId] = Math.max(def.minimum, Math.min(def.maximum, value));
    } else if (effect.target === "person") numericEffect(person, effect.field, effect);
    else if (effect.target === "unit" && unit) numericEffect(unit, effect.field, effect);
    else if (effect.target === "unitTraining" && unit) {
      const training = ensureUnitTrainingProfile(draft, unit.id, unit.readinessModelId);
      numericEffect(training.values, effect.field, effect);
    }
    else if (effect.target === "relationships") {
      const records = relationshipIds == null ? Object.values(draft.entities.relationshipRecords) : relationshipIds.map(id => draft.entities.relationshipRecords[id]).filter(Boolean);
      for (const relationship of records) {
        if (relationship.personAId !== personId && relationship.personBId !== personId) continue;
        const otherId = relationship.personAId === personId ? relationship.personBId : relationship.personAId;
        if (unitId && draft.entities.people[otherId]?.affiliation.unitId !== unitId) continue;
        numericEffect(relationship, effect.field, effect);
      }
    }
  }
}
