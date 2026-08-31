import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { setTrainingPhaseInDraft, ensureScheduleCoverageInDraft } from "../src/services/careerGameplay.js";
import { validateWorldState } from "../src/core/validator.js";

function newStore(seed=9876) {
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"Living",lastName:"Unit",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}
function advanceResolving(store,days){
  let remaining=days, guard=0;
  while(remaining>0){
    if(++guard>days*5+100) throw new Error("advance guard exceeded");
    const result=advanceWorldDays(store,remaining);
    assert.equal(result.ok,true);
    remaining-=result.data.days;
    if(result.code==="time_interrupted"){
      const personId=store.getState().playerPersonId;
      const decision=selectGameplay(store.getState(),store.getIndexes(),registries,personId).pendingDecisions[0];
      assert.ok(decision,"interrupted advance must expose a decision");
      assert.equal(resolveDecision(store,registries,personId,decision.id,decision.choices[0].id).ok,true);
    }
  }
}
function dayOfWeek(iso){ return new Date(`${iso}T00:00:00Z`).getUTCDay(); }

assert.equal(registries.trainingPhases.size,5,"five data-driven training phases required");
for(const id of ["training_phase_garrison","training_phase_elevated","training_phase_predeployment","training_phase_reset","training_phase_operational"]) assert.ok(registries.trainingPhases.has(id));

const store=newStore();
let state=store.getState(), personId=state.playerPersonId, unitId=state.entities.people[personId].affiliation.unitId;
let gameplay=selectGameplay(state,store.getIndexes(),registries,personId);
assert.equal(gameplay.trainingPhase.id,"training_phase_garrison","new careers must default to garrison tempo");
assert.equal(state.world.scheduler.scheduleTemplateId,"schedule_garrison_cycle");
assert.ok(gameplay.upcomingSchedule.length>=2,"garrison should still expose meaningful major events");
assert.ok(gameplay.upcomingSchedule.every(r=>r.calendarVisibility!=="background"),"routine background PT must not crowd the visible schedule");
const visibleStarts=gameplay.upcomingSchedule.slice(0,3).map(r=>r.startElapsedDay);
for(let i=1;i<visibleStarts.length;i++) assert.ok(visibleStarts[i]-visibleStarts[i-1]>=14,"normal garrison major events should not be back-to-back");
const allSchedule=(store.getIndexes().scheduleRecordsByPersonId.get(personId)??[]).map(id=>state.entities.scheduleRecords[id]).filter(r=>r.status==="scheduled");
assert.ok(allSchedule.some(r=>r.dutyDefinitionId==="duty_pt"&&r.calendarVisibility==="background"),"routine PT must still be simulated in the background");
for(const record of allSchedule){
  const template=registries.scheduleTemplates.get(record.sourceTemplateId);
  const entry=template?.entries.find(e=>e.dutyDefinitionId===record.dutyDefinitionId);
  if(entry?.weekdayOnly) assert.ok([1,2,3,4,5].includes(dayOfWeek(record.startDate)),`${record.id} should start on a weekday`);
}

const playerUnitPeople=Object.values(state.entities.people).filter(p=>p.affiliation?.unitId===unitId);
const npc=playerUnitPeople.find(p=>p.id!==personId);
assert.ok(npc && npc.simulationTier===1,"immediate squad NPCs must use detailed simulation tier 1");
const otherCompanyNpc=Object.values(state.entities.people).find(p=>p.id!==personId&&p.affiliation?.unitId!==unitId&&p.simulationTier===2);
assert.ok(otherCompanyNpc,"less-immediate company personnel should remain on coarser tier 2");
const npcXpBefore=npc.career.experience;
advanceResolving(store,50);
state=store.getState(); gameplay=selectGameplay(state,store.getIndexes(),registries,personId);
assert.ok(state.entities.people[npc.id].career.experience>npcXpBefore,"NPC career experience must continue while time advances");
assert.ok(Object.values(state.entities.performanceRecords).some(r=>r.personId===npc.id&&r.sourceType==="unit_duty_participation"),"squad NPCs must receive durable unit-duty participation records");
const rangeRecord=Object.values(state.entities.scheduleRecords).find(r=>r.personId===personId&&r.dutyDefinitionId==="duty_range"&&r.status==="completed");
assert.ok(rangeRecord,"garrison weapons qualification should eventually complete");
assert.ok((rangeRecord.participantPersonIds??[]).length>=8,"unit qualification should include eligible squad NPC participants");
const playerQual=Object.values(state.entities.qualificationRecords).find(r=>r.personId===personId&&r.qualificationId==="qualification_service_rifle"&&r.sourceType==="scheduled_duty");
assert.ok(playerQual,"successful scheduled qualification must create/renew a durable qualification record");
assert.ok(Number.isInteger(playerQual.expiresElapsedDay)&&playerQual.expiresElapsedDay>state.world.clock.elapsedDays,"renewable qualification must have a future expiry");
assert.ok(["expert","sharpshooter","marksman"].includes(playerQual.result));
assert.ok(Object.values(state.entities.unitEventRecords).some(r=>r.unitId===unitId&&r.type==="training_completed"),"significant unit training must create durable unit history");
assert.ok(Object.values(state.entities.unitReadinessSnapshots).some(r=>r.unitId===unitId),"unit readiness snapshots must be durable");
assert.equal(validateWorldState(state,registries).ok,true);

// Changing phase is data-driven and clears/replans only future template records.
store.mutate(draft=>{
  setTrainingPhaseInDraft(draft,registries,"training_phase_predeployment",{clearFutureTemplateRecords:true});
  ensureScheduleCoverageInDraft(draft,registries,draft.playerPersonId,draft.entities.people[draft.playerPersonId].affiliation.unitId);
},["careerGameplay"]);
state=store.getState(); gameplay=selectGameplay(state,store.getIndexes(),registries,personId);
assert.equal(gameplay.trainingPhase.id,"training_phase_predeployment");
assert.equal(state.world.scheduler.scheduleTemplateId,"schedule_predeployment_cycle");
assert.ok(Object.values(state.entities.scheduleRecords).some(r=>r.status==="cancelled"&&r.cancellationReason==="training_phase_changed"),"phase changes must preserve cancelled schedule history instead of deleting records");
assert.ok(gameplay.upcomingSchedule.length>=3,"pre-deployment phase should create a denser significant-event schedule");
assert.equal(validateWorldState(state,registries).ok,true);

// A previously skipped need-aware occurrence must never be generated retroactively in the past.
const needStore=newStore(112233);
const needPid=needStore.getState().playerPersonId, needUid=needStore.getState().entities.people[needPid].affiliation.unitId;
advanceResolving(needStore,65);
needStore.mutate(draft=>{
  const profile=draft.entities.unitTrainingProfiles[`unit_training_${needUid}`];
  profile.values.equipmentReadiness=50;
  ensureScheduleCoverageInDraft(draft,registries,needPid,needUid);
},["careerGameplay"]);
const needState=needStore.getState();
for(const record of Object.values(needState.entities.scheduleRecords).filter(r=>r.status==="scheduled")) assert.ok(record.startElapsedDay>needState.world.clock.elapsedDays||record.status==="in_progress","scheduler must not create new scheduled duties in the past");
assert.equal(validateWorldState(needState,registries).ok,true);

console.log("War Sim v0.4.1.7 living-unit and training-tempo QA passed");
