function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function advanceClock(draft, days) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Days must be between 1 and 3650.");
  draft.world.date = addDays(draft.world.date, days);
  draft.world.clock.elapsedDays += days;
}

export function setSimulationPaused(draft, paused) {
  draft.world.clock.paused = Boolean(paused);
}

export function setSimulationSpeed(draft, speed) {
  if (![1, 2, 5].includes(speed)) throw new Error("Simulation speed must be 1, 2, or 5.");
  draft.world.clock.speed = speed;
}
