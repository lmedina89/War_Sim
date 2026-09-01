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
import { createInsignia, createNamedInsignia, createRankInsignia } from "./ui/insignia.js";
import { createDomRegistry } from "./ui/dom.js";
import { initializeDisclosureState } from "./ui/uiStorage.js";
import { createNavigationController } from "./ui/navigation.js";
import { createSaveManagerController } from "./ui/dialogs/saveManager.js";
import { createPersonProfileController } from "./ui/dialogs/personProfile.js";
import { createConfirmDialogController } from "./ui/dialogs/confirmDialog.js";
import { createAchievementDialogController } from "./ui/dialogs/achievementDialog.js";
import { createResultDialogController } from "./ui/dialogs/resultDialog.js";
import { createPresentationToolkit } from "./ui/presentation.js";
import { createRelationshipsRenderer } from "./ui/render/relationships.js";
import { createInboxRenderer } from "./ui/render/inbox.js";
import { createSoldierIdentityRenderer } from "./ui/render/soldierIdentity.js";
import { createUnitPersonnelRenderer } from "./ui/render/unitPersonnel.js";
import { createHistoryArchiveController } from "./ui/historyArchive.js";

const definitionValidation = validateDefinitions(registries);
if (!definitionValidation.ok) throw new Error(`Definition validation failed: ${definitionValidation.errors.join(" | ")}`);

const store = createStateStore(createInitialWorldState());
const eventBus = createEventBus();
let selectedOrganizationUnitId = null, personnelFilterUnitId = null, statusTimer = null;
const CAREER_HISTORY_PREVIEW_LIMIT = 5;
const UNIT_TRAINING_PREVIEW_LIMIT = 4;
const UNIT_HISTORY_PREVIEW_LIMIT = 5;
const SITUATION_FEED_PREVIEW_LIMIT = 3;

const els = createDomRegistry();
const navigation = createNavigationController();

function freshWorldSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] || 1;
}
function assignFreshWorldSeed() { els.worldSeed.value = String(freshWorldSeed()); }
assignFreshWorldSeed();
els.rerollSeed.addEventListener("click", assignFreshWorldSeed);

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
const {
  statLine,
  progressRow,
  renderList,
  resolveRankName,
  resolveBranchName,
  formatSavedAt,
  performanceProfile,
  feedbackProfile,
  humanizeStatus,
  statusProfile,
  documentProfile,
  compactReference,
  statusStamp,
  metricBlock,
  recordReference,
  formatMilitaryDate,
} = createPresentationToolkit(registries);

const { setSubscreen, restoreSubscreens, setActiveView } = navigation;

function scrollToCareerTarget(targetId) {
  setActiveView("career", { scroll:false });
  const target=document.getElementById(targetId);
  const screen=target?.closest("[data-career-screen]")?.dataset.careerScreen;
  if(screen) setSubscreen("career",screen,{scroll:false});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const current=document.getElementById(targetId);
    if(current){
      const top=Math.max(0,window.scrollY+current.getBoundingClientRect().top-150);
      window.scrollTo({top,behavior:"smooth"});
      current.classList.add("attention-flash");
      setTimeout(()=>current.classList.remove("attention-flash"),1400);
    }
  }));
}
function openOpportunityRecord(opportunityRecordId) { scrollToCareerTarget(opportunityRecordId); }

const historyArchive = createHistoryArchiveController({ onChange: () => render() });
const readUiArchive = historyArchive.read;
const writeUiArchive = historyArchive.write;
const archiveUiRecord = historyArchive.archiveRecord;
const archiveUiRecords = historyArchive.archiveRecords;
const createHistoryControls = historyArchive.createControls;


const confirmationDialog = createConfirmDialogController({
  elements: { dialog: els.confirmDialog, title: els.confirmTitle, message: els.confirmMessage },
});
const confirmAction = confirmationDialog.confirm;

const resultDialog = createResultDialogController({
  elements: { dialog: els.resultDialog, reference: els.resultReference, kicker: els.resultKicker, title: els.resultTitle, body: els.resultBody },
  getState: () => store.getState(),
  getActivityDefinition: id => registries.activities.get(id),
  getDutyDefinition: id => registries.duties.get(id),
  getSkillName: id => registries.skills.get(id)?.name,
  getGameplayEventDefinition: id => registries.gameplayEvents.get(id),
  getPerformanceRatingLabel: id => registries.performanceRatings.get(id)?.label,
  performanceProfile, feedbackProfile, compactReference, recordReference, statusStamp, metricBlock,
});

const achievementDialog = createAchievementDialogController({
  elements: { dialog: els.achievementDialog, type: els.achievementType, title: els.achievementTitle, message: els.achievementMessage, ok: els.achievementOk },
  getNoticesByIds: ids => { const state=store.getState(); return ids.map(id => state.entities.notificationRecords[id]).filter(Boolean); },
  markRead: id => markNotificationRead(store,id),
  openOpportunity: openOpportunityRecord,
  isBlocked: () => els.resultDialog.open || els.personDialog.open || els.saveDialog.open || els.confirmDialog.open,
});
const queueNotifications = ids => achievementDialog.enqueue(ids);

const renderInboxView = createInboxRenderer({
  elements: {
    unreadBadge: els.unreadBadge,
    navCareerBadge: els.navCareerBadge,
    careerTabInboxBadge: els.careerTabInboxBadge,
    markAllRead: els.markAllRead,
    clearRead: els.clearRead,
    careerInbox: els.careerInbox,
  },
  recordReference,
  onOpenOpportunity: openOpportunityRecord,
  onAcknowledge: noticeId => runCommand(() => markNotificationRead(store, noticeId)),
  onArchive: noticeId => runCommand(() => archiveNotification(store, noticeId)),
  onMarkReadQuiet: noticeId => { try { markNotificationRead(store, noticeId); } catch {} },
});

function renderInbox(state, indexes, personId) {
  const notices = selectNotifications(state, indexes, personId);
  const pendingIds = indexes.gameplayEventsByPersonId?.get(personId) ?? [];
  const pendingDecisionCount = pendingIds
    .map(id => state.entities.gameplayEventRecords[id])
    .filter(record => record?.status === "pending").length;
  renderInboxView({ state, notices, pendingDecisionCount });
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
  const copy=document.createElement("div"); copy.className="situation-identity-copy";
  const kicker=document.createElement("span"); kicker.className="situation-kicker"; kicker.textContent="CURRENT SITUATION";
  const title=document.createElement("strong"); title.textContent=`${rank.abbreviation} ${person.identity.displayName}`;
  const sub=document.createElement("span"); sub.textContent=`${specialty.code} ${specialty.name} · ${assignment.chain.map(x=>x.name).join(" / ")}`; copy.append(kicker,title,sub);
  const formationView=assignment.chain.find(item=>item.formationInsigniaId)??null;
  if(formationView?.formationInsigniaId)identity.append(copy,createNamedInsignia(formationView.formationInsigniaId,{title:formationView.formationName}));else identity.append(copy);
  const metrics=document.createElement("div"); metrics.className="situation-metrics";
  const gameplay=selectGameplay(state,indexes,registries,personId); const dutyLabel=gameplay?.currentDuty?.shortName ?? "AVAILABLE";
  metrics.append(statusStamp(person.condition.status),metricBlock("DATE",state.world.date),metricBlock("DUTY",dutyLabel),metricBlock("PERS",`${strength.assigned}/${strength.authorized}`),metricBlock("RDY",unit?`${unit.readiness}%`:"—"),metricBlock("MORALE",unit?`${unit.morale}%`:"—"));
  els.situationStrip.replaceChildren(identity,metrics);
}

function createProfileUniform(state,indexes,personId){
  const identity=selectSoldierIdentity(state,indexes,registries,personId),person=state.entities.people[personId];
  const section=document.createElement("section");section.className="profile-section service-file-section npc-uniform-preview";section.hidden=true;
  const head=document.createElement("div");head.className="identity-subhead";const title=document.createElement("h3");title.textContent="Service Uniform";const meta=document.createElement("span");meta.textContent=`${identity.rank} · ${identity.specialty}`;head.append(title,meta);
  const blouse=document.createElement("div");blouse.className="uniform-blouse npc-uniform-blouse";
  const nameTape=document.createElement("div");nameTape.className="uniform-name-tape";nameTape.textContent=identity.name.split(" ").at(-1)?.toUpperCase()??identity.name.toUpperCase();
  const armyTape=document.createElement("div");armyTape.className="uniform-army-tape";armyTape.textContent="U.S. ARMY";
  const rankMark=document.createElement("div");rankMark.className="uniform-rank-mark";rankMark.append(createRankInsignia(registries.ranks.get(person.affiliation.rankId)));
  const ribbons=document.createElement("div");ribbons.className="uniform-ribbon-rack";for(const item of identity.ribbons){const slot=document.createElement("span");slot.className="uniform-ribbon-slot";slot.append(createInsignia(item.definition));const device=awardDeviceLabel(item);if(device){const d=document.createElement("small");d.className="insignia-device";d.textContent=device;slot.appendChild(d);}ribbons.appendChild(slot);}if(!identity.ribbons.length){const empty=document.createElement("span");empty.className="uniform-empty-slot";empty.textContent="NO RIBBONS";ribbons.appendChild(empty);}
  const badges=document.createElement("div");badges.className="uniform-badge-rack";for(const item of identity.badges){const slot=document.createElement("span");slot.className="uniform-badge-slot";slot.append(createInsignia(item.definition));badges.appendChild(slot);}if(identity.rifleQualification){const slot=document.createElement("span");slot.className="uniform-badge-slot qualification-insignia";slot.append(createInsignia(null,{qualificationResult:identity.rifleQualification.result,badgeClasp:identity.rifleQualification.badgeClasp??"RIFLE"}));badges.appendChild(slot);}
  const tabs=document.createElement("div");tabs.className="uniform-tab-rack";for(const item of identity.tabs)tabs.append(createInsignia(item.definition));blouse.append(nameTape,armyTape,rankMark,tabs,ribbons,badges);
  const note=document.createElement("p");note.className="muted compact-note";note.textContent="This Tier 1 Soldier's uniform is generated only from that Soldier's canonical rank, awards, badges, and qualifications.";section.append(head,blouse,note);return section;
}

function getPersonProfileContext(personId) {
  const state=store.getState(), indexes=store.getIndexes(), person=state.entities.people[personId]; if(!person) return null;
  const rank=registries.ranks.get(person.affiliation.rankId), billet=state.entities.billets[person.affiliation.billetId], billetDef=billet?registries.billets.get(billet.definitionId):null, unit=state.entities.units[person.affiliation.unitId];
  const branch=registries.branches.get(person.affiliation.branchId), specialty=registries.specialties.get(person.affiliation.specialtyId), assignment=selectAssignmentView(state,indexes,registries,personId);
  const career=selectCareerRecord(state,indexes,registries,personId), loadout=state.entities.loadouts[person.loadoutId], primary=loadout?state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId]:null, equipment=primary?registries.equipment.get(primary.definitionId):null;
  const gameplay=selectGameplay(state,indexes,registries,person.id);
  return {state,indexes,person,rank,billetDef,unit,branch,specialty,assignment,career,primary,equipment,gameplay,getAwardDefinition:id=>registries.awards.get(id)};
}
let personProfile;
function showPersonProfile(personId) { personProfile.open(personId); }
const renderSoldierIdentity = createSoldierIdentityRenderer({
  container: els.soldierIdentity,
  registries,
  selectSoldierIdentity,
  selectAssignmentView,
  createInsignia,
  createRankInsignia,
  awardDeviceLabel,
  metricBlock,
  statLine,
});

const renderRelationships = createRelationshipsRenderer({
  container: els.relationships,
  relationshipBands: registries.relationshipBands,
  onOpenPerson: showPersonProfile,
});

const unitPersonnelRenderer = createUnitPersonnelRenderer({
  elements: els,
  registries,
  selectOrganizationView,
  selectAssignmentView,
  selectUnitPersonnel,
  calculateUnitReadiness,
  selectUnitCapabilityInventory,
  selectGameplay,
  createNamedInsignia,
  metricBlock,
  statLine,
  documentProfile,
  statusProfile,
  statusStamp,
  recordReference,
  readUiArchive,
  archiveUiRecord,
  createHistoryControls,
  unitHistoryPreviewLimit: UNIT_HISTORY_PREVIEW_LIMIT,
  getSelectedUnitId: () => selectedOrganizationUnitId,
  setSelectedUnitId: unitId => { selectedOrganizationUnitId = unitId; },
  getPersonnelFilterUnitId: () => personnelFilterUnitId,
  setPersonnelFilterUnitId: unitId => { personnelFilterUnitId = unitId; },
  onOpenPerson: showPersonProfile,
  onRender: () => render(),
  onScheduleUnitDuty: (personId, dutyId) => runCommand(() => scheduleUnitDuty(store, registries, personId, dutyId)),
  onOpenAssignedUnit: unitId => { selectedOrganizationUnitId = unitId; setActiveView("unit"); render(); },
});
const renderOrganization = unitPersonnelRenderer.renderOrganization;
const renderPersonnelBrowser = unitPersonnelRenderer.renderPersonnelBrowser;
const renderUnitRoster = unitPersonnelRenderer.renderUnitRoster;

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
  if(els.unitSituationFeed){
    const feed=view.unitHistory??[];
    if(els.situationFeedCount) els.situationFeedCount.textContent=feed.length?`· ${feed.length}`:"";
    if(!feed.length){const empty=document.createElement("p");empty.className="empty-state compact-empty";empty.textContent="ROUTINE OPERATIONS — NO RECENT SIGNIFICANT UNIT EVENTS";els.unitSituationFeed.appendChild(empty);}
    else {
      const expanded=els.unitSituationFeed.dataset.expanded==="true";
      const shown=expanded?feed:feed.slice(0,SITUATION_FEED_PREVIEW_LIMIT);
      for(const item of shown){const row=document.createElement("div");row.className="situation-feed-row";const time=document.createElement("time");time.textContent=item.gameDate;const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.title;const span=document.createElement("span");span.textContent=item.summary;body.append(strong,span);row.append(time,body);els.unitSituationFeed.appendChild(row);}
      if(feed.length>SITUATION_FEED_PREVIEW_LIMIT){const controls=document.createElement("div");controls.className="situation-feed-controls";const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary compact-button";toggle.textContent=expanded?"Show Recent":`Show All (${feed.length})`;toggle.setAttribute("aria-expanded",String(expanded));toggle.addEventListener("click",()=>{els.unitSituationFeed.dataset.expanded=expanded?"false":"true";render();});controls.appendChild(toggle);els.unitSituationFeed.appendChild(controls);}
    }
  }

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
    for(const item of shown){const row=document.createElement("div");row.className="history-row-shell";const button=document.createElement("button");button.type="button";button.className="duty-history-row";const text=document.createElement("span");text.textContent=`${item.completedDate} · ${item.name}`;const result=document.createElement("strong");result.textContent=item.isPtSummary?"ROUTINE":item.performanceRating?`${registries.performanceRatings.get(item.performanceRating)?.label ?? item.performanceRating} · ${item.performanceScore ?? "—"}/100`:"COMPLETED";button.append(text,result);if(!item.isPtSummary)button.addEventListener("click",()=>resultDialog.showDuty(item.id));else button.disabled=true;const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecords("unit-training",personId,item.isPtSummary?item.summaryIds:[item.id]));row.append(button,archive);history.appendChild(row);}els.dutySchedule.appendChild(history);
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
  else for (const record of (activityExpanded?visibleActivities:visibleActivities.slice(0,CAREER_HISTORY_PREVIEW_LIMIT))) { const def=registries.activities.get(record.activityDefinitionId), shell=document.createElement("div");shell.className="history-row-shell"; const item=document.createElement("button"); item.type="button"; item.className="activity-item training-record activity-log-button"; const time=document.createElement("time"); time.textContent=record.endDate; const text=document.createElement("span"); const outcome=record.qualificationResult?`${record.qualificationResult.label.toUpperCase()} ${record.qualificationResult.score}/${record.qualificationResult.maxScore}`:`${(record.performanceRating ?? "completed").toUpperCase()}${record.performanceScore!=null?` ${record.performanceScore}/100`:""}`; text.textContent=`${def.name} · ${outcome} · ${record.durationDays} day${record.durationDays===1?"":"s"}${record.eventRecordId?" · event":""}`; item.append(time,text); item.addEventListener("click",()=>resultDialog.showActivity(record.id)); const archive=document.createElement("button");archive.type="button";archive.className="secondary compact-button history-archive";archive.textContent="Archive";archive.addEventListener("click",()=>archiveUiRecord("activity-history",personId,record.id));shell.append(item,archive);els.activityHistory.appendChild(shell); }
  const activityControls=createHistoryControls({kind:"activity-history",personId,hiddenCount:Math.max(0,visibleActivities.length-CAREER_HISTORY_PREVIEW_LIMIT),archivedCount:archivedActivityCount,expanded:activityExpanded,onToggle:()=>{els.activityHistory.dataset.expanded=activityExpanded?"false":"true";render();}}); if(activityControls.childElementCount)els.activityHistory.appendChild(activityControls);
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
  if(career.promotion.nextRank){const promoQuick=document.createElement("button");promoQuick.type="button";promoQuick.className="secondary promotion-quick-link";promoQuick.textContent=`Promotion: ${career.promotion.nextRank.abbreviation} · ${career.promotion.eligible?"Eligible":"View Progress"}`;promoQuick.addEventListener("click",()=>{setSubscreen("career","records",{scroll:false});requestAnimationFrame(()=>{const top=Math.max(0,window.scrollY+els.promotionCard.getBoundingClientRect().top-150);window.scrollTo({top,behavior:"smooth"});});});quick.appendChild(promoQuick);}
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
    const promotionStatus=document.createElement("div");promotionStatus.className="promotion-status-grid";promotionStatus.append(metricBlock("CURRENT",career.rank.split(" · ")[0]),metricBlock("NEXT",career.promotion.nextRank.abbreviation),metricBlock("STATUS",career.promotion.eligible?"ELIGIBLE":"IN PROGRESS"));els.promotionCard.appendChild(promotionStatus);
    const prog = career.promotion.progress ?? {};
    if (prog.requiredExperience) els.promotionCard.append(progressRow("Experience", prog.experience, prog.requiredExperience));
    if (prog.requiredServiceDays) els.promotionCard.append(progressRow("Time in Service", prog.serviceDays, prog.requiredServiceDays));
    if (prog.requiredGradeDays) els.promotionCard.append(progressRow("Time in Grade", prog.gradeDays, prog.requiredGradeDays));
    if(prog.requiredQualifications?.length){const qualifications=document.createElement("div");qualifications.className="promotion-qualification-list";const h=document.createElement("strong");h.textContent="Required Qualifications / PME";qualifications.appendChild(h);for(const item of prog.requiredQualifications){const row=document.createElement("div");row.className=`promotion-qualification ${item.held?"complete":"missing"}`;row.textContent=`${item.held?"✓":"○"} ${item.name}`;qualifications.appendChild(row);}els.promotionCard.appendChild(qualifications);}
    const blockers=document.createElement("div");blockers.className="promotion-blockers";const bh=document.createElement("strong");bh.textContent=career.promotion.eligible?"Eligibility":"Remaining Requirements";blockers.appendChild(bh);const reasonBox=document.createElement("div");renderList(reasonBox,career.promotion.reasons,"All current requirements are satisfied. Promotion can be processed when authorized.");blockers.appendChild(reasonBox);els.promotionCard.appendChild(blockers); els.promote.disabled = !career.promotion.eligible;
  }
  els.schoolsAwards.replaceChildren();
  if(!career.education.length&&!career.qualifications.length&&!career.awards.length){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO MILITARY EDUCATION, QUALIFICATIONS, OR AWARDS RECORDED";els.schoolsAwards.appendChild(empty);} else {
    const summary=document.createElement("div");summary.className="service-record-counts";for(const [label,value] of [["SCHOOLS",career.achievementCounts.schools],["QUALIFICATIONS",career.achievementCounts.qualifications],["BADGES/TABS",career.achievementCounts.badges],["RIBBONS/MEDALS",career.achievementCounts.ribbonsAndMedals]])summary.append(metricBlock(label,value));els.schoolsAwards.appendChild(summary);
    const addGroup=(label,items,renderer)=>{if(!items.length)return;const h=document.createElement("h3");h.className="record-group-title";h.textContent=label;const records=document.createElement("div");records.className="record-strips";for(const item of items)records.appendChild(renderer(item));els.schoolsAwards.append(h,records);};
    const linkedQualificationIds=new Set(),linkedAwardIds=new Set();
    if(career.education.length){const h=document.createElement("h3");h.className="record-group-title";h.textContent="School Achievements";const records=document.createElement("div");records.className="record-strips";for(const item of career.education){const cluster=document.createElement("div");cluster.className="achievement-cluster service-achievement-cluster";const schoolRow=document.createElement("div");schoolRow.className="record-strip";schoolRow.append(statusStamp("filled"),metricBlock("SCHOOL",item.name),metricBlock("STATUS",item.status.toUpperCase()),metricBlock("COMPLETED",item.completedDate??"—"));cluster.appendChild(schoolRow);for(const q of career.qualifications.filter(q=>q.schoolId===item.schoolId)){linkedQualificationIds.add(q.id);const row=document.createElement("div");row.className="record-strip achievement-child";const result=[q.result?.toUpperCase(),q.score!=null&&q.maxScore!=null?`${q.score}/${q.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(metricBlock("QUALIFICATION",q.name),metricBlock("RATING",result));cluster.appendChild(row);}for(const a of career.awards.filter(a=>a.sourceId===item.id||registries.awards.get(a.awardId)?.eligibilitySource===item.schoolId)){linkedAwardIds.add(a.id);const row=document.createElement("div");row.className="record-strip achievement-child";row.append(metricBlock(a.category.toUpperCase(),a.name),metricBlock("EARNED",a.earnedDate));cluster.appendChild(row);}records.appendChild(cluster);}els.schoolsAwards.append(h,records);}
    addGroup("Other Qualifications",career.qualifications.filter(item=>!linkedQualificationIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";const result=[item.result?.toUpperCase(),item.score!=null&&item.maxScore!=null?`${item.score}/${item.maxScore}`:null].filter(Boolean).join(" · ")||"QUALIFIED";row.append(statusStamp("filled"),metricBlock("QUALIFICATION",item.name),metricBlock("RATING",result),metricBlock(item.expiresDate?"EXPIRES":"COMPLETED",item.expiresDate??item.completedDate));return row;});
    addGroup("Other Badges & Tabs",career.awards.filter(item=>["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));if(item.reason)row.append(metricBlock("WHY EARNED",item.reason));return row;});
    addGroup("Ribbons, Medals & Decorations",career.awards.filter(item=>!["badge","tab"].includes(item.category)&&!linkedAwardIds.has(item.id)),item=>{const row=document.createElement("div");row.className="record-strip";row.append(statusStamp("filled"),metricBlock(item.category.toUpperCase(),item.name),metricBlock("EARNED",item.earnedDate));if(item.reason)row.append(metricBlock("WHY EARNED",item.reason));return row;});
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
  setActiveView(navigation.getActiveView(), { scroll: false });
}

function auditNpcProgression(days){
  const state=store.getState(); const player=state.entities.people[state.playerPersonId]; if(!player) return;
  const npc=Object.values(state.entities.people).filter(p=>p.id!==state.playerPersonId && p.affiliation.unitId===player.affiliation.unitId).sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(!npc){setStatus("No squad NPC available for audit.","bad");return;}
  const draft=structuredClone(state), before=structuredClone(draft.entities.people[npc.id]); draft.world.clock.elapsedDays+=days; const d=new Date(`${draft.world.date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);draft.world.date=d.toISOString().slice(0,10); simulatePersonnelLifecycle(draft,days,registries,{excludePersonId:state.playerPersonId}); const after=draft.entities.people[npc.id];
  els.diagnostics.textContent=`NPC SIMULATION AUDIT (${days} DAYS, NON-MUTATING)\n${before.identity.displayName} · Tier ${before.simulationTier}\nExperience ${before.career.experience} → ${after.career.experience}\nReadiness ${before.condition.readiness}% → ${after.condition.readiness}%\nFatigue ${before.condition.fatigue}% → ${after.condition.fatigue}%\nMorale ${before.condition.morale}% → ${after.condition.morale}%\nRank ${before.affiliation.rankId} → ${after.affiliation.rankId}\n\nThis audit ran on a cloned world and did not alter the save.`;
}

function autosave() { if (!store.getState().playerPersonId) return; const validation = validateWorldState(store.getState(), registries); if (!validation.ok) return; try { saveToSlot(store.getState(), AUTOSAVE_SLOT); } catch(error) { console.warn("Autosave skipped",error); setStatus(error instanceof Error?error.message:"Autosave storage is unavailable.","bad"); } }
function pulseFeedback(result) {
  const targets = result?.code === "activity_completed" ? [els.careerSummary, els.skillSummary, els.activityHistory] : result?.code === "time_advanced" ? [els.careerSummary, els.promotionCard] : [];
  for (const target of targets.filter(Boolean)) { target.classList.remove("feedback-pulse"); void target.offsetWidth; target.classList.add("feedback-pulse"); setTimeout(() => target.classList.remove("feedback-pulse"), 700); }
}
function runCommand(fn, { autosaveAfter = true, statusTone = "good" } = {}) { try { const result = fn(); if (result?.notifications?.length) queueNotifications(result.notifications); eventBus.publish({ type: "command_completed", result }); resultDialog.showCommandResult(result); pulseFeedback(result); if (autosaveAfter) autosave(); setStatus(result?.message ?? "Command completed.", statusTone); return result; } catch (error) { console.error(error); setStatus(error instanceof Error ? error.message : String(error), "bad"); return null; } }

const saveManager = createSaveManagerController({
  elements: { dialog: els.saveDialog, title: els.saveDialogTitle, modeLabel: els.saveModeLabel, slots: els.saveSlots },
  getSlots: listSaveSlots,
  autosaveSlotId: AUTOSAVE_SLOT,
  confirmAction,
  describeSlot: meta => [
    meta.characterName,
    `${resolveRankName(meta.rankId)} · ${resolveBranchName(meta.branchId)}`,
    meta.specialtyId && registries.specialties.has(meta.specialtyId) ? `${registries.specialties.get(meta.specialtyId).code} · ${registries.specialties.get(meta.specialtyId).name}` : null,
    meta.unitName ? `Unit · ${meta.unitName}` : null,
    meta.recoveredFromBackup ? "Recovery backup available" : (meta.corrupted ? "Save data is damaged" : null),
    `Game date ${meta.gameDate}`,
    `Saved ${formatSavedAt(meta.savedAt)}`,
    `v${meta.gameVersion} · schema ${meta.worldSchemaVersion}`,
  ],
  onSaveSlot: async meta => {
    try {
      const validation = validateWorldState(store.getState(), registries);
      if (!validation.ok) throw new Error(`Save blocked: ${validation.errors.join(" | ")}`);
      const saved = saveToSlot(store.getState(), meta.slotId);
      setStatus(`Saved ${saved.characterName} to ${meta.slotId}.`, "good");
      return true;
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "The save could not be written.", "bad");
      return false;
    }
  },
  onLoadSlot: async meta => {
    if (store.getState().playerPersonId && !(await confirmAction("Load Career?", "Unsaved progress in the current session will be replaced."))) return false;
    try {
      const loaded = loadFromSlot(meta.slotId);
      if (!loaded) throw new Error("Save slot is empty.");
      const validation = validateWorldState(loaded.worldState, registries);
      if (!validation.ok) throw new Error(`Load blocked: ${validation.errors.join(" | ")}`);
      store.replaceState(loaded.worldState);
      const loadedPersonId = store.getState().playerPersonId;
      if (loadedPersonId) {
        const eligibility = evaluatePromotionEligibility(store.getState(), store.getIndexes(), registries, loadedPersonId);
        store.mutate(draft => updateCareerObjectivesInDraft(draft, registries, loadedPersonId, { promotionEligible: eligibility.eligible }), ["careerGameplay"]);
      }
      setStatus(loaded.metadata?.recoveredFromBackup ? `Recovered and loaded ${loaded.metadata?.characterName ?? "career"} from the manual-save backup.` : `Loaded ${loaded.metadata?.characterName ?? "career"}.`, "good");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "bad");
      return false;
    }
  },
  onDeleteSlot: async meta => {
    deleteSaveSlot(meta.slotId);
    return true;
  },
});
personProfile = createPersonProfileController({
  els, getProfileContext:getPersonProfileContext, createProfileUniform, createRankInsignia, statLine, progressRow, statusStamp, metricBlock, recordReference, readUiArchive, writeUiArchive,
  onOpenUnit: unitId => { selectedOrganizationUnitId=unitId; personProfile.close(); setActiveView("unit"); render(); }
});

els.newCareerForm.addEventListener("submit", event => { event.preventDefault(); setSubscreen("career","home",{scroll:false}); runCommand(() => createPlayerCareer(store, registries, { firstName: els.firstName.value, lastName: els.lastName.value, branchId: els.branchSelect.value, componentId: els.componentSelect.value, specialtyId: els.specialtySelect.value, contractDefinitionId: els.contractSelect.value, seed: Number(els.worldSeed.value) >>> 0 }), { autosaveAfter: true }); });
els.advance1.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 1)));
els.advance7.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 7)));
els.advance30.addEventListener("click", () => runCommand(() => advanceWorldDays(store, 30)));
els.reviewReenlistment.addEventListener("click", () => runCommand(() => generateReenlistmentOffers(store, registries, store.getState().playerPersonId)));
els.promote.addEventListener("click", () => runCommand(() => promotePerson(store, registries, store.getState().playerPersonId)));
els.save.addEventListener("click", () => saveManager.open("save")); els.load.addEventListener("click", () => saveManager.open("load")); els.loadFromStart.addEventListener("click", () => saveManager.open("load"));
els.resultClose.addEventListener("click",()=>{els.resultDialog.close();achievementDialog.showNext();});
els.markAllRead.addEventListener("click",()=>runCommand(()=>markAllNotificationsRead(store,store.getState().playerPersonId),{autosaveAfter:true}));
els.clearRead.addEventListener("click",()=>runCommand(()=>clearReadNotifications(store,store.getState().playerPersonId),{autosaveAfter:true}));
els.saveDialogClose.addEventListener("click", () => saveManager.close());
els.personProfileClose.addEventListener("click", () => personProfile.close());
els.newCareer.addEventListener("click", async () => {
  if (!(await confirmAction("Start New Career?", "The current session will be replaced. Your manual save slots will not be deleted."))) return;
  const seed = freshWorldSeed(); const scenario = registries.careerStartScenarios.values().find(item => item.enabled);
  store.replaceState(createInitialWorldState({ seed, scenarioId: scenario?.id })); els.newCareerForm.reset();
  if (scenario) {
    els.branchSelect.value = scenario.branchId; els.componentSelect.value = scenario.componentId; els.specialtySelect.value = scenario.specialtyId;
    els.contractSelect.value = scenario.allowedContractDefinitionIds[0] ?? registries.components.get(scenario.componentId).defaultContractDefinitionId;
  }
  els.worldSeed.value = String(seed); setActiveView("career",{scroll:false}); setSubscreen("career","home",{scroll:false}); selectedOrganizationUnitId = null; personnelFilterUnitId = null; setStatus("New career setup ready with a new generated world seed. Existing save slots were preserved.", "warn");
});

els.returnMyUnit.addEventListener("click", () => { const state=store.getState(), indexes=store.getIndexes(); selectedOrganizationUnitId=playerAssignmentUnitId(state,indexes); render(); });
els.viewSelectedPersonnel.addEventListener("click", () => { personnelFilterUnitId=selectedOrganizationUnitId; setSubscreen("personnel","roster",{scroll:false}); setActiveView("personnel"); render(); });
els.personnelMyUnit.addEventListener("click", () => { const state=store.getState(), indexes=store.getIndexes(); personnelFilterUnitId=playerAssignmentUnitId(state,indexes); render(); });
navigation.bindNavigation();
restoreSubscreens();
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
