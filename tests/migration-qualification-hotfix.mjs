import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { performActivity } from "../src/commands/performActivity.js";
import { migratePayload } from "../src/core/migrations.js";
import { validateWorldState } from "../src/core/validator.js";
import { setTrainingPhaseInDraft } from "../src/services/careerGameplay.js";

function careerStore(seed=414001) {
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"QA",lastName:"Soldier",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}

// Schema-13 historical schedule records using the retired standard template must normalize,
// including completed/history rows that are intentionally not cleared by phase switching.
{
  const store=careerStore(413013);
  const legacy=structuredClone(store.getState());
  legacy.schemaVersion=13;
  legacy.gameVersion="0.4.1";
  legacy.world.scheduler.trainingPhaseId=null;
  legacy.world.scheduler.scheduleTemplateId="schedule_standard_training_cycle";
  const rows=Object.values(legacy.entities.scheduleRecords);
  assert.ok(rows.length>0);
  for(const row of rows){ row.sourceTemplateId="schedule_standard_training_cycle"; row.trainingPhaseId=null; }
  rows[0].status="completed";
  const migrated=migratePayload({saveFormatVersion:3,saveId:"schema13-schedule-template",createdAt:"2026-08-31T00:00:00.000Z",savedAt:"2026-08-31T00:00:00.000Z",gameVersion:"0.4.1",worldState:legacy});
  assert.equal(validateWorldState(migrated.worldState,registries).ok,true);
  for(const row of Object.values(migrated.worldState.entities.scheduleRecords)) assert.ok(registries.scheduleTemplates.has(row.sourceTemplateId),`${row.id}: invalid normalized template`);
  assert.equal(migrated.worldState.entities.scheduleRecords[rows[0].id].legacySourceTemplateId,"schedule_standard_training_cycle");
}

// Manual weapons qualification uses Army-style 40-target qualification scoring and creates
// a durable weapon-specific renewable record when the Soldier actually qualifies.
{
  const store=careerStore(414014);
  const personId=store.getState().playerPersonId;
  store.mutate(draft=>{
    setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true});
    const profile=draft.entities.skillProfiles[`skills_${personId}`];
    profile.values.skill_marksmanship=100;
    profile.values.skill_fieldcraft=100;
    const person=draft.entities.people[personId];
    person.condition.health=100; person.condition.morale=100; person.condition.readiness=100; person.condition.fatigue=0;
  },["people","activities","careerGameplay"]);
  const result=performActivity(store,registries,personId,"activity_range");
  assert.equal(result.ok,true);
  const record=store.getState().entities.activityRecords[result.data.activityRecordId];
  assert.ok(record.qualificationResult);
  assert.equal(record.qualificationResult.maxScore,40);
  assert.equal(record.qualificationResult.qualified,true);
  assert.ok(["marksman","sharpshooter","expert"].includes(record.qualificationResult.result));
  const qualification=Object.values(store.getState().entities.qualificationRecords).find(row=>row.personId===personId&&row.qualificationId==="qualification_service_rifle");
  assert.ok(qualification,"manual range qualification should create a durable record");
  assert.equal(qualification.maxScore,40);
  assert.equal(qualification.weaponDefinitionId,"weapon_service_rifle");
  assert.equal(qualification.badgeClasp,"RIFLE");
  assert.equal(qualification.sourceType,"player_activity");
  assert.equal(qualification.expiresElapsedDay,store.getState().world.clock.elapsedDays+365);
}

// A generic satisfactory AAR is not itself proof of Army weapons qualification. The weapon
// qualification result is independently recorded and can be UNQUALIFIED without creating a credential.
{
  const store=careerStore(414015);
  const personId=store.getState().playerPersonId;
  store.mutate(draft=>setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true}),["people","activities","careerGameplay"]);
  const result=performActivity(store,registries,personId,"activity_range");
  assert.equal(result.ok,true);
  const record=store.getState().entities.activityRecords[result.data.activityRecordId];
  assert.ok(record.qualificationResult);
  if(!record.qualificationResult.qualified){
    assert.equal(record.qualificationResult.result,"unqualified");
    assert.equal(Object.values(store.getState().entities.qualificationRecords).some(row=>row.personId===personId&&row.qualificationId==="qualification_service_rifle"),false);
  }
}

// Player-initiated collective squad drills must run through the same NPC participation engine
// as scheduled squad training and leave durable NPC performance history.
{
  const store=careerStore(414016);
  const personId=store.getState().playerPersonId;
  const squadId=store.getState().entities.people[personId].affiliation.unitId;
  const squadmateIds=Object.values(store.getState().entities.people).filter(p=>p.id!==personId&&p.affiliation.unitId===squadId).map(p=>p.id);
  assert.ok(squadmateIds.length>=8);
  store.mutate(draft=>setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true}),["people","activities","careerGameplay"]);
  const before=Object.values(store.getState().entities.performanceRecords).filter(r=>squadmateIds.includes(r.personId)&&r.sourceType==="unit_duty_participation").length;
  const result=performActivity(store,registries,personId,"activity_squad_drills");
  assert.equal(result.ok,true);
  const record=store.getState().entities.activityRecords[result.data.activityRecordId];
  assert.ok((record.participantPersonIds??[]).length>=9,"manual squad drills should include player and squadmates");
  const afterRows=Object.values(store.getState().entities.performanceRecords).filter(r=>squadmateIds.includes(r.personId)&&r.sourceType==="unit_duty_participation");
  assert.ok(afterRows.length>before,"manual squad drills should create NPC performance records");
  assert.ok(afterRows.some(r=>r.notes==="Participated in Squad Tactical Drills."));
}

console.log("War Sim v0.4.2.2 migration, qualification, and collective-activity QA passed");
