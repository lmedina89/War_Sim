import { registries } from "./data/registries.js";
import { createStateStore } from "./core/stateStore.js";
import { validateWorldState, validateDefinitions } from "./core/validator.js";
import { createInitialWorldState } from "./state/initialState.js";
import { buildIndexes } from "./indexes/buildIndexes.js";
import { selectCurrentSquad } from "./selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "./selectors/selectCareerRecord.js";
import { listSaveMetadata, saveToSlot, loadFromSlot, deleteSlot, MANUAL_SLOT_IDS } from "./core/saveSystem.js";

const store = createStateStore(createInitialWorldState(), buildIndexes);
const definitionValidation = validateDefinitions(registries);

const els = {
  squadMeta: document.querySelector("#squad-meta"),
  squadBody: document.querySelector("#squad-body"),
  careerCard: document.querySelector("#career-card"),
  careerEvents: document.querySelector("#career-events"),
  diagnostics: document.querySelector("#diagnostics"),
  promote: document.querySelector("#promote-player"),
  airborne: document.querySelector("#award-airborne"),
  save: document.querySelector("#save-game"),
  load: document.querySelector("#load-game"),
  reset: document.querySelector("#reset-game")
};

function render() {
  const state = store.getState();
  const indexes = store.getIndexes();
  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId);
  const career = selectCareerRecord(state, indexes, registries, state.playerPersonId);
  const validation = validateWorldState(state, registries);

  els.squadMeta.textContent =
    `${squad.unitName} · ${squad.assignedStrength}/${squad.authorizedStrength} assigned · ` +
    `${squad.vacancies} vacancies · Readiness ${squad.readiness}% · Morale ${squad.morale}%`;

  els.squadBody.replaceChildren(...squad.members.map(member => {
    const tr = document.createElement("tr");
    for (const value of [
      member.rank,
      member.name,
      member.role,
      member.health == null ? "—" : `${member.health}%`,
      member.morale == null ? "—" : `${member.morale}%`,
      member.weaponName,
      member.status
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    return tr;
  }));

  els.careerCard.innerHTML = [
    ["Name", career.name],
    ["Branch", career.branch],
    ["Rank", career.rank],
    ["Pay Grade", career.payGrade],
    ["Role", career.role],
    ["Experience", career.experience],
    ["Prestige", career.prestige],
    ["Simulation Tier", career.simulationTier ?? 0]
  ].map(([label, value]) => `<div class="statline"><span>${label}</span><strong>${value}</strong></div>`).join("");

  els.careerEvents.replaceChildren(...career.events.map(event => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = event.date;
    li.append(time, document.createTextNode(event.label));
    return li;
  }));

  els.diagnostics.textContent = JSON.stringify({
    valid: validation.ok,
    validationErrors: validation.errors,
    definitionValidation,
    worldSchemaVersion: state.schemaVersion,
    gameVersion: state.gameVersion,
    registryCounts: {
      branches: registries.branches.size,
      ranks: registries.ranks.size,
      roles: registries.roles.size,
      echelons: registries.echelons.size,
      billetDefinitions: registries.billets.size,
      organizationDefinitions: registries.organizations.size
    },
    runtimeCounts: {
      people: Object.keys(state.entities.people).length,
      units: Object.keys(state.entities.units).length,
      billets: Object.keys(state.entities.billets).length
    },
    playerUnit: {
      assignedStrength: squad.assignedStrength,
      authorizedStrength: squad.authorizedStrength,
      vacancies: squad.vacancies
    }
  }, null, 2);
}

els.promote?.addEventListener("click", () => {
  alert("Promotion execution is intentionally disabled in this v0.2.0 UI stub while organization rules are being hardened.");
});

els.airborne?.addEventListener("click", () => {
  alert("Career actions remain in the engine but are not the focus of the v0.2.0 organization checkpoint.");
});

els.save?.addEventListener("click", () => {
  const slotId = prompt(`Choose slot: ${MANUAL_SLOT_IDS.join(", ")}`, "slot_01");
  if (!slotId || !MANUAL_SLOT_IDS.includes(slotId)) return;
  const result = validateWorldState(store.getState(), registries);
  if (!result.ok) return alert(result.errors.join("\n"));
  const meta = saveToSlot(slotId, store.getState(), registries);
  alert(`Saved ${meta.characterName} to ${slotId}.`);
});

els.load?.addEventListener("click", () => {
  const slots = listSaveMetadata().filter(x => !x.empty && MANUAL_SLOT_IDS.includes(x.slotId));
  if (!slots.length) return alert("No manual saves available.");
  const slotId = prompt(`Available: ${slots.map(s => s.slotId).join(", ")}`, slots[0].slotId);
  if (!slotId) return;
  const loaded = loadFromSlot(slotId);
  if (loaded) store.replaceState(loaded);
});

els.reset?.addEventListener("click", () => {
  if (confirm("Start a fresh v0.2.0 organization test career?")) {
    store.replaceState(createInitialWorldState());
  }
});

store.subscribe(render);
render();
