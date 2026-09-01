import assert from "node:assert/strict";
import fs from "node:fs";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { evaluatePromotionEligibility } from "../src/services/careerRules.js";
import { evaluateCommendationAwardsInDraft } from "../src/services/awardProgression.js";

const root=new URL("../",import.meta.url);
const appSource=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const personProfileSource=fs.readFileSync(new URL("../src/ui/dialogs/personProfile.js",import.meta.url),"utf8");
const relationshipsSource=fs.readFileSync(new URL("../src/ui/render/relationships.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

function makeCareer(seed=433101){
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"Mobile",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}

// Runtime/version and responsive DD214 containment.
{
  const state=createInitialWorldState({seed:433102});
  assert.equal(state.gameVersion,"0.4.3.9");
  assert.match(html,/War Sim v0\.4\.3\.9/);
  assert.match(css,/\.dd214-preview \.mil-metric>strong\{white-space:normal;overflow-wrap:anywhere/);
}

// Promotion progress exposes exact gates, including required PME/qualifications.
{
  const store=makeCareer(433103),personId=store.getState().playerPersonId;
  let promotion=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(Array.isArray(promotion.progress.requiredQualifications),true);
  store.mutate(draft=>{draft.entities.people[personId].affiliation.rankId="rank_army_e4";draft.entities.people[personId].career.experience=1600;draft.entities.people[personId].career.enlistmentDate="2040-01-01";draft.world.date="2046-02-10";},["people"]);
  promotion=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(promotion.nextRank.id,"rank_army_e5");
  assert.equal(promotion.progress.requiredQualifications.some(q=>q.id==="qualification_basic_leader"&&q.held===false),true);
  assert.match(appSource,/Promotion Progress|promotion-status-grid/);
}

// Relationship provenance exposes distinct trust/respect/rapport deltas.
{
  const store=makeCareer(433104),state=store.getState(),personId=state.playerPersonId;
  const relId=store.getIndexes().relationshipsByPersonId.get(personId)[0];
  const rel=state.entities.relationshipRecords[relId];
  const otherId=rel.personAId===personId?rel.personBId:rel.personAId;
  store.mutate(draft=>{
    draft.entities.relationshipRecords[relId].trust=3;
    draft.entities.relationshipRecords[relId].respect=-1;
    draft.entities.relationshipRecords[relId].rapport=7;
    draft.entities.relationshipMemoryRecords.mem_polish={id:"mem_polish",schemaVersion:1,personId,otherPersonId:otherId,type:"decision_interaction",summary:"Distinct relationship QA.",gameDate:draft.world.date,elapsedDay:draft.world.clock.elapsedDays,sourceType:"qa",sourceId:"qa",trustDelta:3,respectDelta:-1,rapportDelta:7};
  },["people","history"]);
  const view=selectCareerRecord(store.getState(),store.getIndexes(),registries,personId);
  const selected=view.relationships.find(r=>r.id===relId);
  assert.equal(selected.trust,3);assert.equal(selected.respect,-1);assert.equal(selected.rapport,7);
  assert.deepEqual([selected.memories[0].trustDelta,selected.memories[0].respectDelta,selected.memories[0].rapportDelta],[3,-1,7]);
  assert.match(relationshipsSource,/Math\.sqrt\(Math\.abs\(numeric\) \/ 100\) \* 50/);
}

// Tier-1 NPC personnel files get canonical rank insignia and a uniform action only for Tier 1 NPCs.
{
  assert.match(personProfileSource,/dog-tag-rank-insignia/);
  assert.match(personProfileSource,/person\.simulationTier === 1/);
  assert.match(personProfileSource,/uniformAction\.textContent = "View Uniform"/);
  assert.match(appSource,/selectSoldierIdentity\(state,indexes,registries,personId\)/);
}

// AAM remains sustained-performance driven and award reason is retained/exposed.
{
  const store=makeCareer(433105),personId=store.getState().playerPersonId;
  let created=[];
  store.mutate(draft=>{
    for(let i=0;i<8;i++) draft.entities.performanceRecords[`perf_polish_${i}`]={id:`perf_polish_${i}`,schemaVersion:1,personId,score:91,gameDate:draft.world.date,sourceType:"qa",sourceId:`qa_${i}`};
    created=evaluateCommendationAwardsInDraft(draft,registries,personId);
  },["history","notifications","people"]);
  assert.equal(created.some(x=>x.awardId==="award_army_achievement_medal"),true);
  const view=selectCareerRecord(store.getState(),store.getIndexes(),registries,personId);
  const aam=view.awards.find(a=>a.awardId==="award_army_achievement_medal");
  assert.equal(aam.reason,"Sustained excellent duty and training performance.");
  const notice=Object.values(store.getState().entities.notificationRecords).find(n=>n.references?.awardRecordId===aam.id);
  assert.match(notice.message,/Sustained excellent duty and training performance/);
  assert.match(appSource,/WHY EARNED/);
}

console.log("War Sim v0.4.3.9 on-device polish QA passed");
