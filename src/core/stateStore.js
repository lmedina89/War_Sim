export function createStateStore(initialState, buildIndexes) {
  let state = structuredClone(initialState);
  let indexes = buildIndexes(state);
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) listener(state, indexes);
  }

  return Object.freeze({
    getState() {
      return state;
    },
    getIndexes() {
      return indexes;
    },
    replaceState(nextState) {
      state = structuredClone(nextState);
      indexes = buildIndexes(state);
      notify();
    },
    transact(mutator) {
      const draft = structuredClone(state);
      mutator(draft);
      state = draft;
      indexes = buildIndexes(state);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
}
