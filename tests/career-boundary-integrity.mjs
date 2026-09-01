import assert from "node:assert/strict";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { promotePerson } from "../src/commands/promotePerson.js";
import { performActivity } from "../src/commands/performActivity.js";
import { generateReenlistmentOffers, acceptReenlistmentOffer } from "../src/commands/reenlistment.js";
import { separatePersonAdministrative, processPersonnelAdministration } from "../src/services/personnelAdministration.js";
import { evaluatePromotionEligibility } from "../src/services/careerRules.js";
import { contractCoverageThrough } from "../src/services/serviceLifecycle.js";
import { validateWorldState } from "../src/core/validator.js";
import { migratePayload } from "../src/core/migrations.js";
import { addDaysIso } from "../src/services/dateMath.js";

function career(seed=991122) {
  const store=createStateStore(createInitialWorldState({seed}));
  createPlayerCareer(store,registries,{firstName:"Boundary",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_3y",seed});
  const personId=store.getState().playerPersonId;
  const person=store.getState().entities.people[personId];
  const service=store.getState().entities.serviceRecords[person.serviceRecordId];
  const contract=store.getState().entities.contractRecords[service.currentContractId];
  return {store,personId,serviceId:service.id,contractId:contract.id};
}

// Terminal service status is a canonical promotion blocker, not just a UI concern.
{
  const {store,personId}=career(10001);
  store.mutate(draft=>{
    const person=draft.entities.people[personId];
    person.career.experience=1000;
    person.career.enlistmentDate=addDaysIso(draft.world.date,-365);
    separatePersonAdministrative(draft,personId,"ets");
  },["people","history","orders","notifications","career","admin"]);
  const eligibility=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(eligibility.eligible,false);
  assert.match(eligibility.reasons.join(" "),/separated/i);
  assert.throws(()=>promotePerson(store,registries,personId),/separated/i);
  assert.equal(store.getState().entities.people[personId].affiliation.rankId,"rank_army_e1");
  assert.equal(validateWorldState(store.getState(),registries).ok,true);
}

// Focused activity cannot cross ETS without continuous contractual service.
{
  const {store,personId,contractId}=career(10002);
  const endDate=store.getState().entities.contractRecords[contractId].endDate;
  store.mutate(draft=>{draft.world.date=addDaysIso(endDate,-1);},[]);
  assert.equal(contractCoverageThrough(store.getState(),personId,endDate).covered,false);
  const beforeAttempt=structuredClone(store.getState());
  const xpBefore=beforeAttempt.entities.people[personId].career.experience;
  assert.throws(()=>performActivity(store,registries,personId,"activity_recovery"),/ETS|contract expiration/i);
  assert.equal(store.getState().entities.people[personId].career.experience,xpBefore);
  assert.equal(store.getState().entities.people[personId].condition.status,"active");
  assert.deepEqual(store.getState(),beforeAttempt,"rejected boundary activity must not mutate schedule, time, history, or personnel state");
}

// A multi-day activity is blocked when any portion would extend through an uncovered ETS boundary.
{
  const {store,personId,contractId}=career(100021);
  const endDate=store.getState().entities.contractRecords[contractId].endDate;
  store.mutate(draft=>{draft.world.date=addDaysIso(endDate,-2);},[]);
  const beforeAttempt=structuredClone(store.getState());
  assert.throws(()=>performActivity(store,registries,personId,"activity_mos_training"),/ETS|contract expiration/i);
  assert.deepEqual(store.getState(),beforeAttempt);
  assert.equal(Object.values(store.getState().entities.activityRecords).some(record=>record.personId===personId&&record.activityDefinitionId==="activity_mos_training"),false);
}

// Accepted reenlistment remains pending until its effective date, preserves the old
// contract as current, accumulates the bonus, then rolls over without separation.
{
  const {store,personId,serviceId,contractId}=career(10003);
  const endDate=store.getState().entities.contractRecords[contractId].endDate;
  store.mutate(draft=>{draft.world.date=addDaysIso(endDate,-10);},[]);
  const bonusBefore=store.getState().entities.people[personId].career.bonusEarnings;
  const offers=generateReenlistmentOffers(store,registries,personId);
  const acceptedOffer=store.getState().entities.reenlistmentOfferRecords[offers.data.offerIds[0]];
  const result=acceptReenlistmentOffer(store,registries,acceptedOffer.id);
  const newId=result.data.contractId;
  let state=store.getState();
  assert.equal(state.entities.serviceRecords[serviceId].currentContractId,contractId);
  assert.equal(state.entities.contractRecords[contractId].status,"active");
  assert.equal(state.entities.contractRecords[newId].status,"pending");
  assert.equal(state.entities.people[personId].career.bonusEarnings,bonusBefore+acceptedOffer.bonus);
  assert.equal(contractCoverageThrough(state,personId,addDaysIso(endDate,2)).covered,true);
  const duplicateOfferAttempt=generateReenlistmentOffers(store,registries,personId);
  assert.equal(duplicateOfferAttempt.code,"reenlistment_already_accepted");
  assert.equal(validateWorldState(state,registries).ok,true);

  store.mutate(draft=>{draft.world.date=endDate;processPersonnelAdministration(draft,registries);},["people","billets","history","orders","notifications","career","admin"]);
  state=store.getState();
  assert.equal(state.entities.people[personId].condition.status,"active");
  assert.equal(state.entities.serviceRecords[serviceId].serviceStatus,"active");
  assert.equal(state.entities.serviceRecords[serviceId].currentContractId,newId);
  assert.equal(state.entities.contractRecords[contractId].status,"completed");
  assert.equal(state.entities.contractRecords[newId].status,"active");
  assert.equal(validateWorldState(state,registries).ok,true);
}


// A multi-day MOS activity may cross the original ETS only when the accepted
// successor contract supplies continuous service; completion must occur in-service.
{
  const {store,personId,serviceId,contractId}=career(20000);
  const endDate=store.getState().entities.contractRecords[contractId].endDate;
  store.mutate(draft=>{draft.world.date=addDaysIso(endDate,-1);},[]);
  const offers=generateReenlistmentOffers(store,registries,personId);
  const accepted=acceptReenlistmentOffer(store,registries,offers.data.offerIds[0]);
  const activity=performActivity(store,registries,personId,"activity_mos_training");
  assert.equal(activity.ok,true);
  const state=store.getState();
  assert.equal(state.entities.people[personId].condition.status,"active");
  assert.equal(state.entities.serviceRecords[serviceId].currentContractId,accepted.data.contractId);
  assert.equal(state.entities.contractRecords[contractId].status,"completed");
  assert.equal(state.entities.contractRecords[accepted.data.contractId].status,"active");
  assert.equal(state.entities.activityRecords[activity.data.activityRecordId].status,"completed");
  assert.ok(state.entities.activityRecords[activity.data.activityRecordId].endDate > endDate);
  assert.equal(validateWorldState(state,registries).ok,true);
}

// Validator rejects cross-person current-contract corruption and open assignments
// retained by a terminal-status Soldier.
{
  const a=career(10004);
  const other=Object.values(a.store.getState().entities.people).find(p=>p.id!==a.personId && p.serviceRecordId);
  assert.ok(other);
  const corrupted=structuredClone(a.store.getState());
  corrupted.entities.serviceRecords[other.serviceRecordId].currentContractId=a.contractId;
  let check=validateWorldState(corrupted,registries);
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(error=>error.includes("belongs to")));

  const terminal=structuredClone(a.store.getState());
  terminal.entities.people[a.personId].condition.status="separated";
  terminal.entities.serviceRecords[a.serviceId].serviceStatus="separated";
  const open=Object.values(terminal.entities.assignmentRecords).find(record=>record.personId===a.personId&&record.endDate==null);
  assert.ok(open);
  check=validateWorldState(terminal,registries);
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(error=>error.includes("terminal-status person")));

  const futureActive=structuredClone(a.store.getState());
  futureActive.entities.contractRecords[a.contractId].startDate=addDaysIso(futureActive.world.date,1);
  check=validateWorldState(futureActive,registries);
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(error=>error.includes("starts in the future")));
}


// Reenlisting on the exact ETS date activates the successor immediately so the
// world never enters an invalid active-contract-at-ETS state.
{
  const {store,personId,serviceId,contractId}=career(10006);
  const endDate=store.getState().entities.contractRecords[contractId].endDate;
  store.mutate(draft=>{draft.world.date=endDate;},[]);
  const offers=generateReenlistmentOffers(store,registries,personId);
  const accepted=acceptReenlistmentOffer(store,registries,offers.data.offerIds[0]);
  const state=store.getState();
  assert.equal(state.entities.contractRecords[contractId].status,"completed");
  assert.equal(state.entities.contractRecords[accepted.data.contractId].status,"active");
  assert.equal(state.entities.serviceRecords[serviceId].currentContractId,accepted.data.contractId);
  assert.equal(validateWorldState(state,registries).ok,true);
}

// Same-schema v0.4.3.3.1 saves with the old early-activation semantics normalize on load.
{
  const {store,personId,serviceId,contractId}=career(10005);
  const state=structuredClone(store.getState());
  const old=state.entities.contractRecords[contractId];
  const newId="contract_legacy_future_reenlistment";
  const bonus=2500;
  old.status="completed";
  state.entities.contractRecords[newId]={...old,id:newId,type:"reenlistment",startDate:old.endDate,endDate:addDaysIso(old.endDate,365*3),termMonths:36,bonus,status:"active"};
  state.entities.serviceRecords[serviceId].currentContractId=newId;
  state.gameVersion="0.4.3.3.1";
  const priorBonus=state.entities.people[personId].career.bonusEarnings;
  const migrated=migratePayload({saveFormatVersion:3,gameVersion:"0.4.3.3.1",worldState:state});
  assert.equal(migrated.worldState.gameVersion,"0.4.3.22");
  assert.equal(migrated.worldState.entities.serviceRecords[serviceId].currentContractId,contractId);
  assert.equal(migrated.worldState.entities.contractRecords[contractId].status,"active");
  assert.equal(migrated.worldState.entities.contractRecords[newId].status,"pending");
  assert.equal(migrated.worldState.entities.people[personId].career.bonusEarnings,priorBonus+bonus);
  assert.equal(validateWorldState(migrated.worldState,registries).ok,true);
}

console.log("War Sim v0.4.3.22 career boundary integrity QA passed");
