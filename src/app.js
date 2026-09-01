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
import { createSituationRenderer } from "./ui/render/situation.js";
import { createServiceCareerRenderer } from "./ui/render/serviceCareer.js";
import { createCareerRecordRenderer } from "./ui/render/careerRecord.js";
import { createCareerGameplayRenderer } from "./ui/render/careerGameplay.js";
import { createAdministrationRenderer } from "./ui/render/administration.js";
import { createPersonProfileUniformRenderer } from "./ui/render/personProfileUniform.js";
import { awardDeviceLabel } from "./ui/awardPresentation.js";
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

const situationRenderer = createSituationRenderer({
  elements: { persistentWorldContext: els.persistentWorldContext, situationStrip: els.situationStrip },
  registries,
  selectAssignmentView,
  selectOrganizationView,
  selectGameplay,
  createNamedInsignia,
  statusStamp,
  metricBlock,
  formatMilitaryDate,
});
const renderSituation = situationRenderer.renderSituation;
const renderPersistentWorldContext = situationRenderer.renderPersistentWorldContext;

const personProfileUniformRenderer = createPersonProfileUniformRenderer({
  registries,
  selectSoldierIdentity,
  createInsignia,
  createRankInsignia,
  awardDeviceLabel,
});
const createProfileUniform = personProfileUniformRenderer.render;

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
const playerAssignmentUnitId = unitPersonnelRenderer.playerAssignmentUnitId;

const renderServiceCareer = createServiceCareerRenderer({
  elements: els,
  registries,
  selectServiceCareer,
  statLine,
  renderList,
  onAcceptOffer: offerId => runCommand(() => acceptReenlistmentOffer(store, registries, offerId)),
}).render;

const renderCareerRecord = createCareerRecordRenderer({
  elements: els,
  registries,
  statLine,
  progressRow,
  renderList,
  documentProfile,
  recordReference,
  metricBlock,
  statusStamp,
  onOpenPromotionProgress: () => {
    setSubscreen("career","records",{scroll:false});
    requestAnimationFrame(()=>{
      const top=Math.max(0,window.scrollY+els.promotionCard.getBoundingClientRect().top-150);
      window.scrollTo({top,behavior:"smooth"});
    });
  },
}).render;

const careerGameplayRenderer = createCareerGameplayRenderer({
  elements: els,
  registries,
  selectGameplay,
  selectSchoolCatalog,
  statusStamp,
  metricBlock,
  compactReference,
  progressRow,
  readUiArchive,
  archiveUiRecord,
  archiveUiRecords,
  createHistoryControls,
  careerHistoryPreviewLimit: CAREER_HISTORY_PREVIEW_LIMIT,
  unitTrainingPreviewLimit: UNIT_TRAINING_PREVIEW_LIMIT,
  situationFeedPreviewLimit: SITUATION_FEED_PREVIEW_LIMIT,
  onRender: () => render(),
  onShowDuty: id => resultDialog.showDuty(id),
  onShowActivity: id => resultDialog.showActivity(id),
  onAcceptOpportunity: id => runCommand(() => acceptCareerOpportunity(store, registries, id)),
  onDeclineOpportunity: id => runCommand(() => declineCareerOpportunity(store, registries, id)),
  onResolveDecision: (personId, decisionId, choiceId) => runCommand(() => resolveDecision(store, registries, personId, decisionId, choiceId)),
  onPerformActivity: (personId, activityId) => runCommand(() => performActivity(store, registries, personId, activityId)),
  onRequestSchool: schoolId => runCommand(() => requestSchoolOpportunity(store, registries, schoolId)),
});
const renderGameplay = careerGameplayRenderer.renderGameplay;
const renderSchoolCatalog = careerGameplayRenderer.renderSchoolCatalog;

const administrationRenderer = createAdministrationRenderer({
  elements: {
    administrationSummary: els.administrationSummary,
    replacementRequests: els.replacementRequests,
    personnelActions: els.personnelActions,
  },
  registries,
  selectPersonnelAdministration,
  renderList,
});
const renderAdministration = administrationRenderer.render;



function render() {
  const state = store.getState(), indexes = store.getIndexes(), validation = validateWorldState(state, registries), hasPlayer = Boolean(state.playerPersonId);
  els.newCareerPanel.hidden = hasPlayer; els.careerContent.hidden = !hasPlayer;
  if (!hasPlayer) { els.diagnostics.textContent = ""; if(els.persistentWorldContext) els.persistentWorldContext.textContent=""; return; }
  const squad = selectCurrentSquad(state, indexes, registries, state.playerPersonId), career = selectCareerRecord(state, indexes, registries, state.playerPersonId);
  const assignment = selectAssignmentView(state, indexes, registries, state.playerPersonId);
  renderSituation(state,indexes,state.playerPersonId);
  renderSoldierIdentity(state,indexes,state.playerPersonId,career);
  renderPersistentWorldContext(state);
  renderCareerRecord(state, career, assignment, squad);
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
