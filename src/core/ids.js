let fallbackCounter = 0;

export function createStableId(prefix = "ent") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  fallbackCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${fallbackCounter.toString(36).padStart(4, "0")}`;
}
