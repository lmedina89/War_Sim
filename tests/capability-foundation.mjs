import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { requestSchoolOpportunity } from "../src/commands/requestSchool.js";
import { acceptCareerOpportunity } from "../src/commands/careerOpportunities.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { performActivity } from "../src/commands/performActivity.js";
import { selectGameplay } from "../src/selectors/selectGameplay.js";
import { selectUnitCapabilityInventory } from "../src/selectors/selectUnitCapability.js";
import { validateWorldState } from "../src/core/validator.js";

function storeFor(seed=421001){
  const store=createStateStore(createInitialWorldState({seed}));
  const r=createPlayerCareer(store,registries,{firstName:"Capability",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(r.ok,true); return store;
}

// Active military-school attendance must block manual home-station activities in both selector and command paths.
{
  const store=storeFor(421001), personId=store.getState().playerPersonId;
  store.mutate(draft=>{const p=draft.entities.people[personId];p.career.enlistmentDate="2045-01-01";p.condition.health=100;p.condition.readiness=90;p.condition.fatigue=0;draft.entities.skillProfiles[`skills_${personId}`].values.skill_fitness=60;},["people","activities"]);
  const req=requestSchoolOpportunity(store,registries,"school_airborne"); assert.equal(req.ok,true);
  const acc=acceptCareerOpportunity(store,registries,req.data.opportunityRecordId); assert.equal(acc.ok,true);
  const accepted=store.getState().entities.opportunityRecords[req.data.opportunityRecordId];
  const untilReport=accepted.reportElapsedDay-store.getState().world.clock.elapsedDays;
  if(untilReport>0){ const advance=advanceWorldDays(store,untilReport); assert.ok(["time_advanced","time_interrupted"].includes(advance.code)); }
  const current=store.getState().entities.opportunityRecords[accepted.id]; assert.equal(current.status,"in_progress");
  const view=selectGameplay(store.getState(),store.getIndexes(),registries,personId);
  const pt=view.activities.find(x=>x.id==="activity_pt"); assert.equal(pt.eligible,false); assert.ok(pt.reasons.includes("away at military school"));
  assert.throws(()=>performActivity(store,registries,personId,"activity_pt"),/attending military school/);
}

// Current infantry unit capability is derived from actual equipment/personnel and keeps provenance.
{
  const store=storeFor(421002), state=store.getState(), indexes=store.getIndexes(), personId=state.playerPersonId, unitId=state.entities.people[personId].affiliation.unitId;
  const cap=selectUnitCapabilityInventory(state,indexes,registries,unitId);
  assert.ok(cap); assert.equal(cap.doctrine?.id,"doctrine_light_infantry"); assert.ok(cap.personCount>=1); assert.ok(cap.totals.assigned>=1);
  const smallArms=cap.capabilities.find(x=>x.id==="capability_small_arms"); assert.ok(smallArms); assert.ok(smallArms.sources.length>=1);
  for(const source of smallArms.sources){ assert.ok(state.entities.people[source.personId]); assert.ok(state.entities.equipmentInstances[source.equipmentInstanceId]); }
  assert.equal(cap.supplyModelStatus,"not_modeled"); assert.equal(cap.battleResolutionStatus,"not_implemented");
}

// Degraded equipment must reduce derived effectiveness without mutating the world or inventing battle outcomes.
{
  const store=storeFor(421003), personId=store.getState().playerPersonId, unitId=store.getState().entities.people[personId].affiliation.unitId;
  const before=selectUnitCapabilityInventory(store.getState(),store.getIndexes(),registries,unitId);
  const eqId=store.getState().entities.loadouts[store.getState().entities.people[personId].loadoutId].slots.primaryWeaponInstanceId;
  store.mutate(draft=>{draft.entities.equipmentInstances[eqId].condition=20;},["equipment"]);
  const after=selectUnitCapabilityInventory(store.getState(),store.getIndexes(),registries,unitId);
  assert.ok(after.totals.operational<before.totals.operational); assert.equal(after.battleResolutionStatus,"not_implemented");
  assert.equal(validateWorldState(store.getState(),registries).ok,true);
}

const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
assert.match(app,/Unit Capability Inventory|selectUnitCapabilityInventory/);
assert.match(app,/achievement-cluster/);
assert.match(app,/person-career-activity/);
assert.match(css,/situation-identity>span:last-child\{white-space:normal/);
console.log("War Sim v0.4.3 school availability, service-record consolidation, and capability-foundation QA passed");
