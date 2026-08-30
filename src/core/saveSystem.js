const SAVE_KEY = "warSim_save";
const LEGACY_SAVE_KEY = "warSim_v0_1_0_save";

export function saveToLocalStorage(state) {
  const payload = {
    saveFormatVersion: 2,
    savedAt: new Date().toISOString(),
    gameVersion: state.gameVersion,
    worldState: state
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload.savedAt;
}

export function loadFromLocalStorage() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    if (localStorage.getItem(LEGACY_SAVE_KEY)) {
      throw new Error("A v0.1.0 save exists, but v0.1.1 uses the new career schema. Start a new v0.1.1 career; legacy migration will be added before persistent campaigns matter.");
    }
    return null;
  }

  const payload = JSON.parse(raw);
  if (payload.saveFormatVersion !== 2) throw new Error(`Unsupported save format: ${payload.saveFormatVersion}`);
  return payload.worldState;
}

export function clearLocalSave() {
  localStorage.removeItem(SAVE_KEY);
}
