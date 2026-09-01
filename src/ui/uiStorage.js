function safeStorage(storage) {
  if (storage !== undefined) return storage ?? null;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readUiText(key, fallback = null, storage) {
  try { return safeStorage(storage)?.getItem(key) ?? fallback; } catch { return fallback; }
}

export function writeUiText(key, value, storage) {
  try { safeStorage(storage)?.setItem(key, String(value)); return true; } catch { return false; }
}

export function readUiJson(key, fallback, storage) {
  const raw = readUiText(key, null, storage);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function writeUiJson(key, value, storage) {
  try { return writeUiText(key, JSON.stringify(value), storage); } catch { return false; }
}

export function initializeDisclosureState(root = document, storage) {
  root.querySelectorAll("details[data-persist-key]").forEach(details => {
    const key = `war-sim:ui:details:${details.dataset.persistKey}`;
    const saved = readUiText(key, null, storage);
    if (saved != null) details.open = saved === "open";
    details.addEventListener("toggle", () => writeUiText(key, details.open ? "open" : "closed", storage));
  });
}
