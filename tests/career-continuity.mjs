import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registries } from "../src/data/registries.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { updateCareerObjectivesInDraft } from "../src/services/careerGameplay.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { createEntityId } from "../src/core/ids.js";
import { addDaysIso } from "../src/services/dateMath.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
assert.equal(validateDefinitions(registries).ok,true);
assert.ok(registries.careerObjectives.values().some(def=>def.phase==="continuity"&&def.repeatable));
assert.ok(registries.trainingPhases.values().every(def=>typeof def.shortLabel==="string"&&def.shortLabel.length>0));
assert.ok(registries.simulationTiers.values().every(def=>typeof def.playerLabel==="string"&&def.playerLabel.length>0));

const store=createStateStore(createInitialWorldState({seed:412412}));
createPlayerCareer(store,registries,{firstName:"Continuity",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed:412412});
const personId=store.getState().playerPersonId;
let view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.equal(view.onboardingComplete,false);
assert.equal(view.objectives.length,4,"fresh careers should seed only onboarding objectives");
assert.ok(view.objectives.every(item=>item.phase==="onboarding"));

// Complete onboarding canonically at the record layer, then synchronize follow-on goals.
store.mutate(draft=>{
  const person=draft.entities.people[personId]; person.condition.readiness=90;
  const unit=draft.entities.units[person.affiliation.unitId]; unit.condition.readiness=90;
  for(const record of Object.values(draft.entities.objectiveRecords)) if(record.personId===personId){record.status="completed";record.completedDate=draft.world.date;}
  updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});
},["careerGameplay","people","units"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.equal(view.onboardingComplete,true);
assert.ok(view.activeObjectives.some(item=>item.definitionId==="objective_continuity_qualification"),"missing rifle qualification should create a continuity goal");
assert.ok(view.activeObjectives.some(item=>item.definitionId==="objective_continuity_promotion"),"not-yet-eligible player should receive a promotion-preparation goal");
assert.ok(view.objectiveHistory.some(item=>item.definitionId==="objective_report_unit"),"completed onboarding must remain archived history");

// A renewed qualification resolves its objective and should not instantly duplicate.
store.mutate(draft=>{
  const id=createEntityId(draft,"qual");
  draft.entities.qualificationRecords[id]={id,schemaVersion:2,personId,schoolId:null,qualificationId:"qualification_service_rifle",completedDate:draft.world.date,result:"marksman",expiresElapsedDay:draft.world.clock.elapsedDays+180,expiresDate:addDaysIso(draft.world.date,180),sourceType:"qa",sourceId:null};
  updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});
},["careerGameplay","history"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.ok(!view.activeObjectives.some(item=>item.definitionId==="objective_continuity_qualification"));
const qualificationObjectiveCount=view.objectives.filter(item=>item.definitionId==="objective_continuity_qualification").length;
store.mutate(draft=>updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false}),["careerGameplay"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.equal(view.objectives.filter(item=>item.definitionId==="objective_continuity_qualification").length,qualificationObjectiveCount,"completed repeatable objective must respect cooldown/state and not duplicate immediately");

// Readiness continuity objectives are state-driven and repeat only after their cooldown.
store.mutate(draft=>{draft.entities.people[personId].condition.readiness=70;updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});},["careerGameplay","people"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.ok(view.activeObjectives.some(item=>item.definitionId==="objective_continuity_personal_readiness"));
store.mutate(draft=>{draft.entities.people[personId].condition.readiness=90;updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});},["careerGameplay","people"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.ok(!view.activeObjectives.some(item=>item.definitionId==="objective_continuity_personal_readiness"));
const readinessObjectiveCount=view.objectives.filter(item=>item.definitionId==="objective_continuity_personal_readiness").length;
store.mutate(draft=>{draft.entities.people[personId].condition.readiness=70;updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});},["careerGameplay","people"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.equal(view.objectives.filter(item=>item.definitionId==="objective_continuity_personal_readiness").length,readinessObjectiveCount,"readiness goal must not reactivate inside cooldown");
store.mutate(draft=>{draft.world.clock.elapsedDays+=22;draft.world.date=addDaysIso(draft.world.date,22);updateCareerObjectivesInDraft(draft,registries,personId,{promotionEligible:false});},["careerGameplay"]);
view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
assert.equal(view.objectives.filter(item=>item.definitionId==="objective_continuity_personal_readiness").length,readinessObjectiveCount+1,"readiness goal should be repeatable after cooldown when need returns");
assert.equal(validateWorldState(store.getState(),registries).ok,true);

const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const app=fs.readFileSync(path.join(root,"src/app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"src/ui/styles.css"),"utf8");
assert.match(html,/id="persistent-world-context"/);
assert.match(app,/formatMilitaryDate/);
assert.match(app,/NO IMMEDIATE CAREER ACTIONS REQUIRED/);
assert.match(app,/Completed Objective History/);
assert.match(app,/simulationTierLabel/);
assert.match(css,/\.persistent-world-context\s*\{/);
assert.match(css,/\.duty-history-row strong\s*\{[^}]*color:\s*var\(--text\)/s,"training result grades must have explicit readable contrast");
assert.match(css,/padding:\s*18px 0 calc\(100px \+ env\(safe-area-inset-bottom\)\)/,"content must preserve bottom navigation safe-area clearance");

console.log("War Sim v0.4.1.4 career continuity and mobile polish QA passed");
