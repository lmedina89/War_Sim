import { registries } from "./data/registries.js";
import { createStateStore } from "./core/stateStore.js";
import { validateWorldState } from "./core/validator.js";
import { saveToLocalStorage, loadFromLocalStorage, clearLocalSave } from "./core/saveSystem.js";
import { createInitialWorldState } from "./state/initialState.js";
import { buildIndexes } from "./indexes/buildIndexes.js";
import { promotePerson } from "./commands/promotePerson.js";
import { awardQualification } from "./commands/awardQualification.js";
import { selectCurrentSquad } from "./selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "./selectors/selectCareerRecord.js";

const store = createStateStore(createInitialWorldState(), buildIndexes);

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

  els.squadMeta.textContent = `${squad.unitName} · ${squad.members.length} personnel · Readiness ${squad.readiness}% · Morale ${squad.morale}%`;

  els.squadBody.replaceChildren(...squad.members.map(member => {
    const tr = document.createElement("tr");
    for (const value of [
      member.rank,
      member.name,
      member.role,
      `${member.health}%`,
      `${member.morale}%`,
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
    ["Schools", career.qualifications.length ? career.qualifications.map(q => q.schoolName).join(", ") : "None"]
  ].map(([label, value]) => `<div class="statline"><span>${label}</span><strong>${value}</strong></div>`).join("");

  els.careerEvents.replaceChildren(...career.events.map(event => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = event.date;
    const text = document.createTextNode(event.label);
    li.append(time, text);
    return li;
  }));

  els.diagnostics.textContent = JSON.stringify({
    valid: validation.ok,
    validationErrors: validation.errors,
    registryCounts: {
      branches: registries.branches.size,
      ranks: registries.ranks.size,
      roles: registries.roles.size,
      unitDefinitions: registries.unitDefinitions.size,
      equipment: registries.equipment.size,
      awards: registries.awards.size,
      schools: registries.schools.size
    },
    runtimeCounts: {
      people: Object.keys(state.entities.people).length,
      units: Object.keys(state.entities.units).length,
      unitSlots: Object.keys(state.entities.unitSlots).length,
      careerEvents: Object.keys(state.entities.careerEvents).length,
      qualifications: Object.keys(state.entities.qualificationRecords).length
    },
    indexedSquadMembers: indexes.peopleByUnitId.get("unit_sq_001")?.length ?? 0
  }, null, 2);
}

function showError(error) {
  console.error(error);
  alert(error instanceof Error ? error.message : String(error));
}

els.promote.addEventListener("click", () => {
  try { promotePerson(store, registries, store.getState().playerPersonId); } catch (error) { showError(error); }
});

els.airborne.addEventListener("click", () => {
  try { awardQualification(store, registries, store.getState().playerPersonId, "school_airborne"); } catch (error) { showError(error); }
});

els.save.addEventListener("click", () => {
  try {
    const result = validateWorldState(store.getState(), registries);
    if (!result.ok) throw new Error(`Save blocked: ${result.errors.join(" | ")}`);
    const when = saveToLocalStorage(store.getState());
    alert(`Saved ${when}`);
  } catch (error) { showError(error); }
});

els.load.addEventListener("click", () => {
  try {
    const loaded = loadFromLocalStorage();
    if (!loaded) throw new Error("No local save exists yet.");
    const result = validateWorldState(loaded, registries);
    if (!result.ok) throw new Error(`Load blocked: ${result.errors.join(" | ")}`);
    store.replaceState(loaded);
  } catch (error) { showError(error); }
});

els.reset.addEventListener("click", () => {
  clearLocalSave();
  store.replaceState(createInitialWorldState());
});

store.subscribe(render);
render();
