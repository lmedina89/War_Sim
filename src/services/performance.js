import { randomInt } from "../core/rng.js";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

export function resolvePerformanceRating(registries, score) {
  return registries.performanceRatings.values().slice().sort((a,b) => (b.minimumScore ?? 0) - (a.minimumScore ?? 0)).find(def => score >= (def.minimumScore ?? 0)) ?? registries.performanceRatings.values().at(-1);
}

export function calculateIndividualPerformanceScore(draft, person, skillProfile, activity) {
  const ids = activity.performanceSkillIds ?? [];
  const skillBase = ids.length ? ids.reduce((sum,id) => sum + (skillProfile.values[id] ?? 20), 0) / ids.length : (person.condition.readiness + person.condition.morale) / 2;
  const condition = person.condition;
  return clamp(skillBase * 0.55 + condition.health * 0.15 + condition.morale * 0.10 + condition.readiness * 0.15 + (100 - condition.fatigue) * 0.05 + randomInt(draft, -8, 8));
}

export function calculateDutyPerformanceScore(draft, person, readinessResult, trainingValues = {}) {
  const trainingValuesList = [trainingValues.physical, trainingValues.weapons, trainingValues.tactical, trainingValues.cohesion, trainingValues.discipline].filter(Number.isFinite);
  const trainingBase = trainingValuesList.length ? trainingValuesList.reduce((sum,value)=>sum+value,0)/trainingValuesList.length : (readinessResult?.overall ?? person.condition.readiness);
  return clamp((readinessResult?.overall ?? 50) * 0.45 + trainingBase * 0.25 + person.condition.morale * 0.10 + person.condition.readiness * 0.10 + (100 - person.condition.fatigue) * 0.10 + randomInt(draft, -6, 6));
}
