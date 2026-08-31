function normalizeSeed(seed) {
  let value = Number(seed) >>> 0;
  if (value === 0) value = 0x6d2b79f5;
  return value;
}

export function seedFromText(text) {
  let hash = 2166136261 >>> 0;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return normalizeSeed(hash);
}

export function nextRandom(state) {
  let x = normalizeSeed(state.world.rngState ?? state.world.seed);
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.world.rngState = x >>> 0;
  return (state.world.rngState >>> 0) / 4294967296;
}

export function randomInt(state, min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error("Invalid random integer range.");
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}
