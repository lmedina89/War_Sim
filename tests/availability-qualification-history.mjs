import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { recordDutyQualification } from "../src/services/livingUnit.js";
import { completeSchoolInDraft } from "../src/services/schoolCompletion.js";
import { processScheduledDutyForDay } from "../src/services/careerGameplay.js";

function careerStore(seed=415001){ const store=createStateStore(createInitialWorldState({seed})); assert.equal(createPlayerCareer(store,registries,{firstName:"QA",lastName:"Availability",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed}).ok,true); return store; }

// Every weapons attempt is historical, but a worse still-current reattempt cannot erase a better active credential.
{
 const store=careerStore(415011), personId=store.getState().playerPersonId, duty=registries.duties.get("duty_range");
 store.mutate(draft=>{
   const first=recordDutyQualification(draft,registries,personId,duty,100,{sourceType:"qa",sourceId:"first"});
   assert.equal(first.result,"expert");
   const second=recordDutyQualification(draft,registries,personId,duty,75,{sourceType:"qa",sourceId:"second"});
   assert.equal(second.activeCredentialUpdated,false);
   assert.equal(second.retainedResult,"expert");
 },["career"]);
 const state=store.getState();
 const credential=Object.values(state.entities.qualificationRecords).find(r=>r.personId===personId&&r.qualificationId==="qualification_service_rifle");
 assert.equal(credential.result,"expert"); assert.equal(credential.score,40);
 const attempts=Object.values(state.entities.qualificationAttemptRecords??{}).filter(r=>r.personId===personId&&r.qualificationId==="qualification_service_rifle");
 assert.equal(attempts.length,2); assert.ok(attempts.some(r=>r.score===30));
}

// Schools apply definition-driven development effects as well as credentials/awards.
{
 const store=careerStore(415012), personId=store.getState().playerPersonId;
 const before=structuredClone(store.getState().entities.skillProfiles[`skills_${personId}`].values);
 store.mutate(draft=>completeSchoolInDraft(draft,registries,personId,"school_airborne",{sourceType:"qa"}),["career","people"]);
 const after=store.getState().entities.skillProfiles[`skills_${personId}`].values;
 assert.equal(after.skill_fitness,before.skill_fitness+2); assert.equal(after.skill_fieldcraft,before.skill_fieldcraft+2);
}

// A Soldier away at military school does not simultaneously receive player effects/credit from home-station unit training; the unit/NPCs can still train.
{
 const store=careerStore(415013), state=store.getState(), personId=state.playerPersonId, person=state.entities.people[personId], unitId=person.affiliation.unitId;
 const scheduleId="qa_school_conflict_schedule"; const oppId="qa_school_absence";
 const xpBefore=person.career.experience;
 store.mutate(draft=>{
   draft.entities.opportunityRecords[oppId]={id:oppId,schemaVersion:1,personId,definitionId:"opportunity_airborne_school",status:"in_progress",reportElapsedDay:draft.world.clock.elapsedDays-2,completeElapsedDay:draft.world.clock.elapsedDays+2};
   draft.entities.people[personId].condition.status="training";
   draft.entities.scheduleRecords[scheduleId]={id:scheduleId,schemaVersion:2,personId,unitId,dutyDefinitionId:"duty_squad_drills",status:"in_progress",startElapsedDay:draft.world.clock.elapsedDays-1,endElapsedDay:draft.world.clock.elapsedDays,startDate:draft.world.date,endDate:draft.world.date,calendarVisibility:"significant",significance:"routine"};
   const billetIds=Object.values(draft.entities.billets).filter(b=>b.unitId===unitId).map(b=>b.id);
   const personIds=billetIds.map(id=>draft.entities.billets[id].assignedPersonId).filter(Boolean);
   processScheduledDutyForDay(draft,registries,[scheduleId],{personId,billetIds,personIds});
 },["careerGameplay","people","units"]);
 const after=store.getState(), row=after.entities.scheduleRecords[scheduleId];
 assert.equal(row.playerAbsent,true); assert.equal(row.playerAbsenceReason,"military_school");
 assert.equal(after.entities.people[personId].career.experience,xpBefore);
 assert.equal(row.participantPersonIds.includes(personId),false);
 assert.ok(row.participantPersonIds.length>0,"home unit should still train without the Soldier away at school");
 assert.equal(Object.values(after.entities.performanceRecords).some(r=>r.personId===personId&&r.sourceId===scheduleId),false);
}
console.log("War Sim v0.4.2.2 availability, qualification-history, and school-effects QA passed");
