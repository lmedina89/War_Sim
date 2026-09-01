export function createSaveManagerController({
  elements,
  getSlots,
  autosaveSlotId,
  describeSlot,
  confirmAction,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
}) {
  if (!elements?.dialog || !elements?.title || !elements?.modeLabel || !elements?.slots) {
    throw new Error("Save Manager requires dialog, title, modeLabel, and slots elements.");
  }

  let currentMode = "save";

  function makeButton(label, { secondary = false, onClick } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (secondary) button.className = "secondary";
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  function appendMetadata(card, meta) {
    if (meta.empty) {
      const empty = document.createElement("p");
      empty.textContent = "Empty";
      card.appendChild(empty);
      return;
    }

    for (const text of describeSlot(meta).filter(Boolean)) {
      const line = document.createElement("p");
      line.textContent = text;
      card.appendChild(line);
    }
  }

  function render(mode = currentMode) {
    currentMode = mode;
    elements.modeLabel.textContent = mode === "save" ? "SAVE CAREER" : "LOAD CAREER";
    elements.title.textContent = mode === "save" ? "Choose Save Slot" : "Choose Career to Load";
    elements.slots.replaceChildren();

    for (const meta of getSlots()) {
      const card = document.createElement("section");
      card.className = `save-slot ${meta.slotId === autosaveSlotId ? "autosave-slot" : ""}`.trim();

      const heading = document.createElement("h3");
      heading.textContent = meta.slotId === autosaveSlotId ? "Autosave" : `Save ${Number(meta.slotId.split("_")[1])}`;
      card.appendChild(heading);
      appendMetadata(card, meta);

      const actions = document.createElement("div");
      actions.className = "actions";

      if (mode === "save" && meta.slotId !== autosaveSlotId) {
        actions.appendChild(makeButton(meta.empty ? "Save Here" : "Overwrite", {
          onClick: async () => {
            if (!meta.empty && !(await confirmAction("Overwrite Save?", `Replace ${meta.characterName} in this slot?`))) return;
            const completed = await onSaveSlot(meta);
            if (completed !== false) render("save");
          },
        }));
      }

      if (mode === "load" && !meta.empty) {
        actions.appendChild(makeButton("Load", {
          onClick: async () => {
            const completed = await onLoadSlot(meta);
            if (completed !== false) elements.dialog.close();
          },
        }));
      }

      if (!meta.empty && meta.slotId !== autosaveSlotId) {
        actions.appendChild(makeButton("Delete", {
          secondary: true,
          onClick: async () => {
            if (!(await confirmAction("Delete Save?", `Permanently delete ${meta.characterName}?`))) return;
            const completed = await onDeleteSlot(meta);
            if (completed !== false) render(mode);
          },
        }));
      }

      card.appendChild(actions);
      elements.slots.appendChild(card);
    }
  }

  function open(mode) {
    render(mode);
    elements.dialog.showModal();
  }

  function close() {
    elements.dialog.close();
  }

  return {
    open,
    close,
    render,
    getMode: () => currentMode,
  };
}
