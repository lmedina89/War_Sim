import { registries } from "./data/registries.js";
import { createStateStore } from "./core/stateStore.js";
import { createEventBus } from "./core/eventBus.js";
import { validateWorldState } from "./core/validator.js";
import { validateDefinitions } from "./core/definitionValidator.js";
import { listSaveSlots, saveToSlot, loadFromSlot, deleteSaveSlot, MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT } from "./core/saveSystem.js";
import { createInitialWorldState } from "./state/initialState.js";
import { createPlayerCareer } from "./commands/createPlayerCareer.js";
import { promotePerson } from "./commands/promotePerson.js";
import { completeSchool } from "./commands/awardQualification.js";
import { advanceWorldDays, grantTrainingExperience } from "./commands/advanceCareer.js";
import { markNotificationRead } from "./commands/markNotificationRead.js";
import { selectCurrentSquad } from "./selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "./selectors/selectCareerRecord.js";
import { selectNotifications } from "./selectors/selectNotifications.js";
import { selectOrganizationView } from "./selectors/selectOrganizationView.js";
import { selectAssignmentView, selectUnitPersonnel } from "./selectors/selectAssignmentView.js";
import { selectServiceCareer } from "./selectors/selectServiceCareer.js";
import { generateReenlistmentOffers, acceptReenlistmentOffer } from "./commands/reenlistment.js";

const definitionValidation = validateDefinitions(registries);
if (!definitionValidation.ok) throw new Error(`Definition validation failed: ${definitionValidation.errors.join(" | ")}`);

const store = createStateStore(createInitialWorldState());
const eventBus = createEventBus();
let achievementQueue = [], saveMode = "save", selectedUnitId = null;

const $ = selector => document.querySelector(selector);
const els = {
  newCareerPanel: $("#new-career-panel"), careerContent: $("#career-content"), newCareerForm: $("#new-career-form"), firstName: $("#first-name"), lastName: $("#last-name"), branchSelect: $("#branch-select"), componentSelect: $("#component-select"), specialtySelect: $("#specialty-select"), contractSelect: $("#contract-select"),
  squadMeta: $("#squad-meta"), squadBody: $("#squad-body"), careerSummary: $("#career-summary"), careerCard: $("#career-card"), promotionCard: $("#promotion-card"), schoolsAwards: $("#schools-awards"), relationships: $("#relationships"), careerEvents: $("#career-events"), careerInbox: $("#career-inbox"), unreadBadge: $("#unread-badge"), assignmentCard: $("#assignment-card"), unitBreadcrumbs: $("#unit-breadcrumbs"), organizationBrowser: $("#organization-browser"), unitPersonnel: $("#unit-personnel"), unitPersonnelMeta: $("#unit-personnel-meta"), ordersList: $("#orders-list"), serviceCareer: $("#service-career"), reenlistmentOffers: $("#reenlistment-offers"), reviewReenlistment: $("#review-reenlistment"), careerFramework: $("#career-framework"), personDialog: $("#person-dialog"), personProfileName: $("#person-profile-name"), personProfileBody: $("#person-profile-body"), personProfileClose: $("#person-profile-close"), diagnostics: $("#diagnostics"), status: $("#status-message"),
  train: $("#train-player"), advanceTime: $("#advance-time"), promote: $("#promote-player"), airborne: $("#airborne-player"), leadership: $("#leadership-player"), save: $("#save-game"), load: $("#load-game"), newCareer: $("#new-career"), loadFromStart: $("#load-from-start"),
  achievementDialog: $("#achievement-dialog"), achievementType: $("#achievement-type"), achievementTitle: $("#achievement-title"), achievementMessage: $("#achievement-message"), achievementOk: $("#achievement-ok"),
  saveDialog: $("#save-dialog"), saveDialogTitle: $("#save-dialog-title"), saveModeLabel: $("#save-mode-label"), saveSlots: $("#save-slots"), saveDialogClose: $("#save-dialog-close"),
  confirmDialog: $("#confirm-dialog"), confirmTitle: $("#confirm-title"), confirmMessage: $("#confirm-message"), confirmOk: $("#confirm-ok")
};

for (const branch of registries.branches.values()) { const option = document.createElement("option"); option.value = branch.id; option.textContent = branch.name; els.branchSelect.appendChild(option); }
for (const component of registries.components.values()) { const option = document.createElement("option"); option.value = component.id; option.textContent = component.careerAvailable ? component.name : `${component.name} — framework ready`; option.disabled = !component.careerAvailable; els.componentSelect.appendChild(option); }
for (const specialty of registries.specialties.values()) { const option = document.createElement("option"); option.value = specialty.id; option.textContent = specialty.careerAvailable ? `${specialty.code} · ${specialty.name}` : `${specialty.code} · ${specialty.name} — unit pipeline pending`; option.disabled = !specialty.careerAvailable; els.specialtySelect.appendChild(option); }
for (const contract of registries.contracts.values()) { const option = document.createElement("option"); option.value = contract.id; option.textContent = `${contract.name} · ${contract.termMonths / 12} years`; els.contractSelect.appendChild(option); }

function setStatus(message, tone = "") { els.status.textContent = message; els.status.className = `status-message ${tone}`.trim(); }
function statLine(label, value) { const wrapper = document.createElement("div"); wrapper.className = "statline"; const key = document.createElement("span"), val = document.createElement("strong"); key.textContent = label; val.textContent = String(value); wrapper.append(key, val); return wrapper; }
function renderList(container, items, emptyText) { container.replaceChildren(); if (!items.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = emptyText; container.appendChild(p); return; } const ul = document.createElement("ul"); ul.className = "compact-list"; for (const item of items) { const li = document.createElement("li"); li.textContent = item; ul.appendChild(li); } container.appendChild(ul); }
function resolveRankName(rankId) { return rankId ? `${registries.ranks.get(rankId).abbreviation} · ${registries.ranks.get(rankId).name}` : "—"; }
function resolveBranchName(branchId) { return branchId ? registries.branches.get(branchId).name : "—"; }
function formatSavedAt(value) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value ?? "—"; } }

function renderInbox(state, indexes, personId) {
  const notices = selectNotifications(state, indexes, personId), unread = notices.filter(n => n.readAtElapsedDay == null);
  els.unreadBadge.hidden = unread.length === 0; els.unreadBadge.textContent = String(unread.length);
  els.careerInbox.replaceChildren();
  if (!notices.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "No career notifications yet."; els.careerInbox.appendChild(p); return; }
  const list = document.createElement("div"); list.className = "inbox-list";
  for (const notice of notices.slice(0, 30)) {
    const item = document.createElement("article"); item.className = `inbox-item ${notice.readAtElapsedDay == null ? "unread" : ""}`.trim();
    const meta = document.createElement("div"); meta.className = "inbox-meta"; meta.innerHTML = `<span>${notice.type.replaceAll("_", " ")}</span><span>${notice.gameDate}</span>`;
    const h = document.createElement("h3"); h.textContent = notice.title; const p = document.createElement("p"); p.textContent = notice.message; item.append(meta, h, p);
    if (notice.readAtElapsedDay == null) item.addEventListener("click", () => markNotificationRead(store, notice.id), { once: true });
    list.appendChild(item);
  }
  els.careerInbox.appendChild(list);
}

function descendantUnitIds(state, indexes, unitId) {
  const result = [unitId], queue = [unitId];
  while (queue.length) { const current = queue.shift(); for (const child of indexes.unitsByParentUnitId.get(current) ?? []) { result.push(child); queue.push(child); } }
  return result;
}
function aggregateStrength(state, indexes, unitId) {
  const ids = descendantUnitIds(state, indexes, unitId); let authorized = 0, assigned = 0;
  for (const id of ids) for (const billetId of indexes.billetsByUnitId.get(id) ?? []) { authorized++; if (state.entities.billets[billetId]?.assignedPersonId) assigned++; }
  return { authorized, assigned, vacancies: authorized - assigned };
}
function showPersonProfile(personId) {
  const state = store.getState(), indexes = store.getIndexes(), person = state.entities.people[personId]; if (!person) return;
  const rank = registries.ranks.get(person.affiliation.rankId), billet = state.entities.billets[person.affiliation.billetId], billetDef = billet ? registries.billets.get(billet.definitionId) : null, unit = state.entities.units[person.affiliation.unitId];
  els.personProfileName.textContent = person.identity.displayName;
  els.personProfileBody.replaceChildren(statLine("Rank", `${rank.abbreviation} · ${rank.name}`), statLine("Duty Position", billetDef?.name ?? "Unassigned"), statLine("Unit", unit?.name ?? "—"), statLine("Status", person.condition.status), statLine("Health", `${person.condition.health}%`), statLine("Morale", `${person.condition.morale}%`), statLine("Readiness", `${person.condition.readiness}%`), statLine("Experience", person.career.experience));
  els.personDialog.showModal();
}
function organizationChain(state, indexes, unitId) {
  const chain = [];
  let cursor = state.entities.units[unitId];
  while (cursor) {
    chain.unshift(selectOrganizationView(state, indexes, registries, cursor.id));
    cursor = cursor.parentUnitId ? state.entities.units[cursor.parentUnitId] : null;
  }
  return chain;
}
function renderOrganization(state, indexes, personId) {
  const assignment = selectAssignmentView(state, indexes, registries, personId);
  // Keep a valid browsed unit selected even when it is outside the player's own
  // assignment chain. Only fall back to the player's unit when selection is invalid.
  if (!selectedUnitId || !state.entities.units[selectedUnitId]) selectedUnitId = assignment.chain.at(-1).unitId;
  const current = selectOrganizationView(state, indexes, registries, selectedUnitId), aggregate = aggregateStrength(state, indexes, selectedUnitId);
  const browseChain = organizationChain(state, indexes, selectedUnitId);
  els.assignmentCard.replaceChildren(statLine("Duty Position", assignment.billetName), statLine("Assigned Since", assignment.assignmentStartDate), statLine("Chain", assignment.chain.map(x => x.name).join(" › ")));
  els.unitBreadcrumbs.replaceChildren(...browseChain.map(item => { const b=document.createElement("button"); b.type="button"; b.textContent=item.name; if(item.unitId===selectedUnitId) b.disabled=true; b.addEventListener("click",()=>{selectedUnitId=item.unitId; render();}); return b; }));
  els.organizationBrowser.replaceChildren(); const summary=document.createElement("div"); summary.className="unit-summary"; summary.append(statLine("Echelon", current.echelon),statLine("Branch",current.branch),statLine("Strength",`${aggregate.assigned} / ${aggregate.authorized}`),statLine("Vacancies",aggregate.vacancies),statLine("Readiness",`${current.readiness}%`),statLine("Morale",`${current.morale}%`)); els.organizationBrowser.append(summary);
  if(current.childUnitIds.length){ const children=document.createElement("div"); children.className="unit-children"; for(const id of current.childUnitIds){ const child=state.entities.units[id], b=document.createElement("button"); b.type="button"; b.className="unit-child"; b.textContent=`${child.name} · ${registries.echelons.get(child.echelonId).name}`; b.addEventListener("click",()=>{selectedUnitId=id; render();}); children.appendChild(b);} els.organizationBrowser.append(children); }
  const personnelIds=descendantUnitIds(state,indexes,selectedUnitId).flatMap(id=>indexes.peopleByUnitId.get(id)??[]), seen=new Set(); const personnel=personnelIds.filter(id=>!seen.has(id)&&seen.add(id)).map(id=>selectUnitPersonnel(state,indexes,registries,state.entities.people[id].affiliation.unitId).find(x=>x.id===id)).filter(Boolean);
  els.unitPersonnelMeta.textContent=`${current.name}${current.childUnitIds.length ? " and subordinate units" : ""} · ${personnel.length} assigned personnel`;
  els.unitPersonnel.replaceChildren(...personnel.map(member=>{ const card=document.createElement("article"); card.className=`person-card ${member.isPlayer?"player-row":""}`.trim(); const h=document.createElement("h3"); h.textContent=`${member.rank} · ${member.name}${member.isPlayer ? " · YOU" : ""}`; const p=document.createElement("p"); p.textContent=`${member.billet} · ${member.status}`; const p2=document.createElement("p"); p2.textContent=`Readiness ${member.readiness}% · Morale ${member.morale}%`; card.append(h,p,p2); card.addEventListener("click",()=>showPersonProfile(member.id)); return card;}));
  const orderIds=indexes.ordersByPersonId?.get(personId)??[]; els.ordersList.replaceChildren(); if(!orderIds.length){const p=document.createElement("p");p.className="muted";p.textContent="No orders recorded yet.";els.ordersList.append(p);} else for(const id of orderIds.slice().reverse()){const o=state.entities.orderRecords[id], card=document.createElement("article");card.className="order-card";const h=document.createElement("h3");h.textContent=o.title;const p1=document.createElement("p");p1.textContent=o.summary;const p2=document.createElement("p");p2.className="muted";p2.textContent=`Issued ${o.issueDate} · Effective ${o.effectiveDate} · ${o.status}`;card.append(h,p1,p2);els.ordersList.append(card);}
}


function renderServiceCareer(state, indexes, personId) {
  const view = selectServiceCareer(state, indexes, registries, personId);
  const contract = view.contract;
  els.serviceCareer.replaceChildren(
    statLine("Component", view.component.name),
    statLine("MOS", `${view.specialty.code} · ${view.specialty.name}`),
    statLine("Career Field", view.specialty.careerField),
    statLine("Contract", view.contractDef?.name ?? "—"),
    statLine("Contract Start", contract?.startDate ?? "—"),
    statLine("ETS / Contract End", contract?.endDate ?? "—"),
    statLine("Days Remaining", view.daysRemaining == null ? "—" : view.daysRemaining),
    statLine("Contract Bonus", contract ? `$${contract.bonus.toLocaleString()}` : "$0")
  );
  els.reviewReenlistment.disabled = !view.reenlistmentWindowOpen;
  els.reviewReenlistment.textContent = view.reenlistmentWindowOpen ? "Review Reenlistment Options" : `Reenlistment Window ${view.daysRemaining > 180 ? `in ${view.daysRemaining - 180} days` : "Closed"}`;
  els.reenlistmentOffers.replaceChildren();
  const openOffers = view.offers.filter(x => x.status === "open");
  if (!openOffers.length) { const p=document.createElement("p"); p.className="muted"; p.textContent=view.reenlistmentWindowOpen ? "No active offers yet. Review options to generate them." : "Reenlistment offers appear within 180 days of ETS."; els.reenlistmentOffers.appendChild(p); }
  else for (const offer of openOffers) { const card=document.createElement("article"); card.className="offer-card"; const h=document.createElement("h3"); h.textContent=offer.contractName; const p=document.createElement("p"); p.textContent=`Retain ${view.specialty.code} ${view.specialty.name} · ${view.component.name}`; const b=document.createElement("p"); b.className="offer-bonus"; b.textContent=`$${offer.bonus.toLocaleString()} bonus`; const accept=document.createElement("button"); accept.type="button"; accept.textContent="Accept Offer"; accept.addEventListener("click",()=>runCommand(()=>acceptReenlistmentOffer(store,registries,offer.id))); card.append(h,p,b,accept); els.reenlistmentOffers.appendChild(card); }
  const history = view.periods.map(x => `${x.startDate} → ${x.endDate ?? "Present"} · ${x.branchName} · ${x.componentName} · ${x.specialtyName}`);
  renderList(els.careerFramework, history, "No service periods recorded.");
}

function render() {
  const state = store.getState(), indexes = store.getIndexes(), validation = validateWorldState(state, registries), hasPlayer = Boolean(state.playerPersonId);
  els.newCareerPanel.hidden = hasPlayer; els.careerContent.hidden = !hasPlayer;
  if (!hasPlayer) { els.diagnostics.textContent = ""; return; }
  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId), career = selectCareerRecord(state, indexes, registries, state.playerPersonId);
  els.squadMeta.textContent = `${squad.unitName} · ${squad.members.length} personnel · Readiness ${squad.readiness}% · Morale ${squad.morale}% · ${state.world.date}`;
  els.squadBody.replaceChildren(...squad.members.map(member => { const tr = document.createElement("tr"); if (member.isPlayer) tr.className = "player-row"; for (const value of [member.rank, member.name, member.role, `${member.health}%`, `${member.morale}%`, member.weaponName, member.status]) { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); } return tr; }));
  const assignment = selectAssignmentView(state, indexes, registries, state.playerPersonId);
  els.careerSummary.replaceChildren();
  const identity = document.createElement("div"); identity.className = "career-identity";
  const name = document.createElement("h2"); name.textContent = `${career.rank.split(" · ")[0]} ${career.name}`;
  const sub = document.createElement("p"); sub.className = "muted career-subtitle"; sub.textContent = `${career.specialty} · ${career.component}`;
  const chain = document.createElement("p"); chain.className = "career-chain"; chain.textContent = assignment.chain.map(x => x.name).join(" › ");
  identity.append(name, sub, chain);
  const chips = document.createElement("div"); chips.className = "status-chips";
  for (const text of [career.payGrade, career.role, `${squad.readiness}% ready`, `${squad.morale}% morale`]) { const chip=document.createElement("span"); chip.className="status-chip"; chip.textContent=text; chips.appendChild(chip); }
  const quick = document.createElement("div"); quick.className = "quick-stats"; quick.append(statLine("Experience", career.experience), statLine("Prestige", career.prestige), statLine("World Date", state.world.date));
  els.careerSummary.append(identity, chips, quick);
  els.careerCard.replaceChildren(statLine("Name", career.name), statLine("Branch", career.branch), statLine("Component", career.component), statLine("MOS", career.specialty), statLine("Rank", career.rank), statLine("Pay Grade", career.payGrade), statLine("Role", career.role), statLine("Experience", career.experience), statLine("Prestige", career.prestige));
  els.promotionCard.replaceChildren();
  if (!career.promotion.nextRank) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "No higher rank is defined in this foundation build."; els.promotionCard.appendChild(p); els.promote.disabled = true; }
  else { els.promotionCard.append(statLine("Next Rank", `${career.promotion.nextRank.abbreviation} · ${career.promotion.nextRank.name}`), statLine("Eligible", career.promotion.eligible ? "Yes" : "No")); const reasonBox = document.createElement("div"); renderList(reasonBox, career.promotion.reasons, "All current requirements are satisfied."); els.promotionCard.appendChild(reasonBox); els.promote.disabled = !career.promotion.eligible; }
  renderList(els.schoolsAwards, [...career.qualifications.map(item => `${item.name} — ${item.completedDate}`), ...career.awards.map(item => `${item.name} (${item.category}) — ${item.earnedDate}`)], "No schools, qualifications, or awards recorded yet.");
  renderList(els.relationships, career.relationships.map(rel => `${rel.otherName} · ${rel.relationshipType} · familiarity ${rel.familiarity} · trust ${rel.trust}`), "No relationship records.");
  els.careerEvents.replaceChildren(...career.events.map(event => { const li = document.createElement("li"), time = document.createElement("time"); time.textContent = event.date; li.append(time, document.createTextNode(event.label)); return li; }));
  renderInbox(state, indexes, state.playerPersonId);
  renderOrganization(state, indexes, state.playerPersonId);
  renderServiceCareer(state, indexes, state.playerPersonId);
  els.diagnostics.textContent = JSON.stringify({ valid: validation.ok, validationErrors: validation.errors, definitionValidation, worldSchemaVersion: state.schemaVersion, gameVersion: state.gameVersion, worldClock: state.world.clock, rngState: state.world.rngState, nextEntitySequence: state.world.nextEntitySequence, registryCounts: Object.fromEntries(Object.entries(registries).map(([k, r]) => [k, r.size])), runtimeCounts: Object.fromEntries(Object.entries(state.entities).map(([name, collection]) => [name, Object.keys(collection).length])), indexedSquadMembers: indexes.peopleByUnitId.get(squad.unitId)?.length ?? 0, playerRelationships: indexes.relationshipsByPersonId.get(state.playerPersonId)?.length ?? 0 }, null, 2);
}

function getNoticesByIds(ids) { const state = store.getState(); return ids.map(id => state.entities.notificationRecords[id]).filter(Boolean); }
function queueNotifications(ids) { achievementQueue.push(...getNoticesByIds(ids).filter(n => ["qualification_completed", "award_earned", "promotion", "memorial"].includes(n.type))); showNextAchievement(); }
function showNextAchievement() { if (els.achievementDialog.open || achievementQueue.length === 0) return; const notice = achievementQueue.shift(); els.achievementType.textContent = notice.type.replaceAll("_", " ").toUpperCase(); els.achievementTitle.textContent = notice.title; els.achievementMessage.textContent = notice.message; els.achievementDialog.dataset.notificationId = notice.id; els.achievementDialog.showModal(); }
els.achievementOk.addEventListener("click", () => { const id = els.achievementDialog.dataset.notificationId; if (id) { try { markNotificationRead(store, id); } catch {} } els.achievementDialog.close(); showNextAchievement(); });

function autosave() { if (!store.getState().playerPersonId) return; const validation = validateWorldState(store.getState(), registries); if (validation.ok) saveToSlot(store.getState(), AUTOSAVE_SLOT); }
function runCommand(fn, { autosaveAfter = true, statusTone = "good" } = {}) { try { const result = fn(); if (result?.notifications?.length) queueNotifications(result.notifications); eventBus.publish({ type: "command_completed", result }); if (autosaveAfter) autosave(); setStatus(result?.message ?? "Command completed.", statusTone); return result; } catch (error) { console.error(error); setStatus(error instanceof Error ? error.message : String(error), "bad"); return null; } }

function confirmAction(title, message) { return new Promise(resolve => { els.confirmTitle.textContent = title; els.confirmMessage.textContent = message; const handler = () => { els.confirmDialog.removeEventListener("close", handler); resolve(els.confirmDialog.returnValue === "confirm"); }; els.confirmDialog.addEventListener("close", handler); els.confirmDialog.showModal(); }); }

function renderSaveManager(mode) {
  saveMode = mode; els.saveModeLabel.textContent = mode === "save" ? "SAVE CAREER" : "LOAD CAREER"; els.saveDialogTitle.textContent = mode === "save" ? "Choose Save Slot" : "Choose Career to Load"; els.saveSlots.replaceChildren();
  const slots = listSaveSlots();
  for (const meta of slots) {
    const card = document.createElement("section"); card.className = `save-slot ${meta.slotId === AUTOSAVE_SLOT ? "autosave-slot" : ""}`.trim();
    const h = document.createElement("h3"); h.textContent = meta.slotId === AUTOSAVE_SLOT ? "Autosave" : `Save ${Number(meta.slotId.split("_")[1])}`; card.appendChild(h);
    if (meta.empty) { const p = document.createElement("p"); p.textContent = "Empty"; card.appendChild(p); }
    else {
      for (const text of [meta.characterName, `${resolveRankName(meta.rankId)} · ${resolveBranchName(meta.branchId)}`, `Game date ${meta.gameDate}`, `Saved ${formatSavedAt(meta.savedAt)}`, `v${meta.gameVersion} · schema ${meta.worldSchemaVersion}`]) { const p = document.createElement("p"); p.textContent = text; card.appendChild(p); }
    }
    const actions = document.createElement("div"); actions.className = "actions";
    if (mode === "save" && meta.slotId !== AUTOSAVE_SLOT) { const button = document.createElement("button"); button.type = "button"; button.textContent = meta.empty ? "Save Here" : "Overwrite"; button.addEventListener("click", async () => { if (!meta.empty && !(await confirmAction("Overwrite Save?", `Replace ${meta.characterName} in this slot?`))) return; const validation = validateWorldState(store.getState(), registries); if (!validation.ok) { setStatus(`Save blocked: ${validation.errors.join(" | ")}`, "bad"); return; } const saved = saveToSlot(store.getState(), meta.slotId); setStatus(`Saved ${saved.characterName} to ${meta.slotId}.`, "good"); renderSaveManager("save"); }); actions.appendChild(button); }
    if (mode === "load" && !meta.empty) { const button = document.createElement("button"); button.type = "button"; button.textContent = "Load"; button.addEventListener("click", async () => { if (store.getState().playerPersonId && !(await confirmAction("Load Career?", "Unsaved progress in the current session will be replaced."))) return; try { const loaded = loadFromSlot(meta.slotId); if (!loaded) throw new Error("Save slot is empty."); const validation = validateWorldState(loaded.worldState, registries); if (!validation.ok) throw new Error(`Load blocked: ${validation.errors.join(" | ")}`); store.replaceState(loaded.worldState); els.saveDialog.close(); setStatus(`Loaded ${loaded.metadata?.characterName ?? "career"}.`, "good"); } catch (error) { setStatus(error.message, "bad"); } }); actions.appendChild(button); }
    if (!meta.empty && meta.slotId !== AUTOSAVE_SLOT) { const del = document.createElement("button"); del.type = "button"; del.className = "secondary"; del.textContent = "Delete"; del.addEventListener("click", async () => { if (!(await confirmAction("Delete Save?", `Permanently delete ${meta.characterName}?`))) return; deleteSaveSlot(meta.slotId); renderSaveManager(mode); }); actions.appendChild(del); }
    card.appendChild(actions); els.saveSlots.appendChild(card);
  }
}
function openSaveManager(mode) { renderSaveManager(mode); els.saveDialog.showModal(); }

els.newCareerForm.addEventListener("submit", event => { event.preventDefault(); runCommand(() => createPlayerCareer(store, registries, { firstName: els.firstName.value, lastName: els.lastName.value, branchId: els.branchSelect.value, componentId: els.componentSelect.value, specialtyId: els.specialtySelect.value, contractDefinitionId: els.contractSelect.value }), { autosaveAfter: true }); });
els.train.addEventListener("click", () => runCommand(() => grantTrainingExperience(store, store.getState().playerPersonId, 250)));
els.advanceTime.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 30)));
els.reviewReenlistment.addEventListener("click", () => runCommand(() => generateReenlistmentOffers(store, registries, store.getState().playerPersonId)));
els.promote.addEventListener("click", () => runCommand(() => promotePerson(store, registries, store.getState().playerPersonId)));
els.airborne.addEventListener("click", () => runCommand(() => completeSchool(store, registries, store.getState().playerPersonId, "school_airborne")));
els.leadership.addEventListener("click", () => runCommand(() => completeSchool(store, registries, store.getState().playerPersonId, "school_leadership")));
els.save.addEventListener("click", () => openSaveManager("save")); els.load.addEventListener("click", () => openSaveManager("load")); els.loadFromStart.addEventListener("click", () => openSaveManager("load"));
els.saveDialogClose.addEventListener("click", () => els.saveDialog.close());
els.personProfileClose.addEventListener("click", () => els.personDialog.close());
els.newCareer.addEventListener("click", async () => { if (!(await confirmAction("Start New Career?", "The current session will be replaced. Your manual save slots will not be deleted."))) return; store.replaceState(createInitialWorldState()); els.newCareerForm.reset(); els.branchSelect.value = registries.branches.values()[0]?.id ?? ""; els.componentSelect.value = "component_active"; els.specialtySelect.value = "specialty_army_11b"; els.contractSelect.value = "contract_army_4y"; setStatus("New career setup ready. Existing save slots were preserved.", "warn"); });

document.querySelectorAll("#bottom-nav [data-target]").forEach(button => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

store.subscribe(render); eventBus.subscribe("command_completed", () => {}); render();
