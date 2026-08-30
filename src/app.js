import { registries } from "./data/registries.js";
import { createStateStore } from "./core/stateStore.js";
import { validateWorldState } from "./core/validator.js";
import { saveToLocalStorage, loadFromLocalStorage, clearLocalSave } from "./core/saveSystem.js";
import { createInitialWorldState } from "./state/initialState.js";
import { createPlayerCareer } from "./commands/createPlayerCareer.js";
import { promotePerson } from "./commands/promotePerson.js";
import { completeSchool } from "./commands/awardQualification.js";
import { advanceWorldDays, grantTrainingExperience } from "./commands/advanceCareer.js";
import { selectCurrentSquad } from "./selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "./selectors/selectCareerRecord.js";

const store = createStateStore(createInitialWorldState());

const els = {
  newCareerPanel: document.querySelector("#new-career-panel"),
  careerContent: document.querySelector("#career-content"),
  newCareerForm: document.querySelector("#new-career-form"),
  firstName: document.querySelector("#first-name"),
  lastName: document.querySelector("#last-name"),
  branchSelect: document.querySelector("#branch-select"),
  squadMeta: document.querySelector("#squad-meta"),
  squadBody: document.querySelector("#squad-body"),
  careerCard: document.querySelector("#career-card"),
  promotionCard: document.querySelector("#promotion-card"),
  schoolsAwards: document.querySelector("#schools-awards"),
  relationships: document.querySelector("#relationships"),
  careerEvents: document.querySelector("#career-events"),
  diagnostics: document.querySelector("#diagnostics"),
  status: document.querySelector("#status-message"),
  train: document.querySelector("#train-player"),
  advanceTime: document.querySelector("#advance-time"),
  promote: document.querySelector("#promote-player"),
  airborne: document.querySelector("#airborne-player"),
  leadership: document.querySelector("#leadership-player"),
  save: document.querySelector("#save-game"),
  load: document.querySelector("#load-game"),
  newCareer: document.querySelector("#new-career")
};

for (const branch of registries.branches.values()) {
  const option = document.createElement("option");
  option.value = branch.id;
  option.textContent = branch.name;
  els.branchSelect.appendChild(option);
}

function setStatus(message, tone = "") {
  els.status.textContent = message;
  els.status.className = `status-message ${tone}`.trim();
}

function statLine(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "statline";
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("strong");
  val.textContent = String(value);
  wrapper.append(key, val);
  return wrapper;
}

function renderList(container, items, emptyText) {
  container.replaceChildren();
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = emptyText;
    container.appendChild(p);
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "compact-list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function render() {
  const state = store.getState();
  const indexes = store.getIndexes();
  const validation = validateWorldState(state, registries);
  const hasPlayer = Boolean(state.playerPersonId);

  els.newCareerPanel.hidden = hasPlayer;
  els.careerContent.hidden = !hasPlayer;

  if (!hasPlayer) {
    els.diagnostics.textContent = "";
    return;
  }

  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId);
  const career = selectCareerRecord(state, indexes, registries, state.playerPersonId);

  els.squadMeta.textContent = `${squad.unitName} · ${squad.members.length} personnel · Readiness ${squad.readiness}% · Morale ${squad.morale}% · ${state.world.date}`;
  els.squadBody.replaceChildren(...squad.members.map(member => {
    const tr = document.createElement("tr");
    if (member.isPlayer) tr.className = "player-row";
    for (const value of [member.rank, member.name, member.role, `${member.health}%`, `${member.morale}%`, member.weaponName, member.status]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    return tr;
  }));

  els.careerCard.replaceChildren(
    statLine("Name", career.name),
    statLine("Branch", career.branch),
    statLine("Rank", career.rank),
    statLine("Pay Grade", career.payGrade),
    statLine("Role", career.role),
    statLine("Experience", career.experience),
    statLine("Prestige", career.prestige),
    statLine("Simulation Tier", state.entities.people[state.playerPersonId].simulationTier)
  );

  els.promotionCard.replaceChildren();
  if (!career.promotion.nextRank) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No higher rank is defined in this foundation build.";
    els.promotionCard.appendChild(p);
    els.promote.disabled = true;
  } else {
    els.promotionCard.append(
      statLine("Next Rank", `${career.promotion.nextRank.abbreviation} · ${career.promotion.nextRank.name}`),
      statLine("Eligible", career.promotion.eligible ? "Yes" : "No")
    );
    const reasonBox = document.createElement("div");
    renderList(reasonBox, career.promotion.reasons, "All current requirements are satisfied.");
    els.promotionCard.appendChild(reasonBox);
    els.promote.disabled = !career.promotion.eligible;
  }

  const schoolAwardItems = [
    ...career.qualifications.map(item => `${item.name} — ${item.completedDate}`),
    ...career.awards.map(item => `${item.name} (${item.category}) — ${item.earnedDate}`)
  ];
  renderList(els.schoolsAwards, schoolAwardItems, "No schools, qualifications, or awards recorded yet.");
  renderList(
    els.relationships,
    career.relationships.map(rel => `${rel.otherName} · ${rel.relationshipType} · familiarity ${rel.familiarity} · trust ${rel.trust}`),
    "No relationship records."
  );

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
    worldSchemaVersion: state.schemaVersion,
    gameVersion: state.gameVersion,
    registryCounts: {
      branches: registries.branches.size,
      ranks: registries.ranks.size,
      roles: registries.roles.size,
      unitDefinitions: registries.unitDefinitions.size,
      equipment: registries.equipment.size,
      awards: registries.awards.size,
      schools: registries.schools.size,
      qualifications: registries.qualifications.size
    },
    runtimeCounts: Object.fromEntries(Object.entries(state.entities).map(([name, collection]) => [name, Object.keys(collection).length])),
    indexedSquadMembers: indexes.peopleByUnitId.get(squad.unitId)?.length ?? 0,
    playerRelationships: indexes.relationshipsByPersonId.get(state.playerPersonId)?.length ?? 0
  }, null, 2);
}

function handleError(error) {
  console.error(error);
  setStatus(error instanceof Error ? error.message : String(error), "bad");
}

els.newCareerForm.addEventListener("submit", event => {
  event.preventDefault();
  try {
    createPlayerCareer(store, registries, {
      firstName: els.firstName.value,
      lastName: els.lastName.value,
      branchId: els.branchSelect.value
    });
    setStatus("Career created. Player identity is now stored as a persistent Person entity.", "good");
  } catch (error) { handleError(error); }
});

els.train.addEventListener("click", () => {
  try {
    grantTrainingExperience(store, store.getState().playerPersonId, 250);
    setStatus("Training complete: +250 experience.", "good");
  } catch (error) { handleError(error); }
});

els.advanceTime.addEventListener("click", () => {
  try {
    advanceWorldDays(store, 30);
    setStatus("World advanced by 30 days.", "good");
  } catch (error) { handleError(error); }
});

els.promote.addEventListener("click", () => {
  try {
    promotePerson(store, registries, store.getState().playerPersonId);
    setStatus("Promotion recorded in canonical promotion history.", "good");
  } catch (error) { handleError(error); }
});

els.airborne.addEventListener("click", () => {
  try {
    completeSchool(store, registries, store.getState().playerPersonId, "school_airborne");
    setStatus("Airborne School completed; qualification and badge records created.", "good");
  } catch (error) { handleError(error); }
});

els.leadership.addEventListener("click", () => {
  try {
    completeSchool(store, registries, store.getState().playerPersonId, "school_leadership");
    setStatus("Basic Leader Course completed.", "good");
  } catch (error) { handleError(error); }
});

els.save.addEventListener("click", () => {
  try {
    const result = validateWorldState(store.getState(), registries);
    if (!result.ok) throw new Error(`Save blocked: ${result.errors.join(" | ")}`);
    const when = saveToLocalStorage(store.getState());
    setStatus(`Saved ${when}`, "good");
  } catch (error) { handleError(error); }
});

els.load.addEventListener("click", () => {
  try {
    const loaded = loadFromLocalStorage();
    if (!loaded) throw new Error("No v0.1.1 local save exists yet.");
    const result = validateWorldState(loaded, registries);
    if (!result.ok) throw new Error(`Load blocked: ${result.errors.join(" | ")}`);
    store.replaceState(loaded);
    setStatus("Save loaded and validated.", "good");
  } catch (error) { handleError(error); }
});

els.newCareer.addEventListener("click", () => {
  clearLocalSave();
  store.replaceState(createInitialWorldState());
  els.newCareerForm.reset();
  els.branchSelect.value = registries.branches.values()[0]?.id ?? "";
  setStatus("New career ready. Previous local v0.1.1 save cleared.", "warn");
});

store.subscribe(render);
render();
