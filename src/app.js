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
import { advanceWorldDays } from "./commands/advanceCareer.js";
import { performActivity } from "./commands/performActivity.js";
import { selectGameplay } from "./selectors/selectGameplay.js";
import { resolveDecision } from "./commands/resolveDecision.js";
import { markNotificationRead } from "./commands/markNotificationRead.js";
import { archiveNotification, markAllNotificationsRead, clearReadNotifications } from "./commands/manageNotifications.js";
import { selectCurrentSquad } from "./selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "./selectors/selectCareerRecord.js";
import { selectNotifications } from "./selectors/selectNotifications.js";
import { selectOrganizationView } from "./selectors/selectOrganizationView.js";
import { selectAssignmentView, selectUnitPersonnel } from "./selectors/selectAssignmentView.js";
import { selectServiceCareer } from "./selectors/selectServiceCareer.js";
import { generateReenlistmentOffers, acceptReenlistmentOffer } from "./commands/reenlistment.js";
import { selectPersonnelAdministration } from "./selectors/selectPersonnelAdministration.js";

const definitionValidation = validateDefinitions(registries);
if (!definitionValidation.ok) throw new Error(`Definition validation failed: ${definitionValidation.errors.join(" | ")}`);

const store = createStateStore(createInitialWorldState());
const eventBus = createEventBus();
let achievementQueue = [], saveMode = "save", selectedOrganizationUnitId = null, personnelFilterUnitId = null, activeView = "career", statusTimer = null;

const $ = selector => document.querySelector(selector);
const els = {
  appError: $("#app-error"), appErrorMessage: $("#app-error-message"), appErrorDismiss: $("#app-error-dismiss"), navCareerBadge: $("#nav-career-badge"), pendingDecisions: $("#pending-decisions"), activityOptions: $("#activity-options"), skillSummary: $("#skill-summary"), activityHistory: $("#activity-history"),
  newCareerPanel: $("#new-career-panel"), careerContent: $("#career-content"), newCareerForm: $("#new-career-form"), firstName: $("#first-name"), lastName: $("#last-name"), branchSelect: $("#branch-select"), componentSelect: $("#component-select"), specialtySelect: $("#specialty-select"), contractSelect: $("#contract-select"), worldSeed: $("#world-seed"), rerollSeed: $("#reroll-seed"),
  squadMeta: $("#squad-meta"), squadBody: $("#squad-body"), careerSummary: $("#career-summary"), careerCard: $("#career-card"), promotionCard: $("#promotion-card"), schoolsAwards: $("#schools-awards"), relationships: $("#relationships"), careerEvents: $("#career-events"), careerInbox: $("#career-inbox"), unreadBadge: $("#unread-badge"), markAllRead: $("#mark-all-read"), clearRead: $("#clear-read"), assignmentCard: $("#assignment-card"), unitBreadcrumbs: $("#unit-breadcrumbs"), organizationBrowser: $("#organization-browser"), unitPersonnel: $("#unit-personnel"), unitPersonnelMeta: $("#unit-personnel-meta"), returnMyUnit: $("#return-my-unit"), viewSelectedPersonnel: $("#view-selected-personnel"), personnelMyUnit: $("#personnel-my-unit"), personDogTag: $("#person-dog-tag"), ordersList: $("#orders-list"), serviceCareer: $("#service-career"), reenlistmentOffers: $("#reenlistment-offers"), reviewReenlistment: $("#review-reenlistment"), careerFramework: $("#career-framework"), personDialog: $("#person-dialog"), personProfileName: $("#person-profile-name"), personProfileBody: $("#person-profile-body"), personProfileClose: $("#person-profile-close"), administrationSummary: $("#administration-summary"), replacementRequests: $("#replacement-requests"), personnelActions: $("#personnel-actions"), diagnostics: $("#diagnostics"), status: $("#status-message"), resultDialog: $("#result-dialog"), resultKicker: $("#result-kicker"), resultTitle: $("#result-title"), resultBody: $("#result-body"), resultClose: $("#result-close"),
  advance1: $("#advance-1"), advance7: $("#advance-7"), advance30: $("#advance-30"), promote: $("#promote-player"), airborne: $("#airborne-player"), leadership: $("#leadership-player"), save: $("#save-game"), load: $("#load-game"), newCareer: $("#new-career"), loadFromStart: $("#load-from-start"),
  achievementDialog: $("#achievement-dialog"), achievementType: $("#achievement-type"), achievementTitle: $("#achievement-title"), achievementMessage: $("#achievement-message"), achievementOk: $("#achievement-ok"),
  saveDialog: $("#save-dialog"), saveDialogTitle: $("#save-dialog-title"), saveModeLabel: $("#save-mode-label"), saveSlots: $("#save-slots"), saveDialogClose: $("#save-dialog-close"),
  confirmDialog: $("#confirm-dialog"), confirmTitle: $("#confirm-title"), confirmMessage: $("#confirm-message"), confirmOk: $("#confirm-ok")
};

function freshWorldSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] || 1;
}
function assignFreshWorldSeed() { els.worldSeed.value = String(freshWorldSeed()); }
assignFreshWorldSeed();
els.rerollSeed.addEventListener("click", assignFreshWorldSeed);

for (const branch of registries.branches.values()) { const option = document.createElement("option"); option.value = branch.id; option.textContent = branch.name; els.branchSelect.appendChild(option); }
for (const component of registries.components.values()) { const option = document.createElement("option"); option.value = component.id; option.textContent = component.careerAvailable ? component.name : `${component.name} — framework ready`; option.disabled = !component.careerAvailable; els.componentSelect.appendChild(option); }
for (const specialty of registries.specialties.values()) { const option = document.createElement("option"); option.value = specialty.id; option.textContent = specialty.careerAvailable ? `${specialty.code} · ${specialty.name}` : `${specialty.code} · ${specialty.name} — unit pipeline pending`; option.disabled = !specialty.careerAvailable; els.specialtySelect.appendChild(option); }
for (const contract of registries.contracts.values()) { const option = document.createElement("option"); option.value = contract.id; option.textContent = `${contract.name} · ${contract.termMonths / 12} years`; els.contractSelect.appendChild(option); }

function setStatus(message, tone = "") {
  if (statusTimer) clearTimeout(statusTimer);
  els.status.textContent = message ?? "";
  els.status.className = `status-message ${tone}`.trim();
  els.status.hidden = !message;
  if (message) statusTimer = setTimeout(() => { els.status.hidden = true; els.status.textContent = ""; }, tone === "bad" ? 6000 : 3200);
}
function statLine(label, value) { const wrapper = document.createElement("div"); wrapper.className = "statline"; const key = document.createElement("span"), val = document.createElement("strong"); key.textContent = label; val.textContent = String(value); wrapper.append(key, val); return wrapper; }
function progressRow(label, value, max) {
  const safeMax = Math.max(1, Number(max) || 1), safeValue = Math.max(0, Number(value) || 0), percent = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  const wrapper = document.createElement("div"); wrapper.className = "progress-row";
  const head = document.createElement("div"); head.className = "progress-row-head"; const key = document.createElement("span"), val = document.createElement("strong"); key.textContent = label; val.textContent = `${safeValue.toLocaleString()} / ${safeMax.toLocaleString()}`; head.append(key, val);
  const track = document.createElement("div"); track.className = "progress-track"; track.setAttribute("role", "progressbar"); track.setAttribute("aria-label", label); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", String(safeMax)); track.setAttribute("aria-valuenow", String(safeValue));
  const fill = document.createElement("div"); fill.className = "progress-fill"; fill.style.setProperty("--progress", `${percent}%`); track.appendChild(fill); wrapper.append(head, track); return wrapper;
}
function setActiveView(view, { scroll = true } = {}) {
  activeView = ["career", "unit", "personnel", "orders", "more"].includes(view) ? view : "career";
  document.querySelectorAll(".game-view[data-view]").forEach(section => { section.hidden = section.dataset.view !== activeView; });
  document.querySelectorAll("#bottom-nav [data-view]").forEach(button => {
    if (button.dataset.view === activeView) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
}
function renderList(container, items, emptyText) { container.replaceChildren(); if (!items.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = emptyText; container.appendChild(p); return; } const ul = document.createElement("ul"); ul.className = "compact-list"; for (const item of items) { const li = document.createElement("li"); li.textContent = item; ul.appendChild(li); } container.appendChild(ul); }
function resolveRankName(rankId) { return rankId ? `${registries.ranks.get(rankId).abbreviation} · ${registries.ranks.get(rankId).name}` : "—"; }
function resolveBranchName(branchId) { return branchId ? registries.branches.get(branchId).name : "—"; }
function formatSavedAt(value) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value ?? "—"; } }

function relationshipBand(trust) { return registries.relationshipBands.values().find(band => trust >= band.minimumTrust && trust <= band.maximumTrust) ?? registries.relationshipBands.get("relationship_neutral"); }
function meter(label, value, minimum = 0, maximum = 100, { signed = false } = {}) {
  const wrapper=document.createElement("div"); wrapper.className="relationship-meter";
  const head=document.createElement("div"); head.className="meter-head"; const name=document.createElement("span"), amount=document.createElement("strong"); name.textContent=label; amount.textContent=signed && value>0 ? `+${value}` : String(value); head.append(name,amount);
  const track=document.createElement("div"); track.className="meter-track"; const fill=document.createElement("div"); fill.className="meter-fill"; const percent=Math.max(0,Math.min(100,((Number(value)-minimum)/(maximum-minimum))*100)); fill.style.setProperty("--meter",`${percent}%`); track.appendChild(fill); wrapper.append(head,track); return wrapper;
}
function renderRelationships(relationships) {
  els.relationships.replaceChildren();
  if (!relationships.length) { const p=document.createElement("p"); p.className="empty-state"; p.textContent="No relationship records yet."; els.relationships.appendChild(p); return; }
  for (const rel of relationships) {
    const band=relationshipBand(rel.trust); const card=document.createElement("button"); card.type="button"; card.className=`relationship-card tone-${band.tone}`;
    const top=document.createElement("div"); top.className="relationship-card-head"; const identity=document.createElement("div"); const h=document.createElement("strong"); h.textContent=`${rel.otherRank} ${rel.otherName}`; const role=document.createElement("span"); role.textContent=`${rel.otherRole} · ${rel.relationshipType}`; identity.append(h,role); const badge=document.createElement("span"); badge.className=`relationship-badge tone-${band.tone}`; badge.textContent=band.label; top.append(identity,badge);
    const meters=document.createElement("div"); meters.className="relationship-meters"; meters.append(meter("Familiarity",rel.familiarity,0,100),meter("Trust",rel.trust,-100,100,{signed:true}));
    card.append(top,meters); card.addEventListener("click",()=>showPersonProfile(rel.otherPersonId)); els.relationships.appendChild(card);
  }
}
function performanceProfile(rating) { return registries.performanceRatings.has(rating) ? registries.performanceRatings.get(rating) : registries.performanceRatings.get("satisfactory"); }
function feedbackProfile(definition) { return definition?.presentationId && registries.feedbackPresentations.has(definition.presentationId) ? registries.feedbackPresentations.get(definition.presentationId) : registries.feedbackPresentations.get("feedback_routine"); }
function humanizeStatus(value) { return String(value ?? "unknown").replaceAll("_"," "); }

function renderInbox(state, indexes, personId) {
  const notices = selectNotifications(state, indexes, personId);
  const unread = notices.filter(n => n.readAtElapsedDay == null);
  const read = notices.filter(n => n.readAtElapsedDay != null);
  const pendingIds = indexes.gameplayEventsByPersonId?.get(personId) ?? [];
  const pendingDecisionCount = pendingIds.map(id => state.entities.gameplayEventRecords[id]).filter(record => record?.status === "pending").length;
  const attentionCount = unread.length + pendingDecisionCount;
  els.unreadBadge.hidden = unread.length === 0;
  els.unreadBadge.textContent = String(unread.length);
  els.navCareerBadge.hidden = attentionCount === 0;
  els.navCareerBadge.textContent = attentionCount > 99 ? "99+" : String(attentionCount);
  els.markAllRead.disabled = unread.length === 0;
  els.clearRead.disabled = read.length === 0;
  els.careerInbox.replaceChildren();
  if (!notices.length) { const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "No active notifications."; els.careerInbox.appendChild(p); return; }
  const list = document.createElement("div"); list.className = "inbox-list";
  for (const notice of notices.slice(0, 30)) {
    const item = document.createElement("article"); item.className = `inbox-item ${notice.readAtElapsedDay == null ? "unread" : "read"}`.trim();
    const meta = document.createElement("div"); meta.className = "inbox-meta"; const type=document.createElement("span"), date=document.createElement("span"); type.textContent=notice.type.replaceAll("_", " "); date.textContent=notice.gameDate; meta.append(type,date);
    const h = document.createElement("h3"); h.textContent = notice.title; const p = document.createElement("p"); p.textContent = notice.message; item.append(meta, h, p);
    const actions=document.createElement("div"); actions.className="notice-actions";
    if (notice.readAtElapsedDay == null) { const readButton=document.createElement("button"); readButton.type="button"; readButton.className="secondary compact-button"; readButton.textContent="Mark Read"; readButton.addEventListener("click",()=>runCommand(()=>markNotificationRead(store,notice.id))); actions.appendChild(readButton); }
    else { const clear=document.createElement("button"); clear.type="button"; clear.className="secondary compact-button"; clear.textContent="Clear"; clear.addEventListener("click",()=>runCommand(()=>archiveNotification(store,notice.id))); actions.appendChild(clear); }
    item.appendChild(actions); list.appendChild(item);
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
function collectUnitPersonnel(state, indexes, unitId) {
  const seen = new Set();
  const members = [];
  for (const scopedUnitId of descendantUnitIds(state, indexes, unitId)) {
    for (const member of selectUnitPersonnel(state, indexes, registries, scopedUnitId)) {
      if (!seen.has(member.id)) { seen.add(member.id); members.push(member); }
    }
  }
  return members;
}
function playerAssignmentUnitId(state, indexes, personId = state.playerPersonId) {
  return selectAssignmentView(state, indexes, registries, personId).chain.at(-1)?.unitId ?? null;
}
function showPersonProfile(personId) {
  const state = store.getState(), indexes = store.getIndexes(), person = state.entities.people[personId]; if (!person) return;
  const rank = registries.ranks.get(person.affiliation.rankId), billet = state.entities.billets[person.affiliation.billetId], billetDef = billet ? registries.billets.get(billet.definitionId) : null, unit = state.entities.units[person.affiliation.unitId];
  const branch = registries.branches.get(person.affiliation.branchId), specialty = registries.specialties.get(person.affiliation.specialtyId);
  els.personProfileName.textContent = `${rank.abbreviation} ${person.identity.displayName}${personId === state.playerPersonId ? " · YOU" : ""}`;
  els.personDogTag.replaceChildren();
  for (const [label, value] of [["SERVICE", branch?.name ?? "—"], ["RANK", `${rank.abbreviation} / ${rank.payGrade}`], ["SPECIALTY", specialty ? `${specialty.code} ${specialty.name}` : "—"], ["ASSIGNMENT", unit?.name ?? "Unassigned"]]) {
    const row=document.createElement("div"); row.className="dog-tag-row"; const key=document.createElement("span"), val=document.createElement("strong"); key.textContent=label; val.textContent=value; row.append(key,val); els.personDogTag.appendChild(row);
  }
  const status=document.createElement("div"); status.className="profile-status-strip";
  for (const text of [humanizeStatus(person.condition.status).toUpperCase(), `${person.condition.readiness}% READY`, `${person.condition.morale}% MORALE`]) { const chip=document.createElement("span"); chip.className="status-chip"; chip.textContent=text; status.appendChild(chip); }
  const assignmentSection=document.createElement("section"); assignmentSection.className="profile-section"; const assignmentTitle=document.createElement("h3"); assignmentTitle.textContent="Assignment"; assignmentSection.append(assignmentTitle,statLine("Duty Position", billetDef?.name ?? "Unassigned"),statLine("Unit", unit?.name ?? "Unassigned"),statLine("Status", humanizeStatus(person.condition.status)));
  const conditionSection=document.createElement("section"); conditionSection.className="profile-section"; const conditionTitle=document.createElement("h3"); conditionTitle.textContent="Condition"; conditionSection.append(conditionTitle,statLine("Health", `${person.condition.health}%`),statLine("Readiness", `${person.condition.readiness}%`),statLine("Morale", `${person.condition.morale}%`),statLine("Experience", person.career.experience));
  const skillsSection=document.createElement("section"); skillsSection.className="profile-section"; const skillsTitle=document.createElement("h3"); skillsTitle.textContent="Proficiency"; skillsSection.appendChild(skillsTitle);
  const gameplay=selectGameplay(state, indexes, registries, person.id); for (const skill of gameplay?.skills ?? []) skillsSection.appendChild(progressRow(skill.name,skill.value,100));
  els.personProfileBody.replaceChildren(status,assignmentSection,conditionSection,skillsSection);
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
function renderUnitRoster(state, indexes, unitId) {
  const unitView = selectOrganizationView(state, indexes, registries, unitId);
  const members = collectUnitPersonnel(state, indexes, unitId);
  const aggregate = aggregateStrength(state, indexes, unitId);
  els.squadMeta.textContent = `${unitView.name}${unitView.childUnitIds.length ? " + subordinate units" : ""} · ${members.length} personnel · ${aggregate.assigned}/${aggregate.authorized} assigned · Readiness ${unitView.readiness}% · Morale ${unitView.morale}% · ${state.world.date}`;
  els.squadBody.replaceChildren(...members.map(member => {
    const tr=document.createElement("tr"); if(member.isPlayer) tr.className="player-row";
    for(const value of [member.rank, `${member.name}${member.isPlayer ? " · YOU" : ""}`, member.billet, `${member.health}%`, `${member.morale}%`, member.weaponName, member.status]) { const td=document.createElement("td"); td.textContent=value; tr.appendChild(td); }
    tr.addEventListener("click",()=>showPersonProfile(member.id)); tr.classList.add("roster-row"); return tr;
  }));
}
function renderPersonnelBrowser(state, indexes, personId) {
  const ownUnitId = playerAssignmentUnitId(state, indexes, personId);
  if (!personnelFilterUnitId || !state.entities.units[personnelFilterUnitId]) personnelFilterUnitId = ownUnitId;
  const current=selectOrganizationView(state,indexes,registries,personnelFilterUnitId), personnel=collectUnitPersonnel(state,indexes,personnelFilterUnitId);
  els.unitPersonnelMeta.textContent=`${current.name}${current.childUnitIds.length ? " and subordinate units" : ""} · ${personnel.length} assigned personnel`;
  els.unitPersonnel.replaceChildren(...personnel.map(member=>{ const card=document.createElement("button"); card.type="button"; card.className=`person-card ${member.isPlayer?"player-row":""}`.trim(); const tag=document.createElement("div"); tag.className="mini-tag"; const h=document.createElement("h3"); h.textContent=`${member.rank} · ${member.name}${member.isPlayer ? " · YOU" : ""}`; const p=document.createElement("p"); p.textContent=`${member.billet} · ${humanizeStatus(member.status)}`; const status=document.createElement("div"); status.className="mini-status-row"; for(const text of [`${member.readiness}% READY`,`${member.morale}% MORALE`]){const chip=document.createElement("span");chip.className="mini-status-chip";chip.textContent=text;status.appendChild(chip);} tag.append(h,p,status); card.append(tag); card.addEventListener("click",()=>showPersonProfile(member.id)); return card;}));
  els.personnelMyUnit.disabled = personnelFilterUnitId === ownUnitId;
}
function renderOrganization(state, indexes, personId) {
  const assignment = selectAssignmentView(state, indexes, registries, personId), ownUnitId = assignment.chain.at(-1).unitId;
  if (!selectedOrganizationUnitId || !state.entities.units[selectedOrganizationUnitId]) selectedOrganizationUnitId = ownUnitId;
  const current = selectOrganizationView(state, indexes, registries, selectedOrganizationUnitId), aggregate = aggregateStrength(state, indexes, selectedOrganizationUnitId);
  const browseChain = organizationChain(state, indexes, selectedOrganizationUnitId);
  els.assignmentCard.replaceChildren(statLine("Duty Position", assignment.billetName), statLine("Assigned Since", assignment.assignmentStartDate), statLine("Chain", assignment.chain.map(x => x.name).join(" › ")));
  els.unitBreadcrumbs.replaceChildren(...browseChain.map(item => { const b=document.createElement("button"); b.type="button"; b.textContent=item.name; if(item.unitId===selectedOrganizationUnitId) b.disabled=true; b.addEventListener("click",()=>{selectedOrganizationUnitId=item.unitId; render();}); return b; }));
  els.organizationBrowser.replaceChildren(); const summary=document.createElement("div"); summary.className="unit-summary"; summary.append(statLine("Echelon", current.echelon),statLine("Branch",current.branch),statLine("Strength",`${aggregate.assigned} / ${aggregate.authorized}`),statLine("Vacancies",aggregate.vacancies),statLine("Readiness",`${current.readiness}%`),statLine("Morale",`${current.morale}%`)); els.organizationBrowser.append(summary);
  if(current.childUnitIds.length){ const children=document.createElement("div"); children.className="unit-children"; for(const id of current.childUnitIds){ const child=state.entities.units[id], b=document.createElement("button"); b.type="button"; b.className="unit-child"; b.textContent=`${child.name} · ${registries.echelons.get(child.echelonId).name}${id===ownUnitId ? " · YOUR UNIT" : ""}`; b.addEventListener("click",()=>{selectedOrganizationUnitId=id; render();}); children.appendChild(b);} els.organizationBrowser.append(children); }
  els.returnMyUnit.disabled = selectedOrganizationUnitId === ownUnitId;
  els.viewSelectedPersonnel.textContent = `View ${current.name} in Personnel`;
  renderUnitRoster(state, indexes, selectedOrganizationUnitId);
  renderPersonnelBrowser(state, indexes, personId);
  const orderIds=indexes.ordersByPersonId?.get(personId)??[]; els.ordersList.replaceChildren(); if(!orderIds.length){const p=document.createElement("p");p.className="muted";p.textContent="No orders recorded yet.";els.ordersList.append(p);} else for(const id of orderIds.slice().reverse()){const o=state.entities.orderRecords[id], card=document.createElement("article");card.className="order-card military-order";const mast=document.createElement("div");mast.className="order-masthead";mast.textContent="HEADQUARTERS · OFFICIAL ORDERS";const h=document.createElement("h3");h.textContent=o.title;const p1=document.createElement("p");p1.className="order-summary";p1.textContent=o.summary;const p2=document.createElement("p");p2.className="order-meta";p2.textContent=`ISSUED ${o.issueDate} · EFFECTIVE ${o.effectiveDate} · ${o.status.toUpperCase()}`;card.append(mast,h,p1,p2);els.ordersList.append(card);}
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


function renderGameplay(state, indexes, personId) {
  const view = selectGameplay(state, indexes, registries, personId);
  if (!view) return;
  els.skillSummary.replaceChildren();
  for (const skill of view.skills) {
    const row = document.createElement("div"); row.className = "skill-row"; row.appendChild(progressRow(skill.name, skill.value, 100)); els.skillSummary.appendChild(row);
  }
  els.pendingDecisions.replaceChildren();
  for (const decision of view.pendingDecisions) {
    const card=document.createElement("article"); card.className="decision-card"; const h=document.createElement("h3"); h.textContent=decision.title; const p=document.createElement("p"); p.textContent=decision.message; const actions=document.createElement("div"); actions.className="decision-choices";
    for (const choice of decision.choices) { const b=document.createElement("button"); b.type="button"; b.textContent=choice.label; b.addEventListener("click",()=>runCommand(()=>resolveDecision(store,registries,personId,decision.id,choice.id))); actions.appendChild(b); }
    card.append(h,p,actions); els.pendingDecisions.appendChild(card);
  }
  els.activityOptions.replaceChildren();
  for (const activity of view.activities) {
    const card=document.createElement("article"); card.className="activity-option";
    const meta=document.createElement("div"); meta.className="activity-meta"; meta.textContent=`${activity.durationDays} DAY${activity.durationDays===1?"":"S"}`;
    const h=document.createElement("h3"); h.textContent=activity.name;
    const p=document.createElement("p"); p.textContent=activity.description;
    const button=document.createElement("button"); button.type="button"; button.textContent=activity.eligible ? `Conduct ${activity.shortName}` : "Unavailable"; button.disabled=!activity.eligible; if(!activity.eligible) button.title=activity.reasons.join(", ");
    button.addEventListener("click",()=>runCommand(()=>performActivity(store,registries,personId,activity.id)));
    card.append(meta,h,p,button); els.activityOptions.appendChild(card);
  }
  els.activityHistory.replaceChildren();
  if (!view.recentActivities.length) { const p=document.createElement("p"); p.className="muted"; p.textContent="No focused training activities completed yet."; els.activityHistory.appendChild(p); }
  else for (const record of view.recentActivities) {
    const def=registries.activities.get(record.activityDefinitionId), item=document.createElement("button"); item.type="button"; item.className="activity-item training-record activity-log-button"; const time=document.createElement("time"); time.textContent=record.endDate; const text=document.createElement("span"); text.textContent=`${def.name} · ${(record.performanceRating ?? "completed").toUpperCase()} · ${record.durationDays} day${record.durationDays===1?"":"s"}${record.eventRecordId?" · event":""}`; item.append(time,text); item.addEventListener("click",()=>showActivityResult(record.id)); els.activityHistory.appendChild(item);
  }
}

function resultLabel(key) { const labels={experience:"Experience",prestige:"Prestige",health:"Health",morale:"Morale",readiness:"Readiness",fatigue:"Fatigue",unitReadiness:"Unit Readiness",unitCohesion:"Unit Cohesion"}; return labels[key] ?? key; }
function formatResultValue(key,value){ return ["health","morale","readiness","unitReadiness","unitCohesion"].includes(key) ? `${value}%` : String(value); }
function appendChangeRow(container,{label,before,after,delta,key=""}){ const row=document.createElement("div"); row.className=`aar-change ${delta>0?"positive":delta<0?"negative":"neutral"}`; const name=document.createElement("strong"); name.textContent=label; const values=document.createElement("span"); values.className="aar-change-values"; values.textContent=`${formatResultValue(key,before)} → ${formatResultValue(key,after)}`; const change=document.createElement("b"); change.textContent=`${delta>0?"+":""}${delta}`; row.append(name,values,change); container.appendChild(row); }
function showActivityResult(activityRecordId) {
  const state=store.getState(), record=state.entities.activityRecords[activityRecordId]; if(!record)return; const def=registries.activities.get(record.activityDefinitionId); const perf=performanceProfile(record.performanceRating??"satisfactory");
  els.resultDialog.dataset.tone=perf.tone; els.resultKicker.textContent="AFTER ACTION REPORT"; els.resultTitle.textContent=def.name; els.resultBody.replaceChildren();
  const header=document.createElement("div"); header.className="aar-header"; const grade=document.createElement("span"); grade.className=`performance-badge tone-${perf.tone}`; grade.textContent=perf.label; const date=document.createElement("span"); date.className="aar-date"; date.textContent=`${record.startDate} → ${record.endDate}`; header.append(grade,date); const desc=document.createElement("p"); desc.className="performance-description"; desc.textContent=perf.description; els.resultBody.append(header,desc);
  const changes=document.createElement("div"); changes.className="aar-change-grid";
  for(const [key,delta] of Object.entries(record.deltas??{})){ if(key==="skills" || !delta) continue; const before=record.before?.[key],after=record.after?.[key]; if(before!=null && after!=null) appendChangeRow(changes,{label:resultLabel(key),before,after,delta,key}); }
  for(const [id,delta] of Object.entries(record.deltas?.skills??{})){ if(!delta) continue; const before=record.before?.skills?.[id],after=record.after?.skills?.[id]; if(before!=null && after!=null) appendChangeRow(changes,{label:registries.skills.get(id)?.name??id,before,after,delta,key:"skill"}); }
  if(changes.childElementCount){const heading=document.createElement("h3");heading.className="aar-subheading";heading.textContent="Recorded Changes";els.resultBody.append(heading,changes);} else {const empty=document.createElement("p");empty.className="empty-state";empty.textContent="No measurable changes recorded.";els.resultBody.appendChild(empty);}
  if(record.repetitionMultiplier != null && record.repetitionMultiplier < 1){const rep=document.createElement("p");rep.className="aar-advisory";rep.textContent=`Repeated training reduced learning efficiency to ${Math.round(record.repetitionMultiplier*100)}%. Rotate activities for better gains.`;els.resultBody.appendChild(rep);}
  if(record.eventRecordId){const ev=state.entities.gameplayEventRecords[record.eventRecordId], defEv=ev?registries.gameplayEvents.get(ev.definitionId):null; if(defEv){const feedback=feedbackProfile(defEv);const box=document.createElement("section");box.className=`aar-event tone-${feedback.tone}`;const kicker=document.createElement("span");kicker.className="event-kicker";kicker.textContent=feedback.label;const title=document.createElement("strong");title.textContent=defEv.title;const message=document.createElement("p");message.textContent=defEv.message;box.append(kicker,title,message);els.resultBody.appendChild(box);}}
  els.resultDialog.showModal();
}
function showCommandResult(result) {
  if(!result)return; if(result.code==="activity_completed") return showActivityResult(result.data.activityRecordId);
  if(result.code==="time_advanced"){ els.resultDialog.dataset.tone="routine"; els.resultKicker.textContent="TIME ADVANCE SUMMARY"; els.resultTitle.textContent=`${result.data.days} Day${result.data.days===1?"":"s"} Advanced`; els.resultBody.replaceChildren(); const p=document.createElement("p");p.className="result-grade";p.textContent=`${result.data.startDate} → ${result.data.endDate}`;els.resultBody.appendChild(p); const list=document.createElement("div");list.className="time-summary-list"; for(const item of result.data.summaryItems??[]){const row=document.createElement("div");row.className=`time-summary-item tone-${item.tone??"routine"}`;row.textContent=item.label;list.appendChild(row);} if(!list.childElementCount){const empty=document.createElement("p");empty.className="empty-state";empty.textContent="No major career or unit events occurred.";list.appendChild(empty);} els.resultBody.appendChild(list); els.resultDialog.showModal(); }
}

function renderAdministration(state, indexes) {
  const view = selectPersonnelAdministration(state, indexes, registries);
  els.administrationSummary.replaceChildren();
  const summary = document.createElement("div"); summary.className = "status-chips";
  const summaryItems = [`${view.counts.active ?? 0} active`, `${view.vacantBillets.length} vacancies`, `${view.openRequests.length} replacement requests`, `${view.counts.separated ?? 0} separated`];
  for (const text of summaryItems) { const chip=document.createElement("span"); chip.className="status-chip"; chip.textContent=text; summary.appendChild(chip); }
  els.administrationSummary.appendChild(summary);
  renderList(els.replacementRequests, view.openRequests.map(r => `${r.unitName} · ${r.billetName} · requested ${r.requestedDate}`), view.vacantBillets.length ? `${view.vacantBillets.length} vacancy/vacancies are awaiting request processing.` : "No open replacement requests.");
  renderList(els.personnelActions, view.actions.map(a => `${a.effectiveDate} · ${a.personName} · ${a.type.replaceAll("_"," ")} · ${a.reason.replaceAll("_"," ")}`), "No personnel actions recorded yet.");
}

function render() {
  const state = store.getState(), indexes = store.getIndexes(), validation = validateWorldState(state, registries), hasPlayer = Boolean(state.playerPersonId);
  els.newCareerPanel.hidden = hasPlayer; els.careerContent.hidden = !hasPlayer;
  if (!hasPlayer) { els.diagnostics.textContent = ""; return; }
  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId), career = selectCareerRecord(state, indexes, registries, state.playerPersonId);
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
  else {
    els.promotionCard.append(statLine("Next Rank", `${career.promotion.nextRank.abbreviation} · ${career.promotion.nextRank.name}`));
    const prog = career.promotion.progress ?? {};
    if (prog.requiredExperience) els.promotionCard.append(progressRow("Experience", prog.experience, prog.requiredExperience));
    if (prog.requiredServiceDays) els.promotionCard.append(progressRow("Time in Service", prog.serviceDays, prog.requiredServiceDays));
    if (prog.requiredGradeDays) els.promotionCard.append(progressRow("Time in Grade", prog.gradeDays, prog.requiredGradeDays));
    const reasonBox = document.createElement("div"); renderList(reasonBox, career.promotion.reasons, "All current requirements are satisfied."); els.promotionCard.appendChild(reasonBox); els.promote.disabled = !career.promotion.eligible;
  }
  renderList(els.schoolsAwards, [...career.qualifications.map(item => `${item.name} — ${item.completedDate}`), ...career.awards.map(item => `${item.name} (${item.category}) — ${item.earnedDate}`)], "No schools, qualifications, or awards recorded yet.");
  renderRelationships(career.relationships);
  els.careerEvents.replaceChildren(...career.events.map(event => { const li = document.createElement("li"), time = document.createElement("time"); time.textContent = event.date; li.append(time, document.createTextNode(event.label)); return li; }));
  renderInbox(state, indexes, state.playerPersonId);
  renderGameplay(state, indexes, state.playerPersonId);
  renderOrganization(state, indexes, state.playerPersonId);
  renderServiceCareer(state, indexes, state.playerPersonId);
  renderAdministration(state, indexes);
  els.diagnostics.textContent = JSON.stringify({ valid: validation.ok, validationErrors: validation.errors, definitionValidation, worldSchemaVersion: state.schemaVersion, gameVersion: state.gameVersion, worldClock: state.world.clock, worldSeed: state.world.seed, generation: state.world.generation, rngState: state.world.rngState, nextEntitySequence: state.world.nextEntitySequence, registryCounts: Object.fromEntries(Object.entries(registries).map(([k, r]) => [k, r.size])), runtimeCounts: Object.fromEntries(Object.entries(state.entities).map(([name, collection]) => [name, Object.keys(collection).length])), indexedSquadMembers: indexes.peopleByUnitId.get(squad.unitId)?.length ?? 0, playerRelationships: indexes.relationshipsByPersonId.get(state.playerPersonId)?.length ?? 0 }, null, 2);
  setActiveView(activeView, { scroll: false });
}

function getNoticesByIds(ids) { const state = store.getState(); return ids.map(id => state.entities.notificationRecords[id]).filter(Boolean); }
function queueNotifications(ids) { achievementQueue.push(...getNoticesByIds(ids).filter(n => ["qualification_completed", "award_earned", "promotion", "memorial"].includes(n.type))); showNextAchievement(); }
function showNextAchievement() { if (els.achievementDialog.open || achievementQueue.length === 0) return; const notice = achievementQueue.shift(); els.achievementType.textContent = notice.type.replaceAll("_", " ").toUpperCase(); els.achievementTitle.textContent = notice.title; els.achievementMessage.textContent = notice.message; els.achievementDialog.dataset.notificationId = notice.id; els.achievementDialog.showModal(); }
els.achievementOk.addEventListener("click", () => { const id = els.achievementDialog.dataset.notificationId; if (id) { try { markNotificationRead(store, id); } catch {} } els.achievementDialog.close(); showNextAchievement(); });

function autosave() { if (!store.getState().playerPersonId) return; const validation = validateWorldState(store.getState(), registries); if (validation.ok) saveToSlot(store.getState(), AUTOSAVE_SLOT); }
function pulseFeedback(result) {
  const targets = result?.code === "activity_completed" ? [els.careerSummary, els.skillSummary, els.activityHistory] : result?.code === "time_advanced" ? [els.careerSummary, els.promotionCard] : [];
  for (const target of targets.filter(Boolean)) { target.classList.remove("feedback-pulse"); void target.offsetWidth; target.classList.add("feedback-pulse"); setTimeout(() => target.classList.remove("feedback-pulse"), 700); }
}
function runCommand(fn, { autosaveAfter = true, statusTone = "good" } = {}) { try { const result = fn(); if (result?.notifications?.length) queueNotifications(result.notifications); eventBus.publish({ type: "command_completed", result }); showCommandResult(result); pulseFeedback(result); if (autosaveAfter) autosave(); setStatus(result?.message ?? "Command completed.", statusTone); return result; } catch (error) { console.error(error); setStatus(error instanceof Error ? error.message : String(error), "bad"); return null; } }

function confirmAction(title, message) { return new Promise(resolve => { els.confirmTitle.textContent = title; els.confirmMessage.textContent = message; const handler = () => { els.confirmDialog.removeEventListener("close", handler); resolve(els.confirmDialog.returnValue === "confirm"); }; els.confirmDialog.addEventListener("close", handler); els.confirmDialog.showModal(); }); }

function renderSaveManager(mode) {
  saveMode = mode; els.saveModeLabel.textContent = mode === "save" ? "SAVE CAREER" : "LOAD CAREER"; els.saveDialogTitle.textContent = mode === "save" ? "Choose Save Slot" : "Choose Career to Load"; els.saveSlots.replaceChildren();
  const slots = listSaveSlots();
  for (const meta of slots) {
    const card = document.createElement("section"); card.className = `save-slot ${meta.slotId === AUTOSAVE_SLOT ? "autosave-slot" : ""}`.trim();
    const h = document.createElement("h3"); h.textContent = meta.slotId === AUTOSAVE_SLOT ? "Autosave" : `Save ${Number(meta.slotId.split("_")[1])}`; card.appendChild(h);
    if (meta.empty) { const p = document.createElement("p"); p.textContent = "Empty"; card.appendChild(p); }
    else {
      for (const text of [meta.characterName, `${resolveRankName(meta.rankId)} · ${resolveBranchName(meta.branchId)}`, meta.specialtyId && registries.specialties.has(meta.specialtyId) ? `${registries.specialties.get(meta.specialtyId).code} · ${registries.specialties.get(meta.specialtyId).name}` : null, meta.unitName ? `Unit · ${meta.unitName}` : null, `Game date ${meta.gameDate}`, `Saved ${formatSavedAt(meta.savedAt)}`, `v${meta.gameVersion} · schema ${meta.worldSchemaVersion}`].filter(Boolean)) { const p = document.createElement("p"); p.textContent = text; card.appendChild(p); }
    }
    const actions = document.createElement("div"); actions.className = "actions";
    if (mode === "save" && meta.slotId !== AUTOSAVE_SLOT) { const button = document.createElement("button"); button.type = "button"; button.textContent = meta.empty ? "Save Here" : "Overwrite"; button.addEventListener("click", async () => { if (!meta.empty && !(await confirmAction("Overwrite Save?", `Replace ${meta.characterName} in this slot?`))) return; const validation = validateWorldState(store.getState(), registries); if (!validation.ok) { setStatus(`Save blocked: ${validation.errors.join(" | ")}`, "bad"); return; } const saved = saveToSlot(store.getState(), meta.slotId); setStatus(`Saved ${saved.characterName} to ${meta.slotId}.`, "good"); renderSaveManager("save"); }); actions.appendChild(button); }
    if (mode === "load" && !meta.empty) { const button = document.createElement("button"); button.type = "button"; button.textContent = "Load"; button.addEventListener("click", async () => { if (store.getState().playerPersonId && !(await confirmAction("Load Career?", "Unsaved progress in the current session will be replaced."))) return; try { const loaded = loadFromSlot(meta.slotId); if (!loaded) throw new Error("Save slot is empty."); const validation = validateWorldState(loaded.worldState, registries); if (!validation.ok) throw new Error(`Load blocked: ${validation.errors.join(" | ")}`); store.replaceState(loaded.worldState); els.saveDialog.close(); setStatus(`Loaded ${loaded.metadata?.characterName ?? "career"}.`, "good"); } catch (error) { setStatus(error.message, "bad"); } }); actions.appendChild(button); }
    if (!meta.empty && meta.slotId !== AUTOSAVE_SLOT) { const del = document.createElement("button"); del.type = "button"; del.className = "secondary"; del.textContent = "Delete"; del.addEventListener("click", async () => { if (!(await confirmAction("Delete Save?", `Permanently delete ${meta.characterName}?`))) return; deleteSaveSlot(meta.slotId); renderSaveManager(mode); }); actions.appendChild(del); }
    card.appendChild(actions); els.saveSlots.appendChild(card);
  }
}
function openSaveManager(mode) { renderSaveManager(mode); els.saveDialog.showModal(); }

els.newCareerForm.addEventListener("submit", event => { event.preventDefault(); runCommand(() => createPlayerCareer(store, registries, { firstName: els.firstName.value, lastName: els.lastName.value, branchId: els.branchSelect.value, componentId: els.componentSelect.value, specialtyId: els.specialtySelect.value, contractDefinitionId: els.contractSelect.value, seed: Number(els.worldSeed.value) >>> 0 }), { autosaveAfter: true }); });
els.advance1.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 1)));
els.advance7.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 7)));
els.advance30.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 30)));
els.reviewReenlistment.addEventListener("click", () => runCommand(() => generateReenlistmentOffers(store, registries, store.getState().playerPersonId)));
els.promote.addEventListener("click", () => runCommand(() => promotePerson(store, registries, store.getState().playerPersonId)));
els.airborne.addEventListener("click", () => runCommand(() => completeSchool(store, registries, store.getState().playerPersonId, "school_airborne")));
els.leadership.addEventListener("click", () => runCommand(() => completeSchool(store, registries, store.getState().playerPersonId, "school_leadership")));
els.save.addEventListener("click", () => openSaveManager("save")); els.load.addEventListener("click", () => openSaveManager("load")); els.loadFromStart.addEventListener("click", () => openSaveManager("load"));
els.resultClose.addEventListener("click",()=>els.resultDialog.close());
els.markAllRead.addEventListener("click",()=>runCommand(()=>markAllNotificationsRead(store,store.getState().playerPersonId),{autosaveAfter:true}));
els.clearRead.addEventListener("click",()=>runCommand(()=>clearReadNotifications(store,store.getState().playerPersonId),{autosaveAfter:true}));
els.saveDialogClose.addEventListener("click", () => els.saveDialog.close());
els.personProfileClose.addEventListener("click", () => els.personDialog.close());
els.newCareer.addEventListener("click", async () => {
  if (!(await confirmAction("Start New Career?", "The current session will be replaced. Your manual save slots will not be deleted."))) return;
  const seed = freshWorldSeed(); const scenario = registries.careerStartScenarios.values().find(item => item.enabled);
  store.replaceState(createInitialWorldState({ seed, scenarioId: scenario?.id })); els.newCareerForm.reset();
  if (scenario) {
    els.branchSelect.value = scenario.branchId; els.componentSelect.value = scenario.componentId; els.specialtySelect.value = scenario.specialtyId;
    els.contractSelect.value = scenario.allowedContractDefinitionIds[0] ?? registries.components.get(scenario.componentId).defaultContractDefinitionId;
  }
  els.worldSeed.value = String(seed); activeView = "career"; selectedOrganizationUnitId = null; personnelFilterUnitId = null; setStatus("New career setup ready with a new generated world seed. Existing save slots were preserved.", "warn");
});

els.returnMyUnit.addEventListener("click", () => { const state=store.getState(), indexes=store.getIndexes(); selectedOrganizationUnitId=playerAssignmentUnitId(state,indexes); render(); });
els.viewSelectedPersonnel.addEventListener("click", () => { personnelFilterUnitId=selectedOrganizationUnitId; setActiveView("personnel"); render(); });
els.personnelMyUnit.addEventListener("click", () => { const state=store.getState(), indexes=store.getIndexes(); personnelFilterUnitId=playerAssignmentUnitId(state,indexes); render(); });
document.querySelectorAll("#bottom-nav [data-view]").forEach(button => button.addEventListener("click", () => setActiveView(button.dataset.view)));
els.appErrorDismiss.addEventListener("click", () => { els.appError.hidden = true; });

function safeRender() {
  try { render(); els.appError.hidden = true; }
  catch (error) {
    console.error("Render failure", error);
    els.appErrorMessage.textContent = error instanceof Error ? error.message : String(error);
    els.appError.hidden = false;
    setStatus("A display error was contained. Your canonical save state was not modified.", "bad");
  }
}

store.subscribe(safeRender); eventBus.subscribe("command_completed", () => {}); safeRender();
