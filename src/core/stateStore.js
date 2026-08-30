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
      state = structuredClone(nextState);
      indexes = buildIndexes(state);
      notify();
    },
    mutate(mutator, indexGroups = []) {
      mutator(state);
      if (indexGroups.length) indexes = refreshIndexes(state, indexes, indexGroups);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
}
