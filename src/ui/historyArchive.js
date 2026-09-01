import { readUiJson, writeUiJson } from "./uiStorage.js";

export function createHistoryArchiveController({ onChange, storage }) {
  function key(kind, personId) {
    return `war-sim:ui:archive:${kind}:${personId ?? "none"}`;
  }

  function read(kind, personId) {
    const values = readUiJson(key(kind, personId), [], storage);
    return new Set(Array.isArray(values) ? values : []);
  }

  function write(kind, personId, values) {
    writeUiJson(key(kind, personId), [...values], storage);
  }

  function archiveRecord(kind, personId, recordId) {
    archiveRecords(kind, personId, [recordId]);
  }

  function archiveRecords(kind, personId, recordIds) {
    const values = read(kind, personId);
    for (const id of recordIds) values.add(id);
    write(kind, personId, values);
    onChange();
  }

  function clear(kind, personId) {
    write(kind, personId, new Set());
    onChange();
  }

  function createControls({ kind, personId, hiddenCount = 0, archivedCount = 0, expanded = false, onToggle }) {
    const actions = document.createElement("div");
    actions.className = "history-actions";
    if (hiddenCount > 0) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "secondary compact-button";
      toggle.textContent = expanded ? "Recent Only" : `Show More (${hiddenCount})`;
      toggle.addEventListener("click", onToggle);
      actions.appendChild(toggle);
    }
    if (archivedCount > 0) {
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "secondary compact-button";
      restore.textContent = `Restore Archived (${archivedCount})`;
      restore.addEventListener("click", () => clear(kind, personId));
      actions.appendChild(restore);
    }
    return actions;
  }

  return { read, archiveRecord, archiveRecords, clear, createControls };
}
