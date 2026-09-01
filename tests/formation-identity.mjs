import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialWorldState } from "../src/state/initialState.js";
import { registries } from "../src/data/registries.js";
import { careerStartFormationForSeed, formationIdentityForUnit } from "../src/services/formationIdentity.js";
import { migratePayload } from "../src/core/migrations.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";

assert.equal(registries.formations.size, 6, "all six historical formation definitions should be registered");
assert.equal(registries.campaignEmblems.size, 6, "all six fictional campaign emblems should be registered");
assert.equal(registries.formations.get("formation_75th_ranger").careerStartEligible, false, "Rangers must not be a default 11B start without a selection pipeline");
assert.equal(registries.formations.get("formation_7th_special_forces").careerStartEligible, false, "Special Forces must not be a default 11B start without a qualification pipeline");

const svgSource=fs.readFileSync(new URL("../src/ui/insignia.js",import.meta.url),"utf8");
for(const id of [
  "ssi_82d_airborne","ssi_7th_infantry","ssi_5th_infantry","ssi_193d_infantry","ssi_75th_ranger","ssi_7th_special_forces",
  "campaign_northern_shield","campaign_iron_viper","campaign_falcon_spear","campaign_ember_watch","campaign_night_anvil","campaign_red_horizon"
]) assert.ok(svgSource.includes(id),`missing runtime SVG builder for ${id}`);

const seen=new Set();
for(let seed=1;seed<=128;seed++){
  const state=createInitialWorldState({seed});
  const startUnitId=state.world.careerStartUnitByBranchId.branch_army;
  assert.ok(startUnitId,"Army career start unit should exist");
  const identity=formationIdentityForUnit(state,startUnitId);
  assert.ok(identity?.insigniaId,"starting unit should resolve a formation insignia");
  assert.equal(state.world.formationIdentityId,careerStartFormationForSeed(seed).id,"formation choice must be seed-stable and not consume runtime RNG");
  assert.ok(state.entities.units.unit_company_001.parentUnitId,"Alpha Company must belong to a named higher formation");
  let cursor=state.entities.units[startUnitId],depth=0;
  while(cursor){depth++;cursor=cursor.parentUnitId?state.entities.units[cursor.parentUnitId]:null;}
  assert.ok(depth>=5,"starting assignment chain should include named battalion/brigade context above company/platoon/squad");
  seen.add(state.world.formationIdentityId);
}
assert.deepEqual([...seen].sort(),["formation_193d_infantry","formation_5th_infantry","formation_7th_infantry"].sort(),"seed sweep should reach all three conventional unqualified starting formations");
assert.equal(registries.formations.get("formation_82d_airborne").careerStartEligible,false,"unqualified fresh careers must not start in the 82d Airborne Division");

const careerStore=createStateStore(createInitialWorldState({seed:24680}));
const expectedFormation=careerStartFormationForSeed(24680);
const created=createPlayerCareer(careerStore,registries,{firstName:"Test",lastName:"Soldier",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed:24680});
assert.equal(created.ok,true);
const careerState=careerStore.getState();
const initialOrder=Object.values(careerState.entities.orderRecords).find(record=>record.type==="initial_assignment");
assert.ok(initialOrder?.summary.includes(expectedFormation.name),"initial assignment order should identify the named higher formation");
assert.ok(initialOrder?.summary.includes("Company"),"initial assignment order should include company context instead of only a generic squad name");

const legacy=createInitialWorldState({seed:12345});
for(const id of Object.keys(legacy.entities.units)) if(id.startsWith("unit_formation_")) delete legacy.entities.units[id];
legacy.entities.units.unit_company_001.parentUnitId=null;
delete legacy.world.formationIdentityId;
legacy.gameVersion="0.4.3.2";
const migrated=migratePayload({saveFormatVersion:3,saveId:"legacy",createdAt:"2046-01-01T00:00:00.000Z",savedAt:"2046-01-01T00:00:00.000Z",gameVersion:"0.4.3.2",worldState:legacy});
assert.equal(migrated.worldState.gameVersion,"0.4.3.8");
assert.ok(migrated.worldState.entities.units.unit_company_001.parentUnitId,"same-schema legacy load should backfill named formation parents");
assert.ok(formationIdentityForUnit(migrated.worldState,migrated.worldState.world.careerStartUnitByBranchId.branch_army)?.insigniaId,"legacy backfill should resolve a patch");

console.log("War Sim v0.4.3.8 formation identity and SVG asset QA passed");
