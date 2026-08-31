import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";

const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

assert.match(html,/v0\.4\.2/);
assert.match(html,/data-persist-key="career-activities"/,"activities should be collapsible on long career pages");
assert.match(app,/CAREER_HISTORY_PREVIEW_LIMIT\s*=\s*5/);
assert.match(app,/UNIT_TRAINING_PREVIEW_LIMIT\s*=\s*4/);
assert.match(app,/war-sim:ui:archive:/,"history archive state must remain presentation-only local UI state");
assert.match(app,/Restore Archived/);
assert.match(app,/Open Opportunity/);
assert.match(app,/career_opportunity/,"major school opportunities should enter the popup queue");
assert.match(app,/openOpportunityRecord/);
assert.match(app,/pt-summary:/,"routine PT should be summarized instead of flooding recent unit training");
assert.match(css,/100dvh/,"mobile dialogs should be bounded by the dynamic viewport");
assert.match(css,/overflow-wrap:anywhere/,"long military labels should wrap instead of spill");
assert.match(css,/\.current-duty-card\{grid-template-columns:1fr\}/,"current duty must stack at narrow widths");
assert.match(css,/\.modal-card>\.panel-head\{position:sticky/,"modal close controls should stay reachable during long AARs");

const store=createStateStore(createInitialWorldState({seed:417001}));
createPlayerCareer(store,registries,{firstName:"Mobile",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_3y",seed:417001});
const personId=store.getState().playerPersonId;
// Advance until the first school opportunity is eligible. Notification must retain a concrete opportunity reference.
advanceWorldDays(store,50);
const state=store.getState();
const opportunityNotices=Object.values(state.entities.notificationRecords).filter(n=>n.personId===personId && n.type==="career_opportunity");
assert.ok(opportunityNotices.length>=1,"eligible school opportunity should generate a high-visibility dispatch");
for(const notice of opportunityNotices){assert.ok(notice.references?.opportunityRecordId);assert.ok(state.entities.opportunityRecords[notice.references.opportunityRecordId]);}
const view=selectGameplay(state,store.getIndexes(),registries,personId);
assert.ok(Array.isArray(view.recentActivities));
assert.ok(Array.isArray(view.recentDuties));
console.log("War Sim v0.4.2 mobile UX and career-page consolidation QA passed");
