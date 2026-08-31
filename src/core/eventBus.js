export function createEventBus() {
  const listeners = new Map();

  function subscribe(type, listener) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(listener);
    return () => listeners.get(type)?.delete(listener);
  }

  function publish(event) {
    if (!event?.type) throw new Error("Runtime event requires a type.");
    for (const listener of listeners.get(event.type) ?? []) listener(event);
    for (const listener of listeners.get("*") ?? []) listener(event);
  }

  return Object.freeze({ subscribe, publish });
}
