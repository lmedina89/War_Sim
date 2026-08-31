import { registries } from "./data/registries.js";
import { createStateStore } from "./core/stateStore.js";
import { createEventBus } from "./core/eventBus.js";
import { validateWorldState } from "./core/validator.js";
import { validateDefinitions } from "./core/definitionValidator.js";
import { listSaveSlots, saveToSlot, loadFromSlot, deleteSaveSlot, MANUAL_SAVE_SLOTS, AUTOSAVE_SLOT } from "./core/saveSystem.js";
import { createInitialWorldState } from "./state/initialState.js";
import { createPlayerCareer } from "./commands/createPlayerCareer.js";
import { promotePerson } from "./commands/promotePerson.js";
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
import { acceptCareerOpportunity, declineCareerOpportunity } from "./commands/careerOpportunities.js";
import { scheduleUnitDuty } from "./commands/scheduleUnitDuty.js";
import { calculateUnitReadiness } from "./services/unitReadiness.js";
import { simulatePersonnelLifecycle } from "./services/personnelLifecycle.js";
import { selectUnitCapabilityInventory } from "./selectors/selectUnitCapability.js";
import { evaluatePromotionEligibility } from "./services/careerRules.js";
import { updateCareerObjectivesInDraft } from "./services/careerGameplay.js";
import { selectSchoolCatalog } from "./selectors/selectSchoolCatalog.js";
import { requestSchoolOpportunity } from "./commands/requestSchool.js";
import { selectSoldierIdentity } from "./selectors/selectSoldierIdentity.js";
import { createInsignia } from "./ui/insignia.js";

const definitionValidation = validateDefinitions(registries);
if (!definitionValidation.ok) throw new Error(`Definition validation failed: ${definitionValidation.errors.join(" | ")}`);

const store = createStateStore(createInitialWorldState());
const eventBus = createEventBus();
let achievementQueue = [], saveMode = "save", selectedOrganizationUnitId = null, personnelFilterUnitId = null, activeView = "career", statusTimer = null, personProfileActivityExpanded = false;
const CAREER_HISTORY_PREVIEW_LIMIT = 5;
const UNIT_TRAINING_PREVIEW_LIMIT = 4;
const UNIT_HISTORY_PREVIEW_LIMIT = 5;

const $ = selector => document.querySelector(selector);
const els = {
  appError: $("#app-error"), appErrorMessage: $("#app-error-message"), appErrorDismiss: $("#app-error-dismiss"), situationStrip: $("#situation-strip"), persistentWorldContext: $("#persistent-world-context"), navCareerBadge: $("#nav-career-badge"), pendingDecisions: $("#pending-decisions"), activityOptions: $("#activity-options"), skillSummary: $("#skill-summary"), activityHistory: $("#activity-history"), careerObjectives: $("#career-objectives"), next30Days: $("#next-30-days"), unitSituationFeed: $("#unit-situation-feed"), currentDuty: $("#current-duty"), dutySchedule: $("#duty-schedule"), careerOpportunities: $("#career-opportunities"), schoolCatalog: $("#school-catalog"), readinessBreakdown: $("#readiness-breakdown"), commandAuthority: $("#command-authority"), trainingPhaseSummary: $("#training-phase-summary"), unitHistory: $("#unit-history"), unitCapability: $("#unit-capability"),
  newCareerPanel: $("#new-career-panel"), careerContent: $("#career-content"), newCareerForm: $("#new-career-form"), firstName: $("#first-name"), lastName: $("#last-name"), branchSelect: $("#branch-select"), componentSelect: $("#component-select"), specialtySelect: $("#specialty-select"), contractSelect: $("#contract-select"), worldSeed: $("#world-seed"), rerollSeed: $("#reroll-seed"),
  squadMeta: $("#squad-meta"), squadBody: $("#squad-body"), careerSummary: $("#career-summary"), careerCard: $("#career-card"), promotionCard: $("#promotion-card"), schoolsAwards: $("#schools-awards"), soldierIdentity: $("#soldier-identity"), relationships: $("#relationships"), careerEvents: $("#career-events"), careerInbox: $("#career-inbox"), unreadBadge: $("#unread-badge"), markAllRead: $("#mark-all-read"), clearRead: $("#clear-read"), assignmentCard: $("#assignment-card"), unitBreadcrumbs: $("#unit-breadcrumbs"), organizationBrowser: $("#organization-browser"), unitPersonnel: $("#unit-personnel"), unitPersonnelMeta: $("#unit-personnel-meta"), returnMyUnit: $("#return-my-unit"), viewSelectedPersonnel: $("#view-selected-personnel"), personnelMyUnit: $("#personnel-my-unit"), personDogTag: $("#person-dog-tag"), personProfileAuthority: $("#person-profile-authority"), personProfileRef: $("#person-profile-ref"), personProfileBreadcrumbs: $("#person-profile-breadcrumbs"), ordersList: $("#orders-list"), serviceCareer: $("#service-career"), reenlistmentOffers: $("#reenlistment-offers"), reviewReenlistment: $("#review-reenlistment"), careerFramework: $("#career-framework"), personDialog: $("#person-dialog"), personProfileName: $("#person-profile-name"), personProfileBody: $("#person-profile-body"), personProfileClose: $("#person-profile-close"), administrationSummary: $("#administration-summary"), replacementRequests: $("#replacement-requests"), personnelActions: $("#personnel-actions"), diagnostics: $("#diagnostics"), auditNpc30: $("#audit-npc-30"), auditNpc90: $("#audit-npc-90"), auditNpc365: $("#audit-npc-365"), status: $("#status-message"), resultDialog: $("#result-dialog"), resultReference: $("#result-reference"), resultKicker: $("#result-kicker"), resultTitle: $("#result-title"), resultBody: $("#result-body"), resultClose: $("#result-close"),
  advance1: $("#advance-1"), advance7: $("#advance-7"), advance30: $("#advance-30"), promote: $("#promote-player"), save: $("#save-game"), load: $("#load-game"), newCareer: $("#new-career"), loadFromStart: $("#load-from-start"),
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

function initializeDisclosureState() {
  document.querySelectorAll("details[data-persist-key]").forEach(details => {
    const key=`war-sim:ui:details:${details.dataset.persistKey}`;
    try { const saved=localStorage.getItem(key); if(saved != null) details.open=saved === "open"; } catch {}
    details.addEventListener("toggle",()=>{ try { localStorage.setItem(key,details.open?"open":"closed"); } catch {} });
  });
}
initializeDisclosureState();

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
function uiArchiveKey(kind, personId) { return `war-sim:ui:archive:${kind}:${personId ?? "none"}`; }
function readUiArchive(kind, personId) { try { const raw=localStorage.getItem(uiArchiveKey(kind,personId)); const values=raw?JSON.parse(raw):[]; return new Set(Array.isArray(values)?values:[]); } catch { return new Set(); } }
function writeUiArchive(kind, personId, values) { try { localStorage.setItem(uiArchiveKey(kind,personId), JSON.stringify([...values])); } catch {} }
function archiveUiRecord(kind, personId, recordId) { archiveUiRecords(kind,personId,[recordId]); }
function archiveUiRecords(kind, personId, recordIds) { const values=readUiArchive(kind,personId); for(const id of recordIds) values.add(id); writeUiArchive(kind,personId,values); render(); }
function clearUiArchive(kind, personId) { writeUiArchive(kind,personId,new Set()); render(); }
function createHistoryControls({ kind, personId, hiddenCount=0, archivedCount=0, expanded=false, onToggle }) {
  const actions=document.createElement("div"); actions.className="history-actions";
  if(hiddenCount>0){const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary compact-button";toggle.textContent=expanded?"Recent Only":`Show More (${hiddenCount})`;toggle.addEventListener("click",onToggle);actions.appendChild(toggle);}
  if(archivedCount>0){const restore=document.createElement("button");restore.type="button";restore.className="secondary compact-button";restore.textContent=`Restore Archived (${archivedCount})`;restore.addEventListener("click",()=>clearUiArchive(kind,personId));actions.appendChild(restore);}
  return actions;
}
function scrollToCareerTarget(targetId) {
  setActiveView("career", { scroll:false });
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ const target=document.getElementById(targetId); if(target){ const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-110); window.scrollTo({top,behavior:"smooth"}); target.classList.add("attention-flash"); setTimeout(()=>target.classList.remove("attention-flash"),1400); } }));
}
function openOpportunityRecord(opportunityRecordId) { scrollToCareerTarget(opportunityRecordId); }
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
    const meters=document.createElement("div"); meters.className="relationship-meters"; meters.append(meter("Trust",rel.trust,-100,100,{signed:true}),meter("Respect",rel.respect??0,-100,100,{signed:true}),meter("Rapport",rel.rapport??0,-100,100,{signed:true}));
    const context=document.createElement("div");context.className="relationship-context";if(rel.personalityTraits?.length){const traits=document.createElement("small");traits.textContent=`Traits: ${rel.personalityTraits.join(" · ")}`;context.appendChild(traits);}if(rel.memories?.length){const memory=document.createElement("small");memory.textContent=`Recent: ${rel.memories[0].summary}`;context.appendChild(memory);}
    card.append(top,meters,context); card.addEventListener("click",()=>showPersonProfile(rel.otherPersonId)); els.relationships.appendChild(card);
  }
}
function performanceProfile(rating) { return registries.performanceRatings.has(rating) ? registries.performanceRatings.get(rating) : registries.performanceRatings.get("satisfactory"); }
function feedbackProfile(definition) { return definition?.presentationId && registries.feedbackPresentations.has(definition.presentationId) ? registries.feedbackPresentations.get(definition.presentationId) : registries.feedbackPresentations.get("feedback_routine"); }
function humanizeStatus(value) { return String(value ?? "unknown").replaceAll("_"," "); }
function statusProfile(status) { return registries.statusPresentations.has(status) ? registries.statusPresentations.get(status) : { id:String(status??"unknown"), label:humanizeStatus(status).toUpperCase(), tone:"routine", priority:0 }; }
function documentProfile(id) { return registries.documentPresentations.get(id); }
function compactReference(prefix, id) {
  const text = String(id ?? "record"); let hash = 2166136261;
  for (let i=0;i<text.length;i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `${prefix}-${(hash >>> 0).toString(36).toUpperCase().padStart(7,"0").slice(-7)}`;
}
function statusStamp(status, extraClass="") { const profile=statusProfile(status); const stamp=document.createElement("span"); stamp.className=`mil-status-stamp tone-${profile.tone} ${extraClass}`.trim(); stamp.textContent=profile.label; stamp.dataset.status=status; return stamp; }
function metricBlock(label, value, subtext="") { const box=document.createElement("div"); box.className="mil-metric"; const key=document.createElement("span"); key.textContent=label; const val=document.createElement("strong"); val.textContent=String(value); box.append(key,val); if(subtext){const sub=document.createElement("small");sub.textContent=subtext;box.appendChild(sub);} return box; }
function recordReference(documentId, entityId) { const profile=documentProfile(documentId); return compactReference(profile?.prefix ?? "REC", entityId); }

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
  if (!notices.length) { const p = document.createElement("p"); p.className = "empty-state military-empty"; p.textContent = "NO ACTIVE PERSONNEL DISPATCHES"; els.careerInbox.appendChild(p); return; }
  const list = document.createElement("div"); list.className = "inbox-list dispatch-list";
  for (const notice of notices.slice(0, 30)) {
    const item = document.createElement("article"); item.className = `inbox-item dispatch-card ${notice.readAtElapsedDay == null ? "unread" : "read"}`.trim();
    const rail=document.createElement("div"); rail.className="dispatch-rail"; const ref=document.createElement("span"); ref.textContent=recordReference("notification",notice.id); const stateLabel=document.createElement("span"); stateLabel.textContent=notice.readAtElapsedDay==null?"NEW":"READ"; rail.append(ref,stateLabel);
    const meta = document.createElement("div"); meta.className = "inbox-meta"; const type=document.createElement("span"), date=document.createElement("span"); type.textContent=notice.type.replaceAll("_", " ").toUpperCase(); date.textContent=notice.gameDate; meta.append(type,date);
    const h = document.createElement("h3"); h.textContent = notice.title; const p = document.createElement("p"); p.textContent = notice.message; item.append(rail, meta, h, p);
    const actions=document.createElement("div"); actions.className="notice-actions";
    const opportunityRecordId=notice.references?.opportunityRecordId ?? null;
    if(opportunityRecordId && state.entities.opportunityRecords?.[opportunityRecordId]) { const open=document.createElement("button"); open.type="button"; open.className="compact-button"; open.textContent="Open Opportunity"; open.addEventListener("click",()=>{ if(notice.readAtElapsedDay==null) try{markNotificationRead(store,notice.id);}catch{} openOpportunityRecord(opportunityRecordId); }); actions.appendChild(open); }
    if (notice.readAtElapsedDay == null) { const readButton=document.createElement("button"); readButton.type="button"; readButton.className="secondary compact-button"; readButton.textContent="Acknowledge"; readButton.addEventListener("click",()=>runCommand(()=>markNotificationRead(store,notice.id))); actions.appendChild(readButton); }
    else { const clear=document.createElement("button"); clear.type="button"; clear.className="secondary compact-button"; clear.textContent="Archive"; clear.addEventListener("click",()=>runCommand(()=>archiveNotification(store,notice.id))); actions.appendChild(clear); }
    item.appendChild(actions); list.appendChild(item);
  }
  els.careerInbox.appendChild(list);
}

function descendantUnitIds(state, indexes, unitId) {
  const result = [unitId], queue = [unitId];
  for (let cursor=0; cursor<queue.length; cursor++) { const current = queue[cursor]; for (const child of indexes.unitsByParentUnitId.get(current) ?? []) { result.push(child); queue.push(child); } }
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

function formatMilitaryDate(isoDate) {
  const date=new Date(`${isoDate}T00:00:00Z`);
  if(Number.isNaN(date.getTime())) return String(isoDate ?? "—");
  const day=String(date.getUTCDate()).padStart(2,"0"), month=date.toLocaleString("en-US",{month:"short",timeZone:"UTC"}).toUpperCase(), year=date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
function renderPersistentWorldContext(state) {
  if(!els.persistentWorldContext) return;
  if(!state.playerPersonId){els.persistentWorldContext.textContent="";return;}
  const phaseId=state.world.scheduler?.trainingPhaseId ?? "training_phase_garrison";
  const phase=registries.trainingPhases.has(phaseId)?registries.trainingPhases.get(phaseId):null;
  const date=document.createElement("time"); date.dateTime=state.world.date; date.textContent=formatMilitaryDate(state.world.date);
  const sep=document.createElement("span"); sep.textContent="·";
  const phaseLabel=document.createElement("span"); phaseLabel.textContent=phase?.shortLabel ?? phase?.name ?? "CAREER";
  els.persistentWorldContext.replaceChildren(date,sep,phaseLabel);
}

function renderSituation(state, indexes, personId) {
  const person=state.entities.people[personId]; if(!person){els.situationStrip.replaceChildren(); return;}
  const rank=registries.ranks.get(person.affiliation.rankId), specialty=registries.specialties.get(person.affiliation.specialtyId);
  const assignment=selectAssignmentView(state,indexes,registries,personId); const ownUnitId=assignment.chain.at(-1)?.unitId;
  const unit=ownUnitId?selectOrganizationView(state,indexes,registries,ownUnitId):null; const strength=ownUnitId?aggregateStrength(state,indexes,ownUnitId):{assigned:0,authorized:0};
  const identity=document.createElement("div"); identity.className="situation-identity";
  const kicker=document.createElement("span"); kicker.className="situation-kicker"; kicker.textContent="CURRENT SITUATION";
  const title=document.createElement("strong"); title.textContent=`${rank.abbreviation} ${person.identity.displayName}`;
  const sub=document.createElement("span"); sub.textContent=`${specialty.code} ${specialty.name} · ${assignment.chain.map(x=>x.name).join(" / ")}`; identity.append(kicker,title,sub);
  const metrics=document.createElement("div"); metrics.className="situation-metrics";
  const gameplay=selectGameplay(state,indexes,registries,personId); const dutyLabel=gameplay?.currentDuty?.shortName ?? "AVAILABLE";
  metrics.append(statusStamp(person.condition.status),metricBlock("DATE",state.world.date),metricBlock("DUTY",dutyLabel),metricBlock("PERS",`${strength.assigned}/${strength.authorized}`),metricBlock("RDY",unit?`${unit.readiness}%`:"—"),metricBlock("MORALE",unit?`${unit.morale}%`:"—"));
  els.situationStrip.replaceChildren(identity,metrics);
}

function showPersonProfile(personId) {
  const state = store.getState(), indexes = store.getIndexes(), person = state.entities.people[personId]; if (!person) return;
  const rank = registries.ranks.get(person.affiliation.rankId), billet = state.entities.billets[person.affiliation.billetId], billetDef = billet ? registries.billets.get(billet.definitionId) : null, unit = state.entities.units[person.affiliation.unitId];
  const branch = registries.branches.get(person.affiliation.branchId), specialty = registries.specialties.get(person.affiliation.specialtyId), assignment=selectAssignmentView(state,indexes,registries,personId);
  const career=selectCareerRecord(state,indexes,registries,personId), loadout=state.entities.loadouts[person.loadoutId], primary=loadout?state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId]:null, equipment=primary?registries.equipment.get(primary.definitionId):null;
  els.personProfileAuthority.textContent=`${branch?.name?.toUpperCase() ?? "SERVICE"} PERSONNEL COMMAND`;
  els.personProfileRef.textContent=recordReference("personnel_file",personId);
  els.personProfileName.textContent = `${rank.abbreviation} ${person.identity.displayName}${personId === state.playerPersonId ? " · YOU" : ""}`;
  els.personDogTag.replaceChildren();
  for (const [label, value] of [["NAME", person.identity.displayName.toUpperCase()], ["SERVICE", branch?.name ?? "—"], ["GRADE", `${rank.abbreviation} / ${rank.payGrade}`], ["MOS", specialty ? `${specialty.code} ${specialty.name}` : "—"], ["UNIT", unit?.name ?? "Unassigned"]]) {
    const row=document.createElement("div"); row.className="dog-tag-row"; const key=document.createElement("span"), val=document.createElement("strong"); key.textContent=label; val.textContent=value; row.append(key,val); els.personDogTag.appendChild(row);
  }
  els.personProfileBreadcrumbs.replaceChildren(...assignment.chain.map(item=>{const b=document.createElement("button");b.type="button";b.className="profile-breadcrumb";b.textContent=item.name;b.addEventListener("click",()=>{selectedOrganizationUnitId=item.unitId;els.personDialog.close();setActiveView("unit");render();});return b;}));
  const status=document.createElement("div"); status.className="profile-status-strip"; status.append(statusStamp(person.condition.status),metricBlock("READY",`${person.condition.readiness}%`),metricBlock("MORALE",`${person.condition.morale}%`),metricBlock("HEALTH",`${person.condition.health}%`));
  const assignmentSection=document.createElement("section"); assignmentSection.className="profile-section service-file-section"; const assignmentTitle=document.createElement("h3"); assignmentTitle.textContent="Assignment"; const openUnit=document.createElement("button");openUnit.type="button";openUnit.className="secondary compact-button profile-unit-link";openUnit.textContent="Open Unit";openUnit.addEventListener("click",()=>{selectedOrganizationUnitId=person.affiliation.unitId;els.personDialog.close();setActiveView("unit");render();}); assignmentSection.append(assignmentTitle,statLine("Duty Position", billetDef?.name ?? "Unassigned"),statLine("Unit", unit?.name ?? "Unassigned"),openUnit);
  const conditionSection=document.createElement("section"); conditionSection.className="profile-section service-file-section"; const conditionTitle=document.createElement("h3"); conditionTitle.textContent="Condition"; conditionSection.append(conditionTitle,statLine("Fatigue", `${person.condition.fatigue}%`),statLine("Experience", person.career.experience),statLine("Prestige", person.career.prestige));
  const equipmentSection=document.createElement("section");equipmentSection.className="profile-section service-file-section";const equipmentTitle=document.createElement("h3");equipmentTitle.textContent="Assigned Equipment";equipmentSection.append(equipmentTitle,statLine("Primary",equipment?.name??"Unassigned"),statLine("Condition",primary?.condition!=null?`${primary.condition}%`:"—"));
  const skillsSection=document.createElement("section"); skillsSection.className="profile-section service-file-section"; const skillsTitle=document.createElement("h3"); skillsTitle.textContent="Proficiency"; skillsSection.appendChild(skillsTitle);
  const gameplay=selectGameplay(state, indexes, registries, person.id); for (const skill of gameplay?.skills ?? []) skillsSection.appendChild(progressRow(skill.name,skill.value,100));
  const recordSection=document.createElement("section");recordSection.className="profile-section service-file-section";const recordTitle=document.createElement("h3");recordTitle.textContent="Education, Qualifications & Awards";recordSection.appendChild(recordTitle);
  if(!career.education.length&&!career.qualifications.length&&!career.awards.length){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO MILITARY EDUCATION, QUALIFICATIONS, OR AWARDS RECORDED";recordSection.appendChild(empty);} else {const usedQualifications=new Set(),usedAwards=new Set();for(const e of career.education){const cluster=document.createElement("div");cluster.className="achievement-cluster";const head=statLine(e.name,`GRADUATED · ${e.completedDate??"—"}`);cluster.appendChild(head);const linkedQualifications=career.qualifications.filter(q=>q.schoolId===e.schoolId);for(const q of linkedQualifications){usedQualifications.add(q.id);const detail=[q.result?.toUpperCase(),q.score!=null&&q.maxScore!=null?`${q.score}/${q.maxScore}`:null,q.expiresDate?`EXP ${q.expiresDate}`:null].filter(Boolean).join(" · ");const line=statLine(`↳ ${q.name}`,detail||q.completedDate);line.classList.add("achievement-child");cluster.appendChild(line);}const linkedAwards=career.awards.filter(a=>a.sourceId===e.id || registries.awards.get(a.awardId)?.eligibilitySource===e.schoolId);for(const a of linkedAwards){usedAwards.add(a.id);const line=statLine(`↳ ${a.name}`,a.earnedDate);line.classList.add("achievement-child");cluster.appendChild(line);}recordSection.appendChild(cluster);}for(const q of career.qualifications.filter(q=>!usedQualifications.has(q.id))){const detail=[q.result?.toUpperCase(),q.score!=null&&q.maxScore!=null?`${q.score}/${q.maxScore}`:null,q.expiresDate?`EXP ${q.expiresDate}`:null].filter(Boolean).join(" · ");recordSection.appendChild(statLine(q.name,detail||q.completedDate));}for(const a of career.awards.filter(a=>!usedAwards.has(a.id)))recordSection.appendChild(statLine(a.name,a.earnedDate));}
  const activitySection=document.createElement("section");activitySection.className="profile-section service-file-section";const activityTitle=document.createElement("h3");activityTitle.textContent="Recent Career Activity";activitySection.appendChild(activityTitle);const profileArchiveKey=`${personId}`;const profileArchive=readUiArchive("person-career-activity",profileArchiveKey);const profileVisible=(gameplay?.recentCareerActivity??[]).filter(item=>!profileArchive.has(item.id));const profileExpanded=personProfileActivityExpanded;const profileShown=profileExpanded?profileVisible:profileVisible.slice(0,4);
  if(!profileShown.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent=profileArchive.size?"RECENT CAREER ACTIVITY ARCHIVED FROM THIS VIEW":"NO RECENT CAREER ACTIVITY";activitySection.appendChild(empty);} else for(const item of profileShown){const shell=document.createElement("div");shell.className="history-row-shell";shell.appendChild(statLine(item.date,item.title));const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>{const values=readUiArchive("person-career-activity",profileArchiveKey);values.add(item.id);writeUiArchive("person-career-activity",profileArchiveKey,values);showPersonProfile(personId);});shell.appendChild(archive);activitySection.appendChild(shell);}const profileActions=document.createElement("div");profileActions.className="history-actions";if(profileVisible.length>4){const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary compact-button";toggle.textContent=profileExpanded?"Recent Only":"Show More";toggle.addEventListener("click",()=>{personProfileActivityExpanded=!personProfileActivityExpanded;showPersonProfile(personId);});profileActions.appendChild(toggle);}if(profileArchive.size){const restore=document.createElement("button");restore.type="button";restore.className="secondary compact-button";restore.textContent=`Restore Archived (${profileArchive.size})`;restore.addEventListener("click",()=>{writeUiArchive("person-career-activity",profileArchiveKey,new Set());showPersonProfile(personId);});profileActions.appendChild(restore);}activitySection.appendChild(profileActions);
  activitySection.appendChild(statLine("Simulation Detail",gameplay?.simulationTierLabel ?? "Background Simulation"));
  if(gameplay?.simulationTierDescription){const simNote=document.createElement("p");simNote.className="simulation-detail-note";simNote.textContent=gameplay.simulationTierDescription;activitySection.appendChild(simNote);}
  els.personProfileBody.replaceChildren(status,assignmentSection,conditionSection,equipmentSection,skillsSection,recordSection,activitySection);
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
    const values = [member.rank, `${member.name}${member.isPlayer ? " · YOU" : ""}`, member.billet, `${member.health}%`, `${member.morale}%`, member.weaponName, statusProfile(member.status).label];
    const labels = ["Rank","Name","Role","Health","Morale","Weapon","Status"];
    values.forEach((value,index) => { const td=document.createElement("td"); td.dataset.label=labels[index]; td.textContent=value; tr.appendChild(td); });
    tr.addEventListener("click",()=>showPersonProfile(member.id)); tr.classList.add("roster-row"); return tr;
  }));
}
function renderPersonnelBrowser(state, indexes, personId) {
  const ownUnitId = playerAssignmentUnitId(state, indexes, personId);
  if (!personnelFilterUnitId || !state.entities.units[personnelFilterUnitId]) personnelFilterUnitId = ownUnitId;
  const current=selectOrganizationView(state,indexes,registries,personnelFilterUnitId), personnel=collectUnitPersonnel(state,indexes,personnelFilterUnitId);
  els.unitPersonnelMeta.textContent=`${current.name}${current.childUnitIds.length ? " + subordinate units" : ""} · ${personnel.length} personnel`;
  els.unitPersonnel.replaceChildren(...personnel.map(member=>{
    const card=document.createElement("button"); card.type="button"; card.className=`person-card roster-file ${member.isPlayer?"player-row":""}`.trim();
    const rank=document.createElement("span");rank.className="roster-rank";rank.textContent=member.rank;
    const identity=document.createElement("div");identity.className="roster-identity";const h=document.createElement("strong");h.textContent=`${member.name}${member.isPlayer?" · YOU":""}`;const role=document.createElement("span");role.textContent=member.billet;identity.append(h,role);
    const indicators=document.createElement("div");indicators.className="roster-indicators";indicators.append(statusStamp(member.status),metricBlock("RDY",`${member.readiness}%`),metricBlock("MOR",`${member.morale}%`));
    card.append(rank,identity,indicators); card.addEventListener("click",()=>showPersonProfile(member.id)); return card;
  }));
  els.personnelMyUnit.disabled = personnelFilterUnitId === ownUnitId;
}
function renderOrganization(state, indexes, personId) {
  const assignment = selectAssignmentView(state, indexes, registries, personId), ownUnitId = assignment.chain.at(-1).unitId;
  if (!selectedOrganizationUnitId || !state.entities.units[selectedOrganizationUnitId]) selectedOrganizationUnitId = ownUnitId;
  const current = selectOrganizationView(state, indexes, registries, selectedOrganizationUnitId), aggregate = aggregateStrength(state, indexes, selectedOrganizationUnitId);
  const browseChain = organizationChain(state, indexes, selectedOrganizationUnitId);
  els.assignmentCard.replaceChildren(statLine("Duty Position", assignment.billetName), statLine("Assigned Since", assignment.assignmentStartDate), statLine("Chain", assignment.chain.map(x => x.name).join(" › ")));
  els.unitBreadcrumbs.replaceChildren(...browseChain.map(item => { const b=document.createElement("button"); b.type="button"; b.textContent=item.name; if(item.unitId===selectedOrganizationUnitId) b.disabled=true; b.addEventListener("click",()=>{selectedOrganizationUnitId=item.unitId; render();}); return b; }));
  els.organizationBrowser.replaceChildren(); const command=document.createElement("div");command.className="unit-command-header";const commandTop=document.createElement("div");const label=document.createElement("span");label.className="command-label";label.textContent=documentProfile("unit_status").classification;const unitTitle=document.createElement("strong");unitTitle.textContent=current.name.toUpperCase();const echelon=document.createElement("span");echelon.textContent=`${current.echelon} · ${current.branch}`;commandTop.append(label,unitTitle,echelon);const metrics=document.createElement("div");metrics.className="unit-command-metrics";metrics.append(metricBlock("PERS",`${aggregate.assigned}/${aggregate.authorized}`),metricBlock("VAC",aggregate.vacancies),metricBlock("RDY",`${current.readiness}%`),metricBlock("MORALE",`${current.morale}%`));command.append(commandTop,metrics); els.organizationBrowser.append(command);
  if(current.childUnitIds.length){ const children=document.createElement("div"); children.className="unit-children"; for(const id of current.childUnitIds){ const child=state.entities.units[id], b=document.createElement("button"); b.type="button"; b.className="unit-child"; b.textContent=`${child.name} · ${registries.echelons.get(child.echelonId).name}${id===ownUnitId ? " · YOUR UNIT" : ""}`; b.addEventListener("click",()=>{selectedOrganizationUnitId=id; render();}); children.appendChild(b);} els.organizationBrowser.append(children); }
  els.returnMyUnit.disabled = selectedOrganizationUnitId === ownUnitId;
  els.viewSelectedPersonnel.textContent = `View ${current.name} in Personnel`;
  const readiness=calculateUnitReadiness(state,indexes,registries,selectedOrganizationUnitId); els.readinessBreakdown.replaceChildren();
  if(readiness){const grid=document.createElement("div");grid.className="readiness-component-grid";for(const [key,labelText] of [["personnelFill","Personnel"],["individualReadiness","Individual"],["training","Training"],["cohesion","Cohesion"],["equipment","Equipment"],["fatigue","Recovery"]]){const value=readiness.components[key];const block=document.createElement("div");block.className="readiness-component";block.append(metricBlock(labelText.toUpperCase(),`${value}%`));const bar=document.createElement("div");bar.className="mini-readiness-track";const fill=document.createElement("span");fill.style.setProperty("--value",`${value}%`);bar.appendChild(fill);block.appendChild(bar);grid.appendChild(block);}const overall=document.createElement("div");overall.className="readiness-overall";overall.append(metricBlock("CALCULATED READINESS",`${readiness.overall}%`, `${selectGameplay(state,indexes,registries,personId).readinessTrend.direction.toUpperCase()} ${selectGameplay(state,indexes,registries,personId).readinessTrend.delta>0?"+":""}${selectGameplay(state,indexes,registries,personId).readinessTrend.delta}`));els.readinessBreakdown.append(overall,grid);}
  const capability=selectUnitCapabilityInventory(state,indexes,registries,selectedOrganizationUnitId); if(els.unitCapability){els.unitCapability.replaceChildren();if(capability){const summary=document.createElement("div");summary.className="capability-summary";summary.append(metricBlock("DOCTRINE",capability.doctrine?.name??"Unspecified"),metricBlock("PERSONNEL",String(capability.personCount)),metricBlock("EQUIPMENT",`${capability.totals.operational}/${capability.totals.assigned} operational`));els.unitCapability.appendChild(summary);if(capability.capabilities.length){const grid=document.createElement("div");grid.className="capability-grid";for(const item of capability.capabilities){const card=document.createElement("article");card.className="capability-card";const h=document.createElement("strong");h.textContent=item.name;const meta=document.createElement("span");meta.textContent=`${item.domain.toUpperCase()} · ${item.operational}/${item.assigned} operational · effectiveness ${item.averageEffectiveness}/100`;card.append(h,meta);grid.appendChild(card);}els.unitCapability.appendChild(grid);}else{const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="NO DERIVED COMBAT CAPABILITIES FOR THIS UNIT";els.unitCapability.appendChild(empty);}const note=document.createElement("p");note.className="muted capability-note";note.textContent="Battle outcomes are not implemented. This inventory is traceable to actual personnel/equipment and is the foundation for future land, air, sea, explosives, vehicle, sustainment, and mission-capability aggregation.";els.unitCapability.appendChild(note);}}
  const gameplay=selectGameplay(state,indexes,registries,personId); els.commandAuthority.replaceChildren(); const authTitle=document.createElement("strong");authTitle.textContent="Command Authority"; const authText=document.createElement("p");authText.className="muted"; authText.textContent=gameplay.authorityIds.length ? gameplay.authorityIds.map(id=>registries.authorities.get(id).name).join(" · ") : "No unit-command authorities are granted by your current billet."; els.commandAuthority.append(authTitle,authText);

  if (els.unitHistory) {
    els.unitHistory.replaceChildren();
    const historyIds=[];
    for(const scopedUnitId of descendantUnitIds(state,indexes,selectedOrganizationUnitId)) historyIds.push(...(indexes.unitEventRecordsByUnitId?.get(scopedUnitId) ?? []));
    const allHistory=historyIds.map(id=>state.entities.unitEventRecords[id]).filter(Boolean).sort((a,b)=>(b.elapsedDay??0)-(a.elapsedDay??0)||b.id.localeCompare(a.id));
    const archiveKey=`${personId}:${selectedOrganizationUnitId}`, archived=readUiArchive("unit-history",archiveKey), visible=allHistory.filter(item=>!archived.has(item.id)), archivedCount=allHistory.length-visible.length, expanded=els.unitHistory.dataset.expanded==="true";
    const shown=expanded?visible:visible.slice(0,UNIT_HISTORY_PREVIEW_LIMIT);
    if(!shown.length){const p=document.createElement("p");p.className="empty-state military-empty";p.textContent=archivedCount?"ALL RECENT UNIT ACTIVITY IS ARCHIVED FROM THIS VIEW":"NO SIGNIFICANT UNIT ACTIVITY RECORDED YET";els.unitHistory.appendChild(p);}
    else for(const item of shown){const shell=document.createElement("div");shell.className="history-row-shell";const row=document.createElement("div");row.className="unit-history-row";const time=document.createElement("time");time.textContent=item.gameDate;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.title;const span=document.createElement("span");span.textContent=item.summary;body.append(strong,span);row.append(time,body);const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecord("unit-history",archiveKey,item.id));shell.append(row,archive);els.unitHistory.appendChild(shell);}
    const controls=createHistoryControls({kind:"unit-history",personId:archiveKey,hiddenCount:Math.max(0,visible.length-UNIT_HISTORY_PREVIEW_LIMIT),archivedCount,expanded,onToggle:()=>{els.unitHistory.dataset.expanded=expanded?"false":"true";render();}}); if(controls.childElementCount)els.unitHistory.appendChild(controls);
  }
  if(gameplay.commandDuties.length){const commandGrid=document.createElement("div");commandGrid.className="command-duty-grid";for(const duty of gameplay.commandDuties){const button=document.createElement("button");button.type="button";button.className="secondary compact-button";button.textContent=`Schedule ${duty.shortName}`;button.addEventListener("click",()=>runCommand(()=>scheduleUnitDuty(store,registries,personId,duty.id)));commandGrid.appendChild(button);}els.commandAuthority.appendChild(commandGrid);}
  renderUnitRoster(state, indexes, selectedOrganizationUnitId);
  renderPersonnelBrowser(state, indexes, personId);
  const orderIds=indexes.ordersByPersonId?.get(personId)??[]; els.ordersList.replaceChildren();
  if(!orderIds.length){const p=document.createElement("p");p.className="empty-state military-empty";p.textContent="NO ACTIVE OR HISTORICAL ORDERS RECORDED";els.ordersList.append(p);}
  else for(const id of orderIds.slice().reverse()){
    const o=state.entities.orderRecords[id], card=document.createElement("article");card.className="order-card military-order";
    const mast=document.createElement("div");mast.className="order-masthead";const title=document.createElement("span");title.textContent=documentProfile("order").classification+" · "+documentProfile("order").label;const ref=document.createElement("span");ref.textContent=recordReference("order",o.id);mast.append(title,ref);
    const h=document.createElement("h3");h.textContent=o.title;const p1=document.createElement("p");p1.className="order-summary";p1.textContent=o.summary;const status=document.createElement("div");status.className="order-status-row";status.append(statusStamp(o.status),metricBlock("ISSUED",o.issueDate),metricBlock("EFFECTIVE",o.effectiveDate));card.append(mast,h,p1,status); if(o.unitId&&state.entities.units[o.unitId]){const actions=document.createElement("div");actions.className="order-actions";const open=document.createElement("button");open.type="button";open.className="secondary compact-button";open.textContent="Open Assigned Unit";open.addEventListener("click",()=>{selectedOrganizationUnitId=o.unitId;setActiveView("unit");render();});actions.appendChild(open);card.appendChild(actions);} els.ordersList.append(card);
  }
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

  els.careerObjectives.replaceChildren();
  const activeObjectives=view.activeObjectives ?? view.objectives.filter(item=>item.status === "active");
  if (view.onboardingComplete) {
    const phase=document.createElement("div"); phase.className="career-phase-banner";
    const kicker=document.createElement("span"); kicker.textContent="CAREER PHASE";
    const strong=document.createElement("strong"); strong.textContent=view.trainingPhase?.name ?? "Garrison / Development";
    phase.append(kicker,strong); els.careerObjectives.appendChild(phase);
  }
  if (!activeObjectives.length) {
    const p=document.createElement("p"); p.className="empty-state military-empty objective-fallback";
    p.textContent=view.onboardingComplete ? "NO IMMEDIATE CAREER ACTIONS REQUIRED — CONTINUE NORMAL DUTY OR ADVANCE TIME" : "NO ACTIVE CAREER OBJECTIVES";
    els.careerObjectives.appendChild(p);
  } else for (const objective of activeObjectives) {
    const row=document.createElement("article"); row.className=`objective-row ${objective.status}`;
    const top=document.createElement("div"); top.className="objective-head"; const name=document.createElement("strong"); name.textContent=objective.name; top.append(name,statusStamp(objective.status));
    const desc=document.createElement("p"); desc.textContent=objective.description; row.append(top,desc); els.careerObjectives.appendChild(row);
  }
  els.next30Days?.replaceChildren();
  if(els.next30Days){
    const now=state.world.clock.elapsedDays;
    const items=[];
    for(const item of view.upcomingSchedule.filter(x=>x.startElapsedDay>=now&&x.startElapsedDay<=now+30))items.push({day:item.startElapsedDay,label:item.name,date:item.startDate,kind:"UNIT DUTY"});
    for(const item of view.opportunities.filter(x=>["accepted","in_progress"].includes(x.status)&&Number.isInteger(x.reportElapsedDay)&&x.reportElapsedDay<=now+30))items.push({day:item.reportElapsedDay,label:item.name,date:item.reportDate??state.world.date,kind:item.status==="in_progress"?"SCHOOL IN PROGRESS":"SCHOOL REPORT"});
    const qids=indexes.qualificationsByPersonId?.get(personId)??[];for(const id of qids){const q=state.entities.qualificationRecords[id];if(Number.isInteger(q?.expiresElapsedDay)&&q.expiresElapsedDay>=now&&q.expiresElapsedDay<=now+30){const def=registries.qualifications.get(q.qualificationId);items.push({day:q.expiresElapsedDay,label:`${def.name} expires`,date:q.expiresDate??"—",kind:"QUALIFICATION"});}}
    items.sort((a,b)=>a.day-b.day||a.label.localeCompare(b.label));
    if(!items.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="NO SIGNIFICANT MILESTONES IN THE NEXT 30 DAYS";els.next30Days.appendChild(empty);}else for(const item of items.slice(0,8)){const row=document.createElement("div");row.className="lookahead-row";const time=document.createElement("time");time.textContent=item.date;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.label;const small=document.createElement("span");small.textContent=`${item.kind} · IN ${Math.max(0,item.day-now)} DAY${item.day-now===1?"":"S"}`;body.append(strong,small);row.append(time,body);els.next30Days.appendChild(row);}
  }
  els.unitSituationFeed?.replaceChildren();
  if(els.unitSituationFeed){const feed=(view.unitHistory??[]).slice(0,6);if(!feed.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="ROUTINE OPERATIONS — NO RECENT SIGNIFICANT UNIT EVENTS";els.unitSituationFeed.appendChild(empty);}else for(const item of feed){const row=document.createElement("div");row.className="situation-feed-row";const time=document.createElement("time");time.textContent=item.gameDate;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.title;const span=document.createElement("span");span.textContent=item.summary;body.append(strong,span);row.append(time,body);els.unitSituationFeed.appendChild(row);}}

  if ((view.objectiveHistory?.length ?? 0) > 0) {
    const archive=document.createElement("details"); archive.className="objective-archive";
    const summary=document.createElement("summary"); summary.textContent=`Completed Objective History (${view.objectiveHistory.length})`; archive.appendChild(summary);
    const body=document.createElement("div"); body.className="objective-history-list";
    for(const objective of view.objectiveHistory){
      const row=document.createElement("div"); row.className="objective-history-row";
      const label=document.createElement("strong");label.textContent=objective.name;
      const date=document.createElement("time");date.dateTime=objective.completedDate ?? objective.startedDate ?? "";date.textContent=objective.completedDate ?? objective.startedDate ?? "—";
      row.append(label,date);body.appendChild(row);
    }
    archive.appendChild(body); els.careerObjectives.appendChild(archive);
  }

  els.currentDuty.replaceChildren();
  if (view.currentDuty) {
    const duty=document.createElement("div"); duty.className="current-duty-card"; duty.append(statusStamp(view.currentDuty.status),metricBlock("CURRENT DUTY",view.currentDuty.name),metricBlock("THROUGH",view.currentDuty.endDate)); els.currentDuty.appendChild(duty);
  } else { const p=document.createElement("p"); p.className="empty-state compact-empty"; p.textContent="NO DUTY CURRENTLY IN PROGRESS"; els.currentDuty.appendChild(p); }

  if(els.trainingPhaseSummary) els.trainingPhaseSummary.textContent=view.trainingPhase ? `${view.trainingPhase.name} · ${view.trainingPhase.description}` : "Training phase unavailable.";
  els.dutySchedule.replaceChildren();
  if (view.routineSchedule?.length) {
    const routine=document.createElement("div"); routine.className="routine-duty-summary";
    const heading=document.createElement("strong"); heading.textContent="Routine Background Duties";
    const details=document.createElement("p");
    const next=view.routineSchedule[0];
    details.textContent=`${next.name} next ${next.startDate}${next.blocksFocusedActivities ? " · may restrict conflicting activities" : " · non-blocking routine duty"}`;
    routine.append(heading,details); els.dutySchedule.appendChild(routine);
  }
  if (!view.upcomingSchedule.length) { const p=document.createElement("p"); p.className="empty-state military-empty"; p.textContent="NO SIGNIFICANT UNIT DUTIES SCHEDULED"; els.dutySchedule.appendChild(p); }
  else for (const item of view.upcomingSchedule) {
    const row=document.createElement("article"); row.className=`schedule-row ${item.status}`;
    const date=document.createElement("time"); date.textContent=item.startDate === item.endDate ? item.startDate : `${item.startDate} → ${item.endDate}`;
    const body=document.createElement("div"); const h=document.createElement("strong"); h.textContent=item.name; const meta=document.createElement("span"); meta.textContent=`${item.category.toUpperCase()} · ${item.mandatory ? "MANDATORY" : "OPTIONAL"} · ${(item.planningStatus ?? "firm").toUpperCase()}`; body.append(h,meta);
    row.append(date,body,statusStamp(item.status)); els.dutySchedule.appendChild(row);
  }
  if(view.recentDuties.length){
    const archived=readUiArchive("unit-training",personId); const visible=view.recentDuties.filter(item=>!archived.has(item.id)); const archivedCount=view.recentDuties.length-visible.length; const expanded=els.dutySchedule.dataset.historyExpanded==="true";
    const significant=visible.filter(item=>item.dutyDefinitionId!=="duty_pt"); const pt=visible.filter(item=>item.dutyDefinitionId==="duty_pt"); const rows=[...significant];
    if(pt.length){ const newest=pt[0], oldest=pt.at(-1); rows.push({...newest,id:`pt-summary:${pt.map(x=>x.id).join(",")}`,isPtSummary:true,summaryIds:pt.map(x=>x.id),name:`Unit Physical Training · ${pt.length} session${pt.length===1?"":"s"}`,completedDate:pt.length===1?newest.completedDate:`${oldest.completedDate} → ${newest.completedDate}`}); }
    const heading=document.createElement("h3");heading.className="schedule-history-heading";heading.textContent="Recent Unit Training";els.dutySchedule.appendChild(heading);
    const history=document.createElement("div");history.className="duty-history"; const shown=expanded?rows:rows.slice(0,UNIT_TRAINING_PREVIEW_LIMIT);
    for(const item of shown){const row=document.createElement("div");row.className="history-row-shell";const button=document.createElement("button");button.type="button";button.className="duty-history-row";const text=document.createElement("span");text.textContent=`${item.completedDate} · ${item.name}`;const result=document.createElement("strong");result.textContent=item.isPtSummary?"ROUTINE":item.performanceRating?`${registries.performanceRatings.get(item.performanceRating)?.label ?? item.performanceRating} · ${item.performanceScore ?? "—"}/100`:"COMPLETED";button.append(text,result);if(!item.isPtSummary)button.addEventListener("click",()=>showDutyResult(item.id));else button.disabled=true;const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecords("unit-training",personId,item.isPtSummary?item.summaryIds:[item.id]));row.append(button,archive);history.appendChild(row);}els.dutySchedule.appendChild(history);
    const controls=createHistoryControls({kind:"unit-training",personId,hiddenCount:Math.max(0,rows.length-UNIT_TRAINING_PREVIEW_LIMIT),archivedCount,expanded,onToggle:()=>{els.dutySchedule.dataset.historyExpanded=expanded?"false":"true";render();}}); if(controls.childElementCount)els.dutySchedule.appendChild(controls);
  }

  els.careerOpportunities.replaceChildren();
  const visibleOpportunities=view.opportunities.filter(item=>["open","accepted","in_progress"].includes(item.status));
  if (!visibleOpportunities.length) { const p=document.createElement("p"); p.className="empty-state military-empty"; p.textContent="NO ACTIVE CAREER OPPORTUNITIES"; els.careerOpportunities.appendChild(p); }
  else for (const item of visibleOpportunities) {
    const card=document.createElement("article"); card.className="opportunity-card"; card.id=item.id; card.dataset.recordId=item.id; card.dataset.opportunityStatus=item.status;
    const rail=document.createElement("div"); rail.className="document-rail"; const label=document.createElement("span"); label.textContent="PERSONNEL OPPORTUNITY"; const ref=document.createElement("span"); ref.textContent=compactReference("OPP",item.id); rail.append(label,ref);
    const h=document.createElement("h3"); h.textContent=item.title; const p=document.createElement("p"); p.textContent=item.message;
    const metrics=document.createElement("div"); metrics.className="opportunity-metrics"; metrics.append(statusStamp(item.status)); if(item.sourceLabel) metrics.append(metricBlock("SOURCE",item.sourceLabel)); if(item.schoolName) metrics.append(metricBlock("SCHOOL",item.schoolName)); if(item.durationDays) metrics.append(metricBlock("DURATION",`${item.durationDays} days`)); if(item.status==="open") metrics.append(metricBlock("RESPOND",`${item.daysRemaining} days`)); if(item.reportDate) metrics.append(metricBlock("REPORT",item.reportDate));
    card.append(rail,h,p,metrics);
    if (item.status === "open") { const actions=document.createElement("div"); actions.className="actions opportunity-actions"; const accept=document.createElement("button"); accept.type="button"; accept.textContent="Accept Opportunity"; accept.addEventListener("click",()=>runCommand(()=>acceptCareerOpportunity(store,registries,item.id))); const decline=document.createElement("button"); decline.type="button"; decline.className="secondary"; decline.textContent="Decline"; decline.addEventListener("click",()=>runCommand(()=>declineCareerOpportunity(store,registries,item.id))); actions.append(accept,decline); card.appendChild(actions); }
    els.careerOpportunities.appendChild(card);
  }

  els.skillSummary.replaceChildren();
  if(view.performanceIndex!=null){const perf=document.createElement("div");perf.className="performance-index";perf.append(metricBlock("RECENT PERFORMANCE",`${view.performanceIndex}/100`));els.skillSummary.appendChild(perf);}
  for (const skill of view.skills) { const row=document.createElement("div"); row.className="skill-row"; row.appendChild(progressRow(skill.name, skill.value, 100)); els.skillSummary.appendChild(row); }

  els.pendingDecisions.replaceChildren();
  for (const decision of view.pendingDecisions) {
    const card=document.createElement("article"); card.className="decision-card"; const h=document.createElement("h3"); h.textContent=decision.title; const p=document.createElement("p"); p.textContent=decision.message; card.append(h,p);
    if(decision.daysRemaining!=null){const deadline=document.createElement("p");deadline.className="decision-deadline";deadline.textContent=`Decision window: ${decision.daysRemaining} day${decision.daysRemaining===1?"":"s"}`;card.appendChild(deadline);}
    const actions=document.createElement("div"); actions.className="decision-choices"; for (const choice of decision.choices) { const b=document.createElement("button"); b.type="button"; b.textContent=choice.label; b.addEventListener("click",()=>runCommand(()=>resolveDecision(store,registries,personId,decision.id,choice.id))); actions.appendChild(b); } card.appendChild(actions); els.pendingDecisions.appendChild(card);
  }

  els.activityOptions.replaceChildren();
  for (const activity of view.activities) {
    const card=document.createElement("article"); card.className=`activity-option state-${activity.availabilityState}`;
    const meta=document.createElement("div"); meta.className="activity-meta"; meta.textContent=`${activity.durationDays} DAY${activity.durationDays===1?"":"S"} · ${activity.efficiency}% EFF`;
    const h=document.createElement("h3"); h.textContent=activity.name; const p=document.createElement("p"); p.textContent=activity.description; card.append(meta,h,p);
    if(activity.reasons.length){const reasons=document.createElement("p");reasons.className="activity-reasons";reasons.textContent=activity.reasons.join(" · ");card.appendChild(reasons);}
    const button=document.createElement("button"); button.type="button"; button.textContent=activity.eligible ? `Conduct ${activity.shortName}` : activity.availabilityState === "scheduled" ? "Schedule Conflict" : activity.availabilityState === "recovering" ? "Recovery Required" : "Unavailable"; button.disabled=!activity.eligible; button.addEventListener("click",()=>runCommand(()=>performActivity(store,registries,personId,activity.id))); card.appendChild(button); els.activityOptions.appendChild(card);
  }

  els.activityHistory.replaceChildren();
  const activityArchive=readUiArchive("activity-history",personId); const visibleActivities=view.recentActivities.filter(record=>!activityArchive.has(record.id)); const archivedActivityCount=view.recentActivities.length-visibleActivities.length; const activityExpanded=els.activityHistory.dataset.expanded==="true";
  if (!visibleActivities.length) { const p=document.createElement("p"); p.className="muted"; p.textContent=archivedActivityCount?"All recent activity records are archived from this view.":"No focused training activities completed yet."; els.activityHistory.appendChild(p); }
  else for (const record of (activityExpanded?visibleActivities:visibleActivities.slice(0,CAREER_HISTORY_PREVIEW_LIMIT))) { const def=registries.activities.get(record.activityDefinitionId), shell=document.createElement("div");shell.className="history-row-shell"; const item=document.createElement("button"); item.type="button"; item.className="activity-item training-record activity-log-button"; const time=document.createElement("time"); time.textContent=record.endDate; const text=document.createElement("span"); const outcome=record.qualificationResult?`${record.qualificationResult.label.toUpperCase()} ${record.qualificationResult.score}/${record.qualificationResult.maxScore}`:`${(record.performanceRating ?? "completed").toUpperCase()}${record.performanceScore!=null?` ${record.performanceScore}/100`:""}`; text.textContent=`${def.name} · ${outcome} · ${record.durationDays} day${record.durationDays===1?"":"s"}${record.eventRecordId?" · event":""}`; item.append(time,text); item.addEventListener("click",()=>showActivityResult(record.id)); const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecord("activity-history",personId,record.id));shell.append(item,archive);els.activityHistory.appendChild(shell); }
  const activityControls=createHistoryControls({kind:"activity-history",personId,hiddenCount:Math.max(0,visibleActivities.length-CAREER_HISTORY_PREVIEW_LIMIT),archivedCount:archivedActivityCount,expanded:activityExpanded,onToggle:()=>{els.activityHistory.dataset.expanded=activityExpanded?"false":"true";render();}}); if(activityControls.childElementCount)els.activityHistory.appendChild(activityControls);
}

function resultLabel(key) { const labels={experience:"Experience",prestige:"Prestige",health:"Health",morale:"Morale",readiness:"Readiness",fatigue:"Fatigue",unitReadiness:"Unit Readiness",unitCohesion:"Unit Cohesion"}; return labels[key] ?? key; }
function formatResultValue(key,value){ return ["health","morale","readiness","unitReadiness","unitCohesion"].includes(key) ? `${value}%` : String(value); }
function appendChangeRow(container,{label,before,after,delta,key=""}){ const row=document.createElement("div"); row.className=`aar-change ${delta>0?"positive":delta<0?"negative":"neutral"}`; const name=document.createElement("strong"); name.textContent=label; const values=document.createElement("span"); values.className="aar-change-values"; values.textContent=`${formatResultValue(key,before)} → ${formatResultValue(key,after)}`; const change=document.createElement("b"); change.textContent=`${delta>0?"+":""}${delta}`; row.append(name,values,change); container.appendChild(row); }
function showActivityResult(activityRecordId) {
  const state=store.getState(), record=state.entities.activityRecords[activityRecordId]; if(!record)return; const def=registries.activities.get(record.activityDefinitionId); const perf=performanceProfile(record.performanceRating??"satisfactory");
  els.resultDialog.dataset.tone=perf.tone; els.resultReference.textContent=recordReference("aar",record.id); els.resultKicker.textContent="AFTER ACTION REPORT"; els.resultTitle.textContent=def.name; els.resultBody.replaceChildren();
  const header=document.createElement("div"); header.className="aar-header"; const date=document.createElement("span"); date.className="aar-date"; date.textContent=`${record.startDate} → ${record.endDate}`;
  if(record.qualificationResult){
    const q=record.qualificationResult;
    const grade=document.createElement("span"); grade.className=`performance-badge tone-${q.qualified?"good":"warning"}`; grade.textContent=`${q.label} · ${q.score}/${q.maxScore}`; header.append(grade,date); els.resultBody.appendChild(header);
    const box=document.createElement("div");box.className="aar-performance";box.append(statusStamp(q.qualified?"filled":"blocked"),metricBlock("QUALIFICATION RESULT",q.qualified?"QUALIFIED":"UNQUALIFIED"),metricBlock("TRAINING PERFORMANCE",record.performanceScore!=null?`${perf.label} · ${record.performanceScore}/100`:perf.label));els.resultBody.appendChild(box);
    const desc=document.createElement("p"); desc.className="performance-description"; desc.textContent=q.qualified?"Weapon qualification standard met. The 0–100 training score is supporting performance context.":"Weapon qualification standard was not met. The 0–100 training score does not override the qualification result."; els.resultBody.appendChild(desc);
  } else {
    const grade=document.createElement("span"); grade.className=`performance-badge tone-${perf.tone}`; grade.textContent=record.performanceScore!=null?`${perf.label} · ${record.performanceScore}/100`:perf.label; header.append(grade,date); const desc=document.createElement("p"); desc.className="performance-description"; desc.textContent=perf.description; els.resultBody.append(header,desc);
  }
  const participation=document.createElement("div"); participation.className="aar-participation"; const scope=record.participantScope ?? "individual"; const participantCount=(record.participantPersonIds ?? [record.personId]).length; participation.append(metricBlock("ACTIVITY SOURCE",record.sourceType==="player_activity"?"PLAYER INITIATED":String(record.sourceType??"ACTIVITY").replaceAll("_"," ").toUpperCase()),metricBlock("PARTICIPATION",scope==="individual"&&participantCount===1?"PLAYER ONLY":`${scope.toUpperCase()} · ${participantCount} PERSONNEL`)); els.resultBody.appendChild(participation);
  const changes=document.createElement("div"); changes.className="aar-change-grid";
  for(const [key,delta] of Object.entries(record.deltas??{})){ if(key==="skills" || !delta) continue; const before=record.before?.[key],after=record.after?.[key]; if(before!=null && after!=null) appendChangeRow(changes,{label:resultLabel(key),before,after,delta,key}); }
  for(const [id,delta] of Object.entries(record.deltas?.skills??{})){ if(!delta) continue; const before=record.before?.skills?.[id],after=record.after?.skills?.[id]; if(before!=null && after!=null) appendChangeRow(changes,{label:registries.skills.get(id)?.name??id,before,after,delta,key:"skill"}); }
  if(changes.childElementCount){const heading=document.createElement("h3");heading.className="aar-subheading";heading.textContent="Recorded Changes";els.resultBody.append(heading,changes);} else {const empty=document.createElement("p");empty.className="empty-state";empty.textContent="No measurable changes recorded.";els.resultBody.appendChild(empty);}
  if(record.repetitionMultiplier != null && record.repetitionMultiplier < 1){const rep=document.createElement("p");rep.className="aar-advisory";rep.textContent=`Repeated training reduced learning efficiency to ${Math.round(record.repetitionMultiplier*100)}%. Rotate activities for better gains.`;els.resultBody.appendChild(rep);}
  if(record.eventRecordId){const ev=state.entities.gameplayEventRecords[record.eventRecordId], defEv=ev?registries.gameplayEvents.get(ev.definitionId):null; if(defEv){const feedback=feedbackProfile(defEv);const box=document.createElement("section");box.className=`aar-event tone-${feedback.tone}`;const kicker=document.createElement("span");kicker.className="event-kicker";kicker.textContent=feedback.label;const title=document.createElement("strong");title.textContent=defEv.title;const message=document.createElement("p");message.textContent=defEv.message;box.append(kicker,title,message);els.resultBody.appendChild(box);}}
  els.resultDialog.showModal();
}
function showDutyResult(scheduleRecordId) {
  const state=store.getState(), record=state.entities.scheduleRecords[scheduleRecordId]; if(!record)return; const duty=registries.duties.get(record.dutyDefinitionId); const perf=performanceProfile(record.performanceRating??"satisfactory");
  els.resultDialog.dataset.tone=perf.tone; els.resultReference.textContent=compactReference("DUTY",record.id); els.resultKicker.textContent="UNIT TRAINING AAR"; els.resultTitle.textContent=duty.name; els.resultBody.replaceChildren();
  const header=document.createElement("div");header.className="aar-performance";
  if(record.qualificationResult && typeof record.qualificationResult === "object") { const q=record.qualificationResult; header.append(statusStamp(q.qualified?"filled":"blocked"),metricBlock("QUALIFICATION",`${q.label} · ${q.score}/${q.maxScore}`),metricBlock("TRAINING PERFORMANCE",record.performanceScore!=null?`${registries.performanceRatings.get(record.performanceRating)?.label ?? record.performanceRating} · ${record.performanceScore}/100`:"—")); }
  else header.append(statusStamp(record.performanceRating??"completed"),metricBlock("SCORE",record.performanceScore!=null?`${record.performanceScore}/100`:"—"),metricBlock("PERIOD",record.startDate===record.endDate?record.startDate:`${record.startDate} → ${record.endDate}`));
  els.resultBody.appendChild(header);
  const participantCount=(record.participantPersonIds??[]).length; const participation=document.createElement("div");participation.className="aar-participation";participation.append(metricBlock("ACTIVITY SOURCE","UNIT SCHEDULE"),metricBlock("PARTICIPANTS",participantCount?`${participantCount} PERSONNEL`:"UNIT EVENT"));els.resultBody.appendChild(participation);
  const changes=document.createElement("div");changes.className="aar-change-grid";for(const key of ["readiness","morale","fatigue","unitReadiness","unitCohesion"]){const before=record.before?.[key],after=record.after?.[key];if(before!=null&&after!=null&&before!==after)appendChangeRow(changes,{label:resultLabel(key),before,after,delta:after-before,key});}
  for(const [key,after] of Object.entries(record.after?.training??{})){const before=record.before?.training?.[key];if(before!=null&&after!==before)appendChangeRow(changes,{label:`Unit ${key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase())}`,before,after,delta:after-before,key:"skill"});}
  if(changes.childElementCount){const heading=document.createElement("h3");heading.className="aar-subheading";heading.textContent="Recorded Changes";els.resultBody.append(heading,changes);}
  if(record.outcomeEventRecordId){const ev=state.entities.gameplayEventRecords[record.outcomeEventRecordId],defEv=ev?registries.gameplayEvents.get(ev.definitionId):null;if(defEv){const feedback=feedbackProfile(defEv);const box=document.createElement("section");box.className=`aar-event tone-${feedback.tone}`;const kicker=document.createElement("span");kicker.className="event-kicker";kicker.textContent=feedback.label;const title=document.createElement("strong");title.textContent=defEv.title;const message=document.createElement("p");message.textContent=defEv.message;box.append(kicker,title,message);els.resultBody.appendChild(box);}}
  els.resultDialog.showModal();
}

function showCommandResult(result) {
  if(!result)return; if(result.code==="activity_completed") return showActivityResult(result.data.activityRecordId);
  if(result.code==="decision_resolved"){ els.resultDialog.dataset.tone="routine"; els.resultReference.textContent=compactReference("DEC",result.data.eventRecordId); els.resultKicker.textContent="DECISION OUTCOME"; els.resultTitle.textContent=result.data.title ?? "Decision Resolved"; els.resultBody.replaceChildren(); const choice=document.createElement("div");choice.className="aar-performance";choice.append(statusStamp("completed"),metricBlock("ACTION",result.data.choiceLabel ?? result.message),metricBlock("TEAMMATE",result.data.targetPersonName ?? "—"));els.resultBody.appendChild(choice); const changes=document.createElement("div");changes.className="aar-change-grid";for(const item of result.data.changes??[])appendChangeRow(changes,{label:item.label,before:item.before,after:item.after,delta:item.delta,key:item.label==="Morale"?"morale":""});if(changes.childElementCount){const heading=document.createElement("h3");heading.className="aar-subheading";heading.textContent="Recorded Changes";els.resultBody.append(heading,changes);}else{const empty=document.createElement("p");empty.className="empty-state";empty.textContent="Decision recorded. No measurable stat change was generated.";els.resultBody.appendChild(empty);}els.resultDialog.showModal(); return; }
  if(result.code==="time_advanced" || result.code==="time_interrupted"){ els.resultDialog.dataset.tone="routine"; els.resultReference.textContent=compactReference("SITREP",`${result.data.startDate}-${result.data.endDate}`); els.resultKicker.textContent="TIME ADVANCE SUMMARY"; els.resultTitle.textContent=result.code==="time_interrupted"?`${result.data.days} Day${result.data.days===1?"":"s"} Advanced · HOLD`:`${result.data.days} Day${result.data.days===1?"":"s"} Advanced`; els.resultBody.replaceChildren(); const p=document.createElement("p");p.className="result-grade";p.textContent=`${result.data.startDate} → ${result.data.endDate}`;els.resultBody.appendChild(p); const list=document.createElement("div");list.className="time-summary-list"; for(const item of result.data.summaryItems??[]){const row=document.createElement("div");row.className=`time-summary-item tone-${item.tone??"routine"}`;row.textContent=item.label;list.appendChild(row);} if(!list.childElementCount){const empty=document.createElement("p");empty.className="empty-state";empty.textContent="No major career or unit events occurred.";list.appendChild(empty);} els.resultBody.appendChild(list); els.resultDialog.showModal(); }
}

function renderSchoolCatalog(state,indexes,personId){
  if(!els.schoolCatalog)return; const catalog=selectSchoolCatalog(state,indexes,registries,personId); els.schoolCatalog.replaceChildren();
  for(const item of catalog){
    const card=document.createElement("article");card.className=`school-catalog-card ${item.eligible?"eligible":"locked"}`;
    const head=document.createElement("div");head.className="school-catalog-head";const title=document.createElement("strong");title.textContent=item.name;const status=document.createElement("span");status.className="school-catalog-status";status.textContent=item.completed?"COMPLETED":item.activeStatus?item.activeStatus.toUpperCase():item.eligible?"AVAILABLE":"LOCKED";head.append(title,status);card.appendChild(head);
    const meta=document.createElement("p");meta.className="muted compact-intro";meta.textContent=`${item.durationDays} days · ${String(item.schoolType).replaceAll("_"," ")}`;card.appendChild(meta);
    if(item.activeSource){const source=document.createElement("p");source.className="school-source";source.textContent=`Opportunity source: ${item.activeSource}`;card.appendChild(source);}
    if(item.completedDate){const done=document.createElement("p");done.className="school-source";done.textContent=`Completed ${item.completedDate}`;card.appendChild(done);}
    if(!item.eligible&&!item.completed){const reasons=document.createElement("ul");reasons.className="school-requirements";for(const reason of item.reasons){const li=document.createElement("li");li.textContent=reason;reasons.appendChild(li);}card.appendChild(reasons);}
    if(item.requestable){const button=document.createElement("button");button.type="button";button.className="compact-button";button.textContent="Request Volunteer Slot";button.addEventListener("click",()=>runCommand(()=>requestSchoolOpportunity(store,registries,item.id)));card.appendChild(button);}
    els.schoolCatalog.appendChild(card);
  }
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

function awardDeviceLabel(item) {
  if (item.count <= 1) return "";
  const device=item.definition.repeatDevice;
  if (!device) return `×${item.count}`;
  if (device.type === "oak_leaf_cluster") return `${item.count - 1} OLC`;
  if (device.type === "service_star") return `${item.count - 1} service star${item.count - 1 === 1 ? "" : "s"}`;
  if (device.type === "numeral") return `Numeral ${item.count}`;
  if (device.type === "knot") return `${item.count} awards`;
  return `×${item.count}`;
}

function renderSoldierIdentity(state,indexes,personId,career) {
  const identity=selectSoldierIdentity(state,indexes,registries,personId);
  els.soldierIdentity.replaceChildren();
  const tabs=document.createElement("div"); tabs.className="soldier-identity-grid";

  const uniform=document.createElement("section"); uniform.className="identity-subpanel uniform-card";
  const uniformHead=document.createElement("div"); uniformHead.className="identity-subhead"; const uh=document.createElement("h3");uh.textContent="Service Uniform";const us=document.createElement("span");us.textContent=`${identity.rank} · ${identity.specialty}`;uniformHead.append(uh,us);
  const blouse=document.createElement("div");blouse.className="uniform-blouse";
  const nameTape=document.createElement("div");nameTape.className="uniform-name-tape";nameTape.textContent=identity.name.split(" ").at(-1)?.toUpperCase()??identity.name.toUpperCase();
  const armyTape=document.createElement("div");armyTape.className="uniform-army-tape";armyTape.textContent="U.S. ARMY";
  const rankMark=document.createElement("div");rankMark.className="uniform-rank-mark";rankMark.textContent=identity.rank;
  const rack=document.createElement("div");rack.className="uniform-ribbon-rack";rack.setAttribute("aria-label","Earned ribbon rack");
  for(const item of identity.ribbons){const slot=document.createElement("span");slot.className="uniform-ribbon-slot";slot.append(createInsignia(item.definition));const device=awardDeviceLabel(item);if(device){const d=document.createElement("small");d.className="insignia-device";d.textContent=device;slot.appendChild(d);}rack.appendChild(slot);}
  if(!identity.ribbons.length){const empty=document.createElement("span");empty.className="uniform-empty-slot";empty.textContent="NO RIBBONS";rack.appendChild(empty);}
  const badgeRack=document.createElement("div");badgeRack.className="uniform-badge-rack";
  for(const item of identity.badges){const slot=document.createElement("span");slot.className="uniform-badge-slot";slot.append(createInsignia(item.definition));badgeRack.appendChild(slot);}
  if(identity.rifleQualification){const slot=document.createElement("span");slot.className="uniform-badge-slot qualification-insignia";slot.append(createInsignia(null,{qualificationResult:identity.rifleQualification.result,badgeClasp:identity.rifleQualification.badgeClasp??"RIFLE"}));badgeRack.appendChild(slot);}
  const tabRack=document.createElement("div");tabRack.className="uniform-tab-rack";for(const item of identity.tabs)tabRack.append(createInsignia(item.definition));
  blouse.append(nameTape,armyTape,rankMark,tabRack,rack,badgeRack);
  const uniformNote=document.createElement("p");uniformNote.className="muted compact-note";uniformNote.textContent="Displayed insignia is generated from canonical award and qualification records; qualification badges update from the latest valid rating.";
  uniform.append(uniformHead,blouse,uniformNote);

  const loadout=document.createElement("section");loadout.className="identity-subpanel loadout-card";const lh=document.createElement("h3");lh.textContent="Combat Loadout";loadout.appendChild(lh);
  const cp=identity.combatProfile; const stats=document.createElement("div");stats.className="combat-profile-grid";for(const [label,value] of [["OVERALL",cp.overall],["ACCURACY",cp.accuracy],["FIREPOWER",cp.firepower],["MOBILITY",cp.mobility],["RELIABILITY",cp.reliability]])stats.append(metricBlock(label,`${value}%`));
  loadout.append(statLine("Primary Weapon",cp.primaryWeapon),statLine("Equipment Condition",cp.equipmentCondition==null?"—":`${cp.equipmentCondition}%`),stats);
  if(identity.rifleQualification)loadout.append(statLine("Current Rifle Rating",`${identity.rifleQualification.result.toUpperCase()}${identity.rifleQualification.score!=null?` · ${identity.rifleQualification.score}/${identity.rifleQualification.maxScore}`:""}`));
  const loadoutNote=document.createElement("p");loadoutNote.className="muted compact-note";loadoutNote.textContent="Combat profile is derived from actual equipped weapon statistics, equipment condition, readiness, fatigue, health, and current marksmanship qualification.";loadout.appendChild(loadoutNote);
  tabs.append(uniform,loadout); els.soldierIdentity.appendChild(tabs);

  const earned=document.createElement("details");earned.className="identity-detail disclosure-panel nested-disclosure";const earnedSummary=document.createElement("summary");const earnedKicker=document.createElement("span");earnedKicker.className="summary-kicker";earnedKicker.textContent="DECORATIONS";const earnedTitle=document.createElement("strong");earnedTitle.textContent="Awards & Insignia";earnedSummary.append(earnedKicker,earnedTitle);earned.appendChild(earnedSummary);const earnedBody=document.createElement("div");earnedBody.className="disclosure-body insignia-collection";
  const all=[...identity.ribbons,...identity.badges,...identity.tabs];
  if(identity.rifleQualification){const card=document.createElement("article");card.className="insignia-card";card.append(createInsignia(null,{qualificationResult:identity.rifleQualification.result,badgeClasp:identity.rifleQualification.badgeClasp??"RIFLE"}),metricBlock("QUALIFICATION BADGE",`${identity.rifleQualification.result.toUpperCase()} · ${identity.rifleQualification.badgeClasp??"RIFLE"}`),metricBlock("COMPLETED",identity.rifleQualification.completedDate));earnedBody.appendChild(card);}
  for(const item of all){const latest=item.records.slice().sort((a,b)=>String(b.earnedDate).localeCompare(String(a.earnedDate)))[0];const card=document.createElement("article");card.className="insignia-card";card.append(createInsignia(item.definition),metricBlock(item.definition.category.toUpperCase(),item.definition.name),metricBlock("EARNED",latest?.earnedDate??"—"));const device=awardDeviceLabel(item);if(device)card.append(metricBlock("DEVICE",device));const why=document.createElement("p");why.className="muted insignia-eligibility";why.textContent=item.definition.eligibilityDescription??"Eligibility pathway not yet modeled.";card.appendChild(why);earnedBody.appendChild(card);}
  if(!all.length&&!identity.rifleQualification){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO DECORATIONS OR QUALIFICATION BADGES RECORDED";earnedBody.appendChild(empty);}earned.appendChild(earnedBody);els.soldierIdentity.appendChild(earned);

  const catalog=document.createElement("details");catalog.className="identity-detail disclosure-panel nested-disclosure";const catalogSummary=document.createElement("summary");const catalogKicker=document.createElement("span");catalogKicker.className="summary-kicker";catalogKicker.textContent="ELIGIBILITY";const catalogTitle=document.createElement("strong");catalogTitle.textContent="Award Catalog";catalogSummary.append(catalogKicker,catalogTitle);catalog.appendChild(catalogSummary);const catalogBody=document.createElement("div");catalogBody.className="disclosure-body award-catalog";const earnedIds=new Set(all.map(item=>item.awardId));for(const def of [...registries.awards.values()].filter(item=>!item.legacy).sort((a,b)=>(a.precedence??9999)-(b.precedence??9999)||a.name.localeCompare(b.name))){const card=document.createElement("article");card.className=`award-catalog-card ${earnedIds.has(def.id)?"earned":"locked"}`;const art=createInsignia(def);const copy=document.createElement("div");const head=document.createElement("div");head.className="award-catalog-head";const title=document.createElement("strong");title.textContent=def.name;const stateLabel=document.createElement("span");stateLabel.className="award-state";stateLabel.textContent=earnedIds.has(def.id)?"EARNED":"NOT EARNED";head.append(title,stateLabel);const path=document.createElement("p");path.className="muted";path.textContent=def.eligibilityDescription??"Eligibility pathway pending.";copy.append(head,path);card.append(art,copy);catalogBody.appendChild(card);}catalog.appendChild(catalogBody);els.soldierIdentity.appendChild(catalog);

  const dd=document.createElement("details");dd.className="identity-detail disclosure-panel nested-disclosure";const ddSummary=document.createElement("summary");const ddKicker=document.createElement("span");ddKicker.className="summary-kicker";ddKicker.textContent="SEPARATION RECORD";const ddTitle=document.createElement("strong");ddTitle.textContent="DD214-Style Preview";ddSummary.append(ddKicker,ddTitle);dd.appendChild(ddSummary);const body=document.createElement("div");body.className="disclosure-body dd214-preview";
  const service=state.entities.serviceRecords[state.entities.people[personId].serviceRecordId];body.append(metricBlock("NAME",identity.name),metricBlock("GRADE / RANK",`${identity.payGrade} / ${identity.rank}`),metricBlock("MOS",identity.specialty),metricBlock("UNIT",identity.unitName),metricBlock("ENTRY DATE",service?.entryDate??"—"),metricBlock("SEPARATION DATE",service?.separationDate??"ACTIVE SERVICE"));
  const awardsText=identity.ribbons.concat(identity.badges,identity.tabs).map(item=>`${item.definition.dd214Label??item.definition.name}${item.count>1?` (${item.count} awards)`:""}`);if(identity.rifleQualification)awardsText.push(`${identity.rifleQualification.result[0].toUpperCase()+identity.rifleQualification.result.slice(1)} Marksmanship Qualification Badge w/${identity.rifleQualification.badgeClasp??"Rifle"} Clasp`);body.append(metricBlock("DECORATIONS / BADGES",awardsText.join("; ")||"None recorded"),metricBlock("MILITARY EDUCATION",career.education.filter(x=>x.status==="graduated").map(x=>x.name).join("; ")||"None recorded"));const disclaimer=document.createElement("p");disclaimer.className="muted compact-note";disclaimer.textContent="Game service-record preview inspired by separation paperwork; it is not an official reproduction of DD Form 214.";body.appendChild(disclaimer);dd.appendChild(body);els.soldierIdentity.appendChild(dd);
}

function render() {
  const state = store.getState(), indexes = store.getIndexes(), validation = validateWorldState(state, registries), hasPlayer = Boolean(state.playerPersonId);
  els.newCareerPanel.hidden = hasPlayer; els.careerContent.hidden = !hasPlayer;
  if (!hasPlayer) { els.diagnostics.textContent = ""; if(els.persistentWorldContext) els.persistentWorldContext.textContent=""; return; }
  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId), career = selectCareerRecord(state, indexes, registries, state.playerPersonId);
  const assignment = selectAssignmentView(state, indexes, registries, state.playerPersonId);
  renderSituation(state,indexes,state.playerPersonId);
  renderSoldierIdentity(state,indexes,state.playerPersonId,career);
  renderPersistentWorldContext(state);
  els.careerSummary.replaceChildren();
  const identity = document.createElement("div"); identity.className = "career-identity military-career-header";
  const rail=document.createElement("div");rail.className="document-rail career-document-rail";const railLabel=document.createElement("span");railLabel.textContent=documentProfile("career_record").label;const railRef=document.createElement("span");railRef.textContent=recordReference("career_record",state.playerPersonId);rail.append(railLabel,railRef);
  const name = document.createElement("h2"); name.textContent = `${career.rank.split(" · ")[0]} ${career.name}`;
  const sub = document.createElement("p"); sub.className = "muted career-subtitle"; sub.textContent = `${career.specialty} · ${career.component}`;
  const chain = document.createElement("p"); chain.className = "career-chain"; chain.textContent = assignment.chain.map(x => x.name).join(" › ");
  identity.append(rail,name, sub, chain);
  const chips = document.createElement("div"); chips.className = "status-chips";
  for (const text of [career.payGrade, career.role, `${squad.readiness}% ready`, `${squad.morale}% morale`]) { const chip=document.createElement("span"); chip.className="status-chip"; chip.textContent=text; chips.appendChild(chip); }
  const quick = document.createElement("div"); quick.className = "quick-stats"; quick.append(statLine("Experience", career.experience), statLine("Prestige", career.prestige), statLine("World Date", state.world.date));
  const highlights=document.createElement("div");highlights.className="career-achievement-highlights";const highlightLabel=document.createElement("span");highlightLabel.className="achievement-highlight-label";highlightLabel.textContent="SERVICE RECORD HIGHLIGHTS";highlights.appendChild(highlightLabel);
  const weaponQual=career.qualifications.find(item=>item.category==="weapons"); if(weaponQual){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=`${weaponQual.name}: ${weaponQual.result?.toUpperCase()??"QUALIFIED"}${weaponQual.score!=null&&weaponQual.maxScore!=null?` ${weaponQual.score}/${weaponQual.maxScore}`:""}`;highlights.appendChild(chip);}
  for(const item of career.qualifications.filter(item=>item.category!=="weapons").slice(0,2)){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=item.name;highlights.appendChild(chip);}
  for(const item of career.awards.filter(item=>item.category==="badge").slice(0,2)){const chip=document.createElement("span");chip.className="achievement-highlight";chip.textContent=item.name;highlights.appendChild(chip);}
  if(highlights.childElementCount===1){const none=document.createElement("span");none.className="achievement-highlight empty-highlight";none.textContent="No qualifications or badges earned yet";highlights.appendChild(none);}
  els.careerSummary.append(identity, chips, quick, highlights);
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
  els.schoolsAwards.replaceChildren();
  if(!career.education.length&&!career.qualifications.length&&!career.awards.length){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO MILITARY EDUCATION, QUALIFICATIONS, OR AWARDS RECORDED";els.schoolsAwards.appendChild(empty);} else {
    const summary=document.createElement("div");summary.className="service-record-counts";for(const [label,value] of [["SCHOOLS",career.achievementCounts.schools],["QUALIFICATIONS",career.achievementCounts.qualifications],["BADGES/TABS",career.achievementCounts.badges],["RIBBONS/MEDALS",career.achievementCounts.ribbonsAndMedals]])summary.append(metricBlock(label,value));els.schoolsAwards.appendChild(summary);
    const addGroup=(label,items,renderer)=>{if(!items.length)return;const h=document.createElement("h3");h.className="record-group-title";h.textContent=label;const records=document.createElement("div");records.className="record-strips";for(const item of items)records.appendChild(renderer(item));els.schoolsAwards.append(h,records);};
    const linkedQualificationIds=new Set(),linkedAwardIds=new Set();
    if(career.education.length){const h=document.createElement("h3");h.className="record-group-title";h.textContent="School Achievements";const records=document.createElement("div");records.className="record-strips";for(const item of career.education){const cluster=document.createElement("div");cluster.className="achievement-cluster service-achievement-cluster";const schoolRow=document.createElement("div");schoolRow.className="record-strip";schoolRow.append(statusStamp("filled"),metricBlock("SCHOOL",item.name),metricBlock("STATUS",item.status.toUpperCase()),metricBlock("COMPLETED",item.completedDate??"—"));cluster.appendChild(schoolRow);for(const q of career.qualifications.filter(q=>q.schoolId===item.schoolId)){linkedQualificationIds.add(q.id);const row=document.createElement("div");row.className="record-strip achievement-child";const result=[q.result?.toUpperCase(),q.score!=null&&q.maxScore!=null?`${q.score}/${q.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(metricBlock("QUALIFICATION",q.name),metricBlock("RATING",result));cluster.appendChild(row);}for(const a of career.awards.filter(a=>a.sourceId===item.id||registries.awards.get(a.awardId)?.eligibilitySource===item.schoolId)){linkedAwardIds.add(a.id);const row=document.createElement("div");row.className="record-strip achievement-child";row.append(metricBlock(a.category.toUpperCase(),a.name),metricBlock("EARNED",a.earnedDate));cluster.appendChild(row);}records.appendChild(cluster);}els.schoolsAwards.append(h,records);}
    addGroup("Other Qualifications",career.qualifications.filter(item=>!linkedQualificationIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";const result=[item.result?.toUpperCase(),item.score!=null&&item.maxScore!=null?`${item.score}/${item.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(statusStamp("filled"),metricBlock("QUALIFICATION",item.name),metricBlock("RATING",result),metricBlock(item.expiresDate?"EXPIRES":"COMPLETED",item.expiresDate??item.completedDate));return row;});
    addGroup("Other Badges & Tabs",career.awards.filter(item=>["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));return row;});
    addGroup("Ribbons, Medals & Decorations",career.awards.filter(item=>!["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));return row;});
  }
  renderRelationships(career.relationships);
  els.careerEvents.replaceChildren(...career.events.map(event => { const li = document.createElement("li"); li.className="service-record-entry"; const ref=document.createElement("span");ref.className="record-ref";ref.textContent=recordReference("service_record",event.id); const time = document.createElement("time"); time.textContent = event.date; const label=document.createElement("span");label.textContent=event.label; li.append(ref,time,label); return li; }));
  renderInbox(state, indexes, state.playerPersonId);
  renderSchoolCatalog(state,indexes,state.playerPersonId);
  renderGameplay(state, indexes, state.playerPersonId);
  renderOrganization(state, indexes, state.playerPersonId);
  renderServiceCareer(state, indexes, state.playerPersonId);
  renderAdministration(state, indexes);
  els.diagnostics.textContent = JSON.stringify({ valid: validation.ok, validationErrors: validation.errors, definitionValidation, worldSchemaVersion: state.schemaVersion, gameVersion: state.gameVersion, worldClock: state.world.clock, worldSeed: state.world.seed, generation: state.world.generation, rngState: state.world.rngState, nextEntitySequence: state.world.nextEntitySequence, registryCounts: Object.fromEntries(Object.entries(registries).map(([k, r]) => [k, r.size])), runtimeCounts: Object.fromEntries(Object.entries(state.entities).map(([name, collection]) => [name, Object.keys(collection).length])), indexedSquadMembers: indexes.peopleByUnitId.get(squad.unitId)?.length ?? 0, playerRelationships: indexes.relationshipsByPersonId.get(state.playerPersonId)?.length ?? 0, simulationTierCounts:Object.values(state.entities.people).reduce((acc,p)=>{const k=`tier_${p.simulationTier??2}`;acc[k]=(acc[k]??0)+1;return acc;},{}), trainingPhase:state.world.scheduler?.trainingPhaseId ?? null }, null, 2);
  setActiveView(activeView, { scroll: false });
}

function auditNpcProgression(days){
  const state=store.getState(); const player=state.entities.people[state.playerPersonId]; if(!player) return;
  const npc=Object.values(state.entities.people).filter(p=>p.id!==state.playerPersonId && p.affiliation.unitId===player.affiliation.unitId).sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(!npc){setStatus("No squad NPC available for audit.","bad");return;}
  const draft=structuredClone(state), before=structuredClone(draft.entities.people[npc.id]); draft.world.clock.elapsedDays+=days; const d=new Date(`${draft.world.date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);draft.world.date=d.toISOString().slice(0,10); simulatePersonnelLifecycle(draft,days,registries,{excludePersonId:state.playerPersonId}); const after=draft.entities.people[npc.id];
  els.diagnostics.textContent=`NPC SIMULATION AUDIT (${days} DAYS, NON-MUTATING)\n${before.identity.displayName} · Tier ${before.simulationTier}\nExperience ${before.career.experience} → ${after.career.experience}\nReadiness ${before.condition.readiness}% → ${after.condition.readiness}%\nFatigue ${before.condition.fatigue}% → ${after.condition.fatigue}%\nMorale ${before.condition.morale}% → ${after.condition.morale}%\nRank ${before.affiliation.rankId} → ${after.affiliation.rankId}\n\nThis audit ran on a cloned world and did not alter the save.`;
}

function getNoticesByIds(ids) { const state = store.getState(); return ids.map(id => state.entities.notificationRecords[id]).filter(Boolean); }
function queueNotifications(ids) { achievementQueue.push(...getNoticesByIds(ids).filter(n => ["career_opportunity", "qualification_completed", "award_earned", "promotion", "memorial"].includes(n.type))); queueMicrotask(showNextAchievement); }
function showNextAchievement() { if (els.achievementDialog.open || els.resultDialog.open || els.personDialog.open || els.saveDialog.open || els.confirmDialog.open || achievementQueue.length === 0) return; const notice = achievementQueue.shift(); els.achievementType.textContent = notice.type.replaceAll("_", " ").toUpperCase(); els.achievementTitle.textContent = notice.title; els.achievementMessage.textContent = notice.message; els.achievementDialog.dataset.notificationId = notice.id; els.achievementDialog.dataset.opportunityRecordId = notice.references?.opportunityRecordId ?? ""; els.achievementOk.textContent=notice.references?.opportunityRecordId?"Open Opportunity":"Continue"; els.achievementDialog.showModal(); }
els.achievementOk.addEventListener("click", () => { const id = els.achievementDialog.dataset.notificationId, opportunityRecordId=els.achievementDialog.dataset.opportunityRecordId; if (id) { try { markNotificationRead(store, id); } catch {} } els.achievementDialog.close(); if(opportunityRecordId)openOpportunityRecord(opportunityRecordId); showNextAchievement(); });

function autosave() { if (!store.getState().playerPersonId) return; const validation = validateWorldState(store.getState(), registries); if (!validation.ok) return; try { saveToSlot(store.getState(), AUTOSAVE_SLOT); } catch(error) { console.warn("Autosave skipped",error); setStatus(error instanceof Error?error.message:"Autosave storage is unavailable.","bad"); } }
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
    if (mode === "load" && !meta.empty) { const button = document.createElement("button"); button.type = "button"; button.textContent = "Load"; button.addEventListener("click", async () => { if (store.getState().playerPersonId && !(await confirmAction("Load Career?", "Unsaved progress in the current session will be replaced."))) return; try { const loaded = loadFromSlot(meta.slotId); if (!loaded) throw new Error("Save slot is empty."); const validation = validateWorldState(loaded.worldState, registries); if (!validation.ok) throw new Error(`Load blocked: ${validation.errors.join(" | ")}`); store.replaceState(loaded.worldState);
        const loadedPersonId=store.getState().playerPersonId;
        if(loadedPersonId){const eligibility=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,loadedPersonId);store.mutate(draft=>updateCareerObjectivesInDraft(draft,registries,loadedPersonId,{promotionEligible:eligibility.eligible}),["careerGameplay"]);}
        els.saveDialog.close(); setStatus(`Loaded ${loaded.metadata?.characterName ?? "career"}.`, "good"); } catch (error) { setStatus(error.message, "bad"); } }); actions.appendChild(button); }
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
els.save.addEventListener("click", () => openSaveManager("save")); els.load.addEventListener("click", () => openSaveManager("load")); els.loadFromStart.addEventListener("click", () => openSaveManager("load"));
els.resultClose.addEventListener("click",()=>{els.resultDialog.close();showNextAchievement();});
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

if (els.auditNpc30) els.auditNpc30.addEventListener("click",()=>auditNpcProgression(30));
if (els.auditNpc90) els.auditNpc90.addEventListener("click",()=>auditNpcProgression(90));
if (els.auditNpc365) els.auditNpc365.addEventListener("click",()=>auditNpcProgression(365));
