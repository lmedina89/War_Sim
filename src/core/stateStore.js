import { buildIndexes, refreshIndexes } from "../indexes/buildIndexes.js";

export function createStateStore(initialState) {
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
      const candidate = structuredClone(nextState);
      const candidateIndexes = buildIndexes(candidate);
      state = candidate;
      indexes = candidateIndexes;
      notify();
    },
    mutate(mutator, indexGroups = []) {
      // Mutations execute against an isolated working copy. The live state is
      // committed only after both the mutator and requested index refreshes
      // succeed, preventing a thrown command from leaving half-applied state.
      const candidate = structuredClone(state);
      mutator(candidate);
      const candidateIndexes = indexGroups.length
        ? refreshIndexes(candidate, indexes, indexGroups)
        : indexes;
      state = candidate;
      indexes = candidateIndexes;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
}
