const SAVE_KEY = "warSim_v0_1_0_save";

export function saveToLocalStorage(state) {
  const payload = {
    saveFormatVersion: 1,
    savedAt: new Date().toISOString(),
    worldState: state
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload.savedAt;
}

export function loadFromLocalStorage() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  const payload = JSON.parse(raw);
  if (payload.saveFormatVersion !== 1) {
    throw new Error(`Unsupported save format: ${payload.saveFormatVersion}`);
  }
  return payload.worldState;
}

export function clearLocalSave() {
  localStorage.removeItem(SAVE_KEY);
}
