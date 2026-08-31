import assert from "node:assert/strict";
import fs from "node:fs";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { performActivity } from "../src/commands/performActivity.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { resolveActivityEvent } from "../src/services/gameplayEvents.js";
import { setTrainingPhaseInDraft } from "../src/services/careerGameplay.js";

function careerStore(seed=416001){
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"QA",lastName:"Training",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}

// Routine PT is generated as weekday background duty, remains visible as context, and never blocks unrelated manual training.
{
  const store=careerStore(416011), state=store.getState(), personId=state.playerPersonId;
  const ptRows=Object.values(state.entities.scheduleRecords).filter(r=>r.personId===personId&&r.dutyDefinitionId==="duty_pt"&&r.status==="scheduled");
  assert.ok(ptRows.length>=20,"garrison should contain regular weekday PT in the planning horizon");
  assert.ok(ptRows.every(r=>r.calendarVisibility==="background"&&r.blocksFocusedActivities===false));
  assert.equal(new Set(ptRows.map(r=>r.startElapsedDay)).size,ptRows.length,"weekday PT generation must not stack duplicate rows onto Mondays");
  const view=selectGameplay(state,store.getIndexes(),registries,personId);
  assert.ok(view.routineSchedule.some(r=>r.dutyDefinitionId==="duty_pt"&&!r.blocksFocusedActivities));
  const range=view.activities.find(a=>a.id==="activity_range");
  assert.notEqual(range.availabilityState,"scheduled");
}

// A real significant mandatory duty still blocks an overlapping focused activity and exposes the exact duty/date.
{
  const store=careerStore(416012), personId=store.getState().playerPersonId;
  store.mutate(draft=>{
    const person=draft.entities.people[personId], start=draft.world.clock.elapsedDays+1;
    draft.entities.scheduleRecords.qa_major_conflict={id:"qa_major_conflict",schemaVersion:2,kind:"unit_duty",dutyDefinitionId:"duty_squad_drills",personId,unitId:person.affiliation.unitId,sourceTemplateId:"schedule_garrison_cycle",sourceType:"qa",trainingPhaseId:"training_phase_garrison",mandatory:true,calendarVisibility:"significant",blocksFocusedActivities:true,status:"scheduled",startElapsedDay:start,endElapsedDay:start+2,startDate:"2046-02-11",endDate:"2046-02-13"};
  },["careerGameplay"]);
  const view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
  const range=view.activities.find(a=>a.id==="activity_range");
  assert.equal(range.availabilityState,"scheduled");
  assert.ok(range.reasons.some(r=>r.includes("Squad Tactical Drills")&&r.includes("2046-02-11")));
  assert.throws(()=>performActivity(store,registries,personId,"activity_range"),/Squad Tactical Drills.*2046-02-11/i);
}

// Solo PT changes the Soldier, not collective training proficiency, and does not claim a causal unit-readiness delta in its AAR record.
{
  const store=careerStore(416013), personId=store.getState().playerPersonId, unitId=store.getState().entities.people[personId].affiliation.unitId;
  store.mutate(draft=>setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true}),["careerGameplay"]);
  const before=structuredClone(store.getState().entities.unitTrainingProfiles[`unit_training_${unitId}`].values);
  const result=performActivity(store,registries,personId,"activity_pt");
  assert.equal(result.ok,true);
  const state=store.getState(), record=state.entities.activityRecords[result.data.activityRecordId];
  assert.deepEqual(state.entities.unitTrainingProfiles[`unit_training_${unitId}`].values,before);
  assert.equal(Object.hasOwn(record.deltas,"unitReadiness"),false);
  assert.equal(Object.hasOwn(record.deltas,"unitCohesion"),false);
  assert.ok(record.deltas.readiness>0);
}

// Poor training cannot independently generate positive breakthrough/recognition feedback.
{
  for(let seed=416100;seed<416150;seed++){
    const draft=createInitialWorldState({seed});
    draft.entities.gameplayEventRecords={}; draft.entities.notificationRecords={};
    const out=resolveActivityEvent(draft,registries,{personId:null,unitId:null,activityId:"activity_mos_training",eventTableId:"event_table_training_light",performanceScore:47});
    assert.equal(out,null,"poor performance must not receive positive light-training feedback");
  }
}

// Qualification activity records and notifications lead with the actual /40 qualification result, not the generic /100 training grade.
{
  const store=careerStore(416014), personId=store.getState().playerPersonId;
  store.mutate(draft=>setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true}),["careerGameplay"]);
  const result=performActivity(store,registries,personId,"activity_range");
  const state=store.getState(), record=state.entities.activityRecords[result.data.activityRecordId];
  assert.ok(record.qualificationResult);
  const notice=state.entities.notificationRecords[result.notifications[0]];
  assert.ok(notice.message.includes(`${record.qualificationResult.label} ${record.qualificationResult.score}/${record.qualificationResult.maxScore}`));
  const perf=Object.values(state.entities.performanceRecords).find(r=>r.sourceId===record.id);
  assert.ok(perf.notes.includes(`${record.qualificationResult.label} ${record.qualificationResult.score}/${record.qualificationResult.maxScore}`));
  const ui=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
  assert.match(ui,/QUALIFICATION RESULT/); assert.match(ui,/TRAINING PERFORMANCE/);
}

console.log("War Sim v0.4.3.1 training results and schedule-clarity QA passed");
