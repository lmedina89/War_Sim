function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function createRegistry(definitions, label = "registry") {
  const byId = Object.create(null);

  for (const definition of definitions) {
    if (!definition?.id) throw new Error(`${label}: definition missing id`);
    if (byId[definition.id]) throw new Error(`${label}: duplicate id ${definition.id}`);
    byId[definition.id] = deepFreeze(structuredClone(definition));
  }

  return Object.freeze({
    has(id) {
      return Boolean(byId[id]);
    },
    get(id) {
      const value = byId[id];
      if (!value) throw new Error(`${label}: unknown id ${id}`);
      return value;
    },
    values() {
      return Object.values(byId);
    },
    size: Object.keys(byId).length
  });
}
