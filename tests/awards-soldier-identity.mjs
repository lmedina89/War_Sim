import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { selectSoldierIdentity } from "../src/selectors/selectSoldierIdentity.js";
import { grantAwardInDraft, evaluateServiceAwardsInDraft } from "../src/services/awardProgression.js";
import { addDaysIso } from "../src/services/dateMath.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";

const definitions=validateDefinitions(registries);assert.equal(definitions.ok,true,definitions.errors.join(" | "));
assert.ok(registries.awards.size>=15,"v0.4.3.2 should include the expanded Army award/insignia catalog");
for(const award of registries.awards.values()){assert.ok(award.display?.iconId,`${award.id} must define an icon`);assert.ok(Number.isFinite(award.precedence));assert.ok(award.dd214Label);}

const store=createStateStore(createInitialWorldState({seed:430043}));
const result=createPlayerCareer(store,registries,{firstName:"Award",lastName:"Tester",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_3y",seed:430043});
const personId=result.data.personId;
let state=store.getState(), indexes=store.getIndexes();
assert.ok(Object.values(state.entities.awardRecords).some(r=>r.personId===personId&&r.awardId==="award_army_service_ribbon"),"new operational career should carry the Army Service Ribbon from completed IET");
let identity=selectSoldierIdentity(state,indexes,registries,personId);assert.equal(identity.ribbons.some(x=>x.awardId==="award_army_service_ribbon"),true);assert.ok(identity.combatProfile.overall>0);

store.mutate(draft=>{
  const qid="qual_test_expert";draft.entities.qualificationRecords[qid]={id:qid,schemaVersion:2,personId,qualificationId:"qualification_service_rifle",completedDate:draft.world.date,result:"expert",score:38,maxScore:40,badgeClasp:"RIFLE"};
  grantAwardInDraft(draft,registries,{personId,awardId:"award_parachutist_badge",sourceType:"test",sourceId:"school_test"});
  grantAwardInDraft(draft,registries,{personId,awardId:"award_army_achievement_medal",sourceType:"test",sourceId:"achievement_1"});
  grantAwardInDraft(draft,registries,{personId,awardId:"award_army_achievement_medal",sourceType:"test",sourceId:"achievement_2"});
},["history","notifications"]);
state=store.getState();indexes=store.getIndexes();identity=selectSoldierIdentity(state,indexes,registries,personId);
assert.equal(identity.rifleQualification.result,"expert");assert.equal(identity.badges.some(x=>x.awardId==="award_parachutist_badge"),true);assert.equal(identity.ribbons.find(x=>x.awardId==="award_army_achievement_medal")?.count,2,"repeat awards must collapse into one uniform item with a count/device");

store.mutate(draft=>{draft.world.date=addDaysIso(draft.entities.serviceRecords[draft.entities.people[personId].serviceRecordId].entryDate,1095);const created=evaluateServiceAwardsInDraft(draft,registries,personId);assert.equal(created.some(x=>x.awardId==="award_army_good_conduct_medal"),true);},["history","notifications"]);
assert.equal(Object.values(store.getState().entities.awardRecords).filter(r=>r.personId===personId&&r.awardId==="award_army_good_conduct_medal").length,1);
store.mutate(draft=>{evaluateServiceAwardsInDraft(draft,registries,personId);},["history","notifications"]);
assert.equal(Object.values(store.getState().entities.awardRecords).filter(r=>r.personId===personId&&r.awardId==="award_army_good_conduct_medal").length,1,"service award evaluation must be idempotent on the same date");

const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8"),insignia=fs.readFileSync(new URL("../src/ui/insignia.js",import.meta.url),"utf8"),html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(html,/id="soldier-identity"/);assert.match(app,/DD214-Style Preview/);assert.match(app,/renderSoldierIdentity/);assert.doesNotMatch(app,/\.innerHTML\s*=/);assert.doesNotMatch(insignia,/\.innerHTML\s*=/);assert.match(insignia,/badgeParachutist/);assert.match(insignia,/qualificationBadge/);
console.log("War Sim v0.4.3.2 awards, insignia, uniform, loadout, and service-record QA passed");
