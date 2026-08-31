export function createEntityId(state, prefix = "ent") {
  if (!state?.world) throw new Error("Cannot create an entity ID without world state.");
  const next = Number.isInteger(state.world.nextEntitySequence) ? state.world.nextEntitySequence : 1;
  state.world.nextEntitySequence = next + 1;
  return `${prefix}_${next.toString(36).padStart(8, "0")}`;
}

export function createExternalId(prefix = "ext") {
  const time = Date.now().toString(36);
  const random = globalThis.crypto?.getRandomValues
    ? Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2))).map(v => v.toString(36)).join("")
    : `${performance.now().toString(36).replace(".", "")}`;
  return `${prefix}_${time}_${random}`;
}
