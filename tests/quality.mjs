import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { buildIndexes } from "../src/indexes/buildIndexes.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { saveToSlot, loadFromSlot, listSaveSlots } from "../src/core/saveSystem.js";
import { performActivity } from "../src/commands/performActivity.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { migratePayload } from "../src/core/migrations.js";
import { markAllNotificationsRead, clearReadNotifications } from "../src/commands/manageNotifications.js";
import { selectNotifications } from "../src/selectors/selectNotifications.js";
import { acceptCareerOpportunity } from "../src/commands/careerOpportunities.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { calculateUnitReadiness } from "../src/services/unitReadiness.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const jsFiles = walk(srcRoot).filter(file => file.endsWith(".js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(srcRoot, "app.js"), "utf8");
const css = fs.readFileSync(path.join(srcRoot, "ui", "styles.css"), "utf8");

function advanceThroughDays(store, days) {
  let remaining = days;
  let guard = 0;
  while (remaining > 0) {
    if (++guard > days * 5 + 100) throw new Error("advanceThroughDays guard exceeded");
    const result = advanceWorldDays(store, remaining);
    remaining -= result.data.days;
    if (result.code === "time_interrupted") {
      const state = store.getState();
      const personId = state.playerPersonId;
      const decision = selectGameplay(state, store.getIndexes(), registries, personId).pendingDecisions[0];
      assert.ok(decision, "interrupted time must expose a pending decision");
      resolveDecision(store, registries, personId, decision.id, decision.choices[0].id);
    }
  }
}

// Import graph integrity: every relative static import resolves.
for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(file), match[1]);
    assert.ok(fs.existsSync(resolved), `${path.relative(root,file)} has unresolved import ${match[1]}`);
  }
}

// DOM integrity and accessibility basics.
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "index.html must not contain duplicate IDs");
for (const id of [...app.matchAll(/\$\("#([^"]+)"\)/g)].map(m => m[1])) assert.ok(ids.includes(id), `app.js requires missing DOM id #${id}`);
assert.match(html, /viewport-fit=cover/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /aria-current="page"/);
assert.equal([...html.matchAll(/class="game-view" data-view=/g)].length, 5);
assert.ok(ids.includes("return-my-unit") && ids.includes("view-selected-personnel") && ids.includes("personnel-my-unit"), "unit/personnel scope controls must exist");
assert.ok(ids.includes("person-dog-tag"), "personnel identification plate must exist");
assert.ok(ids.includes("situation-strip"), "persistent Current Situation display must exist");
assert.ok(ids.includes("person-profile-ref") && ids.includes("person-profile-breadcrumbs"), "personnel file reference and cross-navigation breadcrumbs must exist");
assert.ok(ids.includes("result-reference"), "AAR/SITREP reference display must exist");
assert.ok([...html.matchAll(/data-persist-key=/g)].length >= 4, "major disclosures should support remembered UI state");
assert.ok(ids.includes("nav-career-badge"), "Career navigation attention badge must exist");
assert.match(html, /Squad Connections/, "relationship presentation heading must be present");
assert.match(app, /selectedOrganizationUnitId/, "Unit view must own organization selection state");
assert.match(app, /personnelFilterUnitId/, "Personnel view must own independent filter state");
assert.doesNotMatch(app, /selectedUnitId/, "legacy shared Unit/Personnel selection state must not return");
assert.match(app, /renderUnitRoster\(state, indexes, selectedOrganizationUnitId\)/, "Unit roster must follow selected organization scope");
assert.match(app, /summaryItems/, "time-advance UI must consume semantic summary items");
assert.doesNotMatch(app, /action Records|actionRecords:\s*\+/, "player-facing time summary must not leak raw record collection names");
assert.match(app, /statusTimer/, "transient status feedback must replace persistent page messages");
assert.match(app, /relationshipBand/, "relationship presentation must use definition-driven bands");
assert.match(app, /performanceProfile/, "AAR performance presentation must use definition-driven profiles");
assert.match(app, /statusProfile/, "status presentation must resolve through definitions");
assert.match(app, /documentProfile/, "document presentation must resolve through definitions");
assert.match(app, /recordReference/, "human-readable military record references must derive from canonical IDs");
assert.doesNotMatch(html + app + css, /DEPARTMENT OF THE ARMY|US ARMY/i, "visual shell must not hardcode a specific service branch");
assert.match(app, /initializeDisclosureState/, "disclosure preferences must remain presentation-only local UI state");
assert.match(app, /setActiveView\("unit"\)/, "personnel/order cross-navigation must be able to open Unit view explicitly");

// Security / containment hygiene: no eval-style execution, document.write, or HTML injection in runtime UI.
for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/, `${path.relative(root,file)} contains dynamic code execution`);
  assert.doesNotMatch(source, /\.innerHTML\s*=/, `${path.relative(root,file)} should use DOM text APIs instead of innerHTML assignment`);
  assert.doesNotMatch(source, /Math\.random\s*\(/, `${path.relative(root,file)} bypasses deterministic RNG`);
}
assert.match(app, /function safeRender\(/, "top-level UI render containment is required");
assert.match(css, /prefers-reduced-motion/, "motion polish must respect reduced-motion preferences");
assert.match(css, /safe-area-inset-bottom/, "mobile fixed controls must respect safe-area insets");
assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length, "CSS braces must remain balanced");

// Runtime architecture must not know concrete Army/11B/rank/weapon IDs. Data and legacy migration code may.
const runtimeFiles = jsFiles.filter(file => !file.includes(`${path.sep}data${path.sep}`) && !file.endsWith(`${path.sep}core${path.sep}migrations.js`) && !file.endsWith(`${path.sep}services${path.sep}organizationSeed.js`));
const forbiddenConcreteIds = /branch_army|specialty_army_11b|rank_army_[eo]\d|weapon_service_rifle|billet_automatic_rifleman/;
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, forbiddenConcreteIds, `${path.relative(root,file)} contains concrete content IDs that belong in definitions/profiles`);
}

// Selector efficiency guard: hot UI selectors must not scan the entire people collection.
for (const file of walk(path.join(srcRoot, "selectors")).filter(file => file.endsWith(".js"))) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /Object\.values\(state\.entities\.people/, `${path.relative(root,file)} performs a global people scan instead of using indexes`);
}
for (const relative of ["commands/manageNotifications.js","commands/awardQualification.js","commands/reenlistment.js","commands/createPlayerCareer.js","commands/assignPerson.js"]) {
  const source = fs.readFileSync(path.join(srcRoot, relative), "utf8");
  assert.doesNotMatch(source, /Object\.values\(state\.entities\.(?:notificationRecords|qualificationRecords|reenlistmentOfferRecords|billets)/, `${relative} should use derived indexes for scoped lookup paths`);
}

// Definition and generated-world integrity across a broader seed sweep than smoke tests.
const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));
for (let seed=1001; seed<=1300; seed++) {
  const world = createInitialWorldState({ seed });
  const validation = validateWorldState(world, registries);
  assert.equal(validation.ok, true, `seed ${seed}: ${validation.errors.join(" | ")}`);
  assert.equal(Object.keys(world.entities.billets).length, 91);
  assert.equal(Object.keys(world.entities.people).length, 90);
}

// v0.4 core gameplay integrity: registry-driven skills/activities and deterministic activity outcomes.
assert.equal(registries.skills.size, 5);
assert.ok(registries.activities.size >= 5);
assert.ok(registries.gameplayEvents.size >= 4);
assert.ok(registries.eventTables.size >= 3);
assert.equal(registries.feedbackPresentations.size, 3);
assert.equal(registries.performanceRatings.size, 4);
assert.equal(registries.relationshipBands.size, 5);
assert.ok(registries.statusPresentations.size >= 20, "standard military/personnel statuses need presentation definitions");
assert.equal(registries.documentPresentations.size, 7, "military document types must be registry-driven");
for (const requiredStatus of ["active","training","deployed","wounded","missing","pow","separated","retired","deceased","executed","pending"]) assert.ok(registries.statusPresentations.has(requiredStatus), `missing status presentation ${requiredStatus}`);
for (const requiredDoc of ["personnel_file","order","aar","notification","service_record","unit_status","career_record"]) assert.ok(registries.documentPresentations.has(requiredDoc), `missing document presentation ${requiredDoc}`);
for (const activity of registries.activities.values()) assert.ok(registries.feedbackPresentations.has(activity.presentationId), `${activity.id} missing feedback presentation`);
for (const event of registries.gameplayEvents.values()) assert.ok(registries.feedbackPresentations.has(event.presentationId), `${event.id} missing feedback presentation`);
{
  const seed = 404040;
  const a = createStateStore(createInitialWorldState({ seed }));
  const b = createStateStore(createInitialWorldState({ seed }));
  const input = { firstName:"Deterministic", lastName:"Activity", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed };
  createPlayerCareer(a, registries, input); createPlayerCareer(b, registries, input);
  performActivity(a, registries, a.getState().playerPersonId, "activity_pt"); performActivity(b, registries, b.getState().playerPersonId, "activity_pt");
  assert.deepEqual(a.getState(), b.getState(), "identical seeds + identical activities must remain deterministic");
  const gameplay = selectGameplay(a.getState(), a.getIndexes(), registries, a.getState().playerPersonId);
  assert.equal(gameplay.recentActivities.length, 1);
  assert.ok(gameplay.skills.find(x=>x.id==="skill_fitness").value > 35);
  assert.equal(validateWorldState(a.getState(), registries).ok, true);
}


// v0.4.2.1 soldier/unit gameplay: scheduler, readiness, objectives, opportunities, conflicts, recovery, and authority definitions.
{
  assert.ok(registries.duties.size >= 6, "duty definitions must drive the unit training cycle");
  assert.ok(registries.scheduleTemplates.size >= 1, "schedule templates must be registry driven");
  assert.ok(registries.readinessModels.size >= 1, "readiness models must be registry driven");
  assert.ok(registries.opportunities.size >= 2, "career opportunities must be registry driven");
  assert.ok(registries.careerObjectives.size >= 4, "career objectives must be registry driven");
  assert.ok(registries.authorities.size >= 3, "billet command authorities must be registry driven");

  const seed = 741041;
  const gameStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(gameStore, registries, { firstName:"Gameplay", lastName:"QA", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = gameStore.getState().playerPersonId;
  let view = selectGameplay(gameStore.getState(), gameStore.getIndexes(), registries, personId);
  assert.ok(view.upcomingSchedule.length > 0, "new careers need an upcoming unit schedule");
  assert.equal(Object.keys(gameStore.getState().entities.objectiveRecords).length, registries.careerObjectives.values().filter(def => def.phase === "onboarding").length);
  assert.equal(Object.keys(gameStore.getState().entities.unitTrainingProfiles).length, Object.keys(gameStore.getState().entities.units).length);
  assert.ok(view.objectives.some(x => x.definitionId === "objective_report_unit" && x.status === "completed"));
  assert.equal(view.authorityIds.length, 0, "starting rifleman billet must not receive command authority");

  const unitId = gameStore.getState().entities.people[personId].affiliation.unitId;
  const beforeReadiness = calculateUnitReadiness(gameStore.getState(), gameStore.getIndexes(), registries, unitId);
  for (const value of Object.values(beforeReadiness.components)) assert.ok(value >= 0 && value <= 100, "readiness components must remain bounded");
  const beforeTraining = structuredClone(gameStore.getState().entities.unitTrainingProfiles[`unit_training_${unitId}`].values);
  const beforeFatigue = gameStore.getState().entities.people[personId].condition.fatigue;
  performActivity(gameStore, registries, personId, "activity_pt");
  const afterPt = gameStore.getState();
  assert.ok(afterPt.entities.people[personId].condition.fatigue > beforeFatigue, "PT must create fatigue");
  assert.equal(afterPt.entities.unitTrainingProfiles[`unit_training_${unitId}`].values.physical, beforeTraining.physical, "solo PT must not directly change collective unit-training proficiency");
  view = selectGameplay(afterPt, gameStore.getIndexes(), registries, personId);
  assert.ok(view.objectives.some(x => x.definitionId === "objective_complete_training" && x.status === "completed"), "training objective should complete from real activity history");

  const fatigueAfterPt = afterPt.entities.people[personId].condition.fatigue;
  performActivity(gameStore, registries, personId, "activity_recovery");
  assert.ok(gameStore.getState().entities.people[personId].condition.fatigue < fatigueAfterPt, "recovery must reduce fatigue");

  // Routine background PT is a non-blocking duty slice and must not grey out unrelated focused training.
  view = selectGameplay(gameStore.getState(), gameStore.getIndexes(), registries, personId);
  const range = view.activities.find(x => x.id === "activity_range");
  assert.notEqual(range.availabilityState, "scheduled", "routine PT must not create a full-day schedule conflict");
  assert.ok(view.routineSchedule.some(x => x.dutyDefinitionId === "duty_pt" && x.blocksFocusedActivities === false), "routine PT must be surfaced as non-blocking background duty");

  // Process through the Airborne eligibility threshold, resolving any generated player decisions deterministically.
  advanceThroughDays(gameStore, 43); // already consumed two activity days => world day 45
  view = selectGameplay(gameStore.getState(), gameStore.getIndexes(), registries, personId);
  const airborne = view.opportunities.find(x => x.definitionId === "opportunity_airborne_school" && x.status === "open");
  assert.ok(airborne, "eligible Airborne opportunity must be generated by time progression");
  const accepted = acceptCareerOpportunity(gameStore, registries, airborne.id);
  assert.equal(accepted.ok, true);
  const acceptedRecord = gameStore.getState().entities.opportunityRecords[airborne.id];
  assert.equal(acceptedRecord.status, "accepted");
  assert.ok(acceptedRecord.orderId && gameStore.getState().entities.orderRecords[acceptedRecord.orderId], "accepting an opportunity must generate canonical orders");
  assert.equal(gameStore.getState().entities.orderRecords[acceptedRecord.orderId].status, "pending");

  const daysToSchoolCompletion = acceptedRecord.completeElapsedDay - gameStore.getState().world.clock.elapsedDays;
  advanceThroughDays(gameStore, daysToSchoolCompletion);
  assert.equal(gameStore.getState().entities.opportunityRecords[airborne.id].status, "completed");
  assert.equal(gameStore.getState().entities.orderRecords[acceptedRecord.orderId].status, "completed");
  assert.ok(Object.values(gameStore.getState().entities.qualificationRecords).some(r => r.personId === personId && r.schoolId === "school_airborne"), "scheduled school completion must award its qualification");
  assert.equal(validateWorldState(gameStore.getState(), registries).ok, true);
}

// Direct v0.4.0.3 schema-12 migration preserves the career and layers in v0.4.2.1 gameplay records.
{
  const seed = 404003;
  const old = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(old, registries, { firstName:"Visual", lastName:"Baseline", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  performActivity(old, registries, old.getState().playerPersonId, "activity_pt");
  const legacy = structuredClone(old.getState());
  const personId = legacy.playerPersonId;
  const unitId = legacy.entities.people[personId].affiliation.unitId;
  const name = legacy.entities.people[personId].identity.displayName;
  const contractId = legacy.entities.serviceRecords[legacy.entities.people[personId].serviceRecordId].currentContractId;
  legacy.schemaVersion = 12; legacy.gameVersion = "0.4.0.3";
  delete legacy.world.scheduler;
  for (const storeName of ["unitTrainingProfiles","scheduleRecords","opportunityRecords","objectiveRecords"]) delete legacy.entities[storeName];
  for (const unit of Object.values(legacy.entities.units)) delete unit.readinessModelId;
  const migrated = migratePayload({ saveFormatVersion:3, saveId:"schema12-visual", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.4.0.3", worldState:legacy });
  assert.equal(migrated.worldState.schemaVersion, 16);
  assert.equal(migrated.worldState.gameVersion, "0.4.3.1");
  assert.equal(migrated.worldState.entities.people[personId].identity.displayName, name);
  assert.equal(migrated.worldState.entities.people[personId].affiliation.unitId, unitId);
  assert.ok(migrated.worldState.entities.contractRecords[contractId], "active contract must survive schema-12 migration");
  assert.ok(Object.values(migrated.worldState.entities.scheduleRecords).some(r => r.personId === personId));
  assert.equal(Object.values(migrated.worldState.entities.objectiveRecords).filter(r => r.personId === personId).length, registries.careerObjectives.values().filter(def => def.phase === "onboarding").length);
  assert.equal(Object.keys(migrated.worldState.entities.unitTrainingProfiles).length, Object.keys(migrated.worldState.entities.units).length);
  assert.equal(validateWorldState(migrated.worldState, registries).ok, true);
}

// Current schema migration preserves v0.3.2.3 careers and adds skill profiles without regeneration.
{
  const legacy = createInitialWorldState({ seed: 606060 });
  legacy.schemaVersion = 11; legacy.gameVersion = "0.3.2.3";
  delete legacy.entities.skillProfiles; delete legacy.entities.activityRecords; delete legacy.entities.performanceRecords; delete legacy.entities.gameplayEventRecords;
  const beforeNames = Object.values(legacy.entities.people).map(p=>p.identity.displayName);
  const payload = migratePayload({ saveFormatVersion:3, saveId:"quality-legacy", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.3.2.3", worldState:legacy });
  assert.equal(payload.worldState.schemaVersion, 16);
  assert.equal(payload.worldState.gameVersion, "0.4.3.1");
  assert.deepEqual(Object.values(payload.worldState.entities.people).map(p=>p.identity.displayName), beforeNames);
  assert.equal(Object.keys(payload.worldState.entities.skillProfiles).length, Object.keys(payload.worldState.entities.people).length);
  assert.equal(validateWorldState(payload.worldState, registries).ok, true);
}

// v0.4.0.3 presentation-result integrity: human-readable time summary and indexed relationship metadata.
{
  const seed = 420042;
  const uiStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(uiStore, registries, { firstName:"Polish", lastName:"Check", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = uiStore.getState().playerPersonId;
  const result = advanceWorldDays(uiStore, 7);
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.data.summaryItems) && result.data.summaryItems.length >= 1);
  assert.ok(result.data.summaryItems.every(item => item.id && item.label && item.tone));
  assert.ok(result.data.summaryItems.some(item => /service time accrued/i.test(item.label)));
  assert.ok(result.data.summaryItems.every(item => !/Records|recordRecords|actionRecords/.test(item.label)), "time summary must be player-facing");
  const career = selectCareerRecord(uiStore.getState(), uiStore.getIndexes(), registries, personId);
  assert.ok(career.relationships.length > 0);
  assert.ok(career.relationships.every(rel => rel.otherRank && rel.otherRole && rel.otherStatus));
  assert.equal(validateWorldState(uiStore.getState(), registries).ok, true);
}

// Same-schema hotfix loads normalize the runtime game version without a schema bump.
{
  const current = createInitialWorldState({ seed: 909090 });
  current.gameVersion = "0.4.0.2";
  const migrated = migratePayload({ saveFormatVersion:3, saveId:"same-schema", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.4.0.2", worldState:current });
  assert.equal(migrated.worldState.schemaVersion, 16);
  assert.equal(migrated.worldState.gameVersion, "0.4.3.1");
}

// Notification clearing archives records, uses indexed scope, and keeps canonical history intact.
{
  const seed = 121212;
  const notificationStore = createStateStore(createInitialWorldState({ seed }));
  createPlayerCareer(notificationStore, registries, { firstName:"Notify", lastName:"Check", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed });
  const personId = notificationStore.getState().playerPersonId;
  const allBefore = selectNotifications(notificationStore.getState(), notificationStore.getIndexes(), personId, { includeArchived:true });
  assert.ok(allBefore.length >= 1);
  assert.equal(markAllNotificationsRead(notificationStore, personId).ok, true);
  const clearResult = clearReadNotifications(notificationStore, personId);
  assert.equal(clearResult.ok, true);
  assert.ok(clearResult.data.count >= 1);
  assert.equal(selectNotifications(notificationStore.getState(), notificationStore.getIndexes(), personId).length, 0);
  assert.equal(selectNotifications(notificationStore.getState(), notificationStore.getIndexes(), personId, { includeArchived:true }).length, allBefore.length);
}

// Browser-save round trip with an in-memory localStorage stand-in.
{
  const storage = new Map();
  globalThis.localStorage = {
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  };
  const saveStore = createStateStore(createInitialWorldState({ seed: 20260322 }));
  createPlayerCareer(saveStore, registries, { firstName:"Quality", lastName:"Check", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_4y", seed:20260322 });
  const meta = saveToSlot(saveStore.getState(), "slot_01");
  assert.equal(meta.characterName, "Quality Check");
  assert.ok(meta.specialtyId); assert.ok(meta.unitName);
  const loaded = loadFromSlot("slot_01");
  assert.deepEqual(loaded.worldState, saveStore.getState(), "save/load round trip must preserve canonical state");
  assert.equal(listSaveSlots().find(x=>x.slotId==="slot_01").empty, undefined);
  const rawKey = [...storage.keys()].find(k => k.endsWith("slot_01") && !k.includes("backup"));
  const corrupted = JSON.parse(storage.get(rawKey)); corrupted.worldState.world.date = "2099-01-01"; storage.set(rawKey, JSON.stringify(corrupted));
  assert.throws(() => loadFromSlot("slot_01"), /integrity check failed/i);
}

// Index scaling benchmark with 10k people: protects against accidental quadratic index construction.
const large = createInitialWorldState({ seed: 9999 });
const template = Object.values(large.entities.people)[0];
large.entities.people = {};
for (let i=0; i<10000; i++) {
  const id = `stress_person_${String(i).padStart(5,"0")}`;
  large.entities.people[id] = { ...structuredClone(template), id, identity:{...template.identity, displayName:`Stress Person ${i}`} };
}
const started = performance.now();
const indexes = buildIndexes(large);
const elapsedMs = performance.now() - started;
assert.equal(indexes.peopleByUnitId.get(template.affiliation.unitId).length, 10000);
assert.ok(elapsedMs < 2000, `10k-person index build unexpectedly slow: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  result:"PASS",
  sourceFiles:jsFiles.length,
  generatedWorldSeedsValidated:300,
  stressPeople:10000,
  indexBuildMs:Number(elapsedMs.toFixed(2)),
  primaryViews:5,
  deterministicRngAudit:true,
  concreteRuntimeIdAudit:true,
  domIntegrity:true,
  importGraphIntegrity:true,
  renderContainment:true,
  independentUnitPersonnelState:true,
  militaryPresentationDom:true,
  gameplayDefinitions:true,
  soldierUnitGameplayIntegration:true,
  canonicalScheduler:true,
  actionableOpportunityOrders:true,
  readinessModelIntegration:true,
  conflictAndRecoveryRules:true,
  authorityDefinitions:true,
  deterministicActivities:true,
  selectorIndexAudit:true,
  schema13Migration:true,
  directSchema12Migration:true,
  semanticTimeAdvanceSummary:true,
  transientStatusFeedback:true,
  relationshipPresentationDefinitions:true,
  performancePresentationDefinitions:true,
  reducedMotionSupport:true,
  indexedScopedCommandLookups:true,
  archivedNotificationHistory:true,
  sameSchemaHotfixVersionNormalization:true,
  militaryStatusPresentationDefinitions:true,
  militaryDocumentPresentationDefinitions:true,
  stableRecordReferences:true,
  currentSituationDisplay:true,
  personnelUnitCrossNavigation:true,
  rememberedDisclosureUiState:true
}, null, 2));
