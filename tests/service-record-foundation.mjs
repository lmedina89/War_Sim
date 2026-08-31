import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { requestSchoolOpportunity } from "../src/commands/requestSchool.js";
import { acceptCareerOpportunity } from "../src/commands/careerOpportunities.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { selectSchoolCatalog } from "../src/selectors/selectSchoolCatalog.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { validateWorldState } from "../src/core/validator.js";
import { migratePayload } from "../src/core/migrations.js";

function advanceResolving(store,days){
  let remaining=days;
  while(remaining>0){
    const result=advanceWorldDays(store,Math.min(remaining,30));
    remaining-=result.data.days;
    if(result.code==="time_interrupted"){
      // This suite avoids decision-heavy paths; fail loudly if one unexpectedly appears.
      throw new Error("Unexpected blocking decision during service-record foundation QA.");
    }
  }
}

// Fresh NPCs receive deterministic, rank-consistent prior-service records without touching the player slot.
{
  const a=createInitialWorldState({seed:420042});
  const b=createInitialWorldState({seed:420042});
  assert.deepEqual(a,b,"prior-service generation must be deterministic for the same seed");
  assert.equal(a.schemaVersion,16);
  const npcs=Object.values(a.entities.people);
  assert.ok(npcs.length>=80);
  assert.ok(Object.keys(a.entities.militaryEducationRecords).length>0,"experienced NPCs should seed military education");
  for(const npc of npcs){
    assert.ok(Object.values(a.entities.awardRecords).some(r=>r.personId===npc.id&&r.awardId==="award_army_service_ribbon"),`${npc.id} should have an Army Service Ribbon prior-service record`);
  }
  const ncos=npcs.filter(p=>registries.ranks.get(p.affiliation.rankId).category==="enlisted"&&registries.ranks.get(p.affiliation.rankId).hierarchyLevel>=5);
  assert.ok(ncos.length>0);
  for(const nco of ncos){
    assert.ok(Object.values(a.entities.militaryEducationRecords).some(r=>r.personId===nco.id&&r.schoolId==="school_leadership"&&r.status==="graduated"),`${nco.id} should have BLC history`);
    assert.ok(Object.values(a.entities.qualificationRecords).some(r=>r.personId===nco.id&&r.qualificationId==="qualification_basic_leader"),`${nco.id} should have BLC qualification`);
    assert.ok(Object.values(a.entities.awardRecords).some(r=>r.personId===nco.id&&r.awardId==="award_nco_professional_development_ribbon"),`${nco.id} should have NCOPD ribbon`);
  }
  assert.equal(validateWorldState(a,registries).ok,true);
}

// Career Development exposes locked reasons and can deliberately create a player-request opportunity.
{
  const seed=424242;
  const store=createStateStore(createInitialWorldState({seed}));
  createPlayerCareer(store,registries,{firstName:"Career",lastName:"Developer",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  const personId=store.getState().playerPersonId;
  let catalog=selectSchoolCatalog(store.getState(),store.getIndexes(),registries,personId);
  const airborne=catalog.find(item=>item.id==="school_airborne");
  assert.ok(airborne);
  assert.equal(airborne.eligible,false,"new Soldier should see Airborne locked until prerequisites are met");
  assert.ok(airborne.reasons.length>0,"locked school should explain why");

  store.mutate(draft=>{
    const p=draft.entities.people[personId];
    p.career.enlistmentDate="2045-01-01";
    p.condition.readiness=85;p.condition.health=100;p.condition.fatigue=0;
    draft.entities.skillProfiles[`skills_${personId}`].values.skill_fitness=55;
  },["people","activities"]);
  catalog=selectSchoolCatalog(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(catalog.find(item=>item.id==="school_airborne").requestable,true);
  const requested=requestSchoolOpportunity(store,registries,"school_airborne");
  assert.equal(requested.ok,true);
  const record=store.getState().entities.opportunityRecords[requested.data.opportunityRecordId];
  assert.equal(record.sourceType,"player_request");
  assert.equal(record.status,"open");
  assert.equal(acceptCareerOpportunity(store,registries,record.id).ok,true);
  const accepted=store.getState().entities.opportunityRecords[record.id];
  const daysToComplete=accepted.completeElapsedDay-store.getState().world.clock.elapsedDays;
  advanceResolving(store,daysToComplete);
  const career=selectCareerRecord(store.getState(),store.getIndexes(),registries,personId);
  assert.ok(career.education.some(item=>item.schoolId==="school_airborne"&&item.status==="graduated"));
  assert.ok(career.qualifications.some(item=>item.name==="Airborne Qualified"));
  assert.ok(career.awards.some(item=>item.awardId==="award_parachutist_badge"));
  assert.equal(validateWorldState(store.getState(),registries).ok,true);
}

// Schema-14 saves backfill military education from existing school qualification records and seed NPC histories.
{
  const seed=141500;
  const store=createStateStore(createInitialWorldState({seed}));
  createPlayerCareer(store,registries,{firstName:"Legacy",lastName:"Education",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  const legacy=structuredClone(store.getState());
  legacy.schemaVersion=14;legacy.gameVersion="0.4.1.8";
  delete legacy.entities.militaryEducationRecords;
  const playerId=legacy.playerPersonId;
  legacy.entities.qualificationRecords.qual_legacy_airborne={id:"qual_legacy_airborne",schemaVersion:1,personId:playerId,schoolId:"school_airborne",qualificationId:"qualification_airborne",completedDate:"2046-02-11",result:"graduate"};
  const migrated=migratePayload({saveFormatVersion:3,saveId:"schema14-service-record",createdAt:"2026-08-31T00:00:00.000Z",savedAt:"2026-08-31T00:00:00.000Z",gameVersion:"0.4.1.8",worldState:legacy});
  assert.equal(migrated.worldState.schemaVersion,16);
  assert.ok(Object.values(migrated.worldState.entities.militaryEducationRecords).some(r=>r.personId===playerId&&r.schoolId==="school_airborne"&&r.status==="graduated"));
  assert.equal(validateWorldState(migrated.worldState,registries).ok,true);
}

// Distribution sanity: Airborne prior history remains uncommon rather than decorating everyone.
{
  let total=0,airborne=0,senior=0,seniorBlank=0;
  for(let seed=1;seed<=200;seed++){
    const state=createInitialWorldState({seed});
    for(const person of Object.values(state.entities.people)){
      total++;
      if(Object.values(state.entities.qualificationRecords).some(r=>r.personId===person.id&&r.qualificationId==="qualification_airborne"))airborne++;
      const rank=registries.ranks.get(person.affiliation.rankId);
      if(rank.hierarchyLevel>=5){senior++;const records=Object.values(state.entities.militaryEducationRecords).filter(r=>r.personId===person.id).length+Object.values(state.entities.awardRecords).filter(r=>r.personId===person.id).length+Object.values(state.entities.qualificationRecords).filter(r=>r.personId===person.id).length;if(records===0)seniorBlank++;}
    }
  }
  assert.ok(airborne>0,"some prior-service Soldiers should plausibly be Airborne qualified");
  assert.ok(airborne/total<0.20,"Airborne prior history should remain uncommon in a conventional infantry company");
  assert.equal(seniorBlank,0,"experienced NCOs should not be blank service records");
}

console.log("War Sim v0.4.3.2 Army Service Record and Career Achievement foundation QA passed");
