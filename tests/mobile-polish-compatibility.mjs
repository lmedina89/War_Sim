import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { migratePayload } from "../src/core/migrations.js";
import { registries } from "../src/data/registries.js";
import { validateWorldState } from "../src/core/validator.js";

function createCareer(seed=432001){
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"Legacy",lastName:"Tester",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}
function payloadFor(worldState,id){return {saveFormatVersion:3,saveId:id,createdAt:"2026-08-31T00:00:00.000Z",savedAt:"2026-08-31T00:00:00.000Z",gameVersion:"0.4.3.1",worldState};}

// A pre-v0.4.3 player save that has the durable operational-start evidence but lacks the
// newly introduced Army Service Ribbon should receive exactly one historical backfill.
{
  const store=createCareer(432001); const legacy=structuredClone(store.getState()); const personId=legacy.playerPersonId;
  for(const [id,row] of Object.entries(legacy.entities.awardRecords)) if(row.personId===personId&&row.awardId==="award_army_service_ribbon") delete legacy.entities.awardRecords[id];
  legacy.entities.people[personId].career.prestige=0;
  legacy.gameVersion="0.4.2.2";
  const migrated=migratePayload(payloadFor(legacy,"legacy-asr-missing"));
  const rows=Object.values(migrated.worldState.entities.awardRecords).filter(row=>row.personId===personId&&row.awardId==="award_army_service_ribbon");
  assert.equal(rows.length,1,"legacy qualifying career should receive exactly one ASR backfill");
  assert.equal(rows[0].sourceType,"legacy_initial_entry_training_backfill");
  assert.equal(rows[0].earnedDate,legacy.entities.people[personId].career.enlistmentDate,"historical award date should match operational career entry evidence");
  assert.equal(migrated.worldState.entities.people[personId].career.prestige,registries.awards.get("award_army_service_ribbon").prestigeValue);
  assert.equal(validateWorldState(migrated.worldState,registries).ok,true);
  const twice=migratePayload(migrated);
  assert.equal(Object.values(twice.worldState.entities.awardRecords).filter(row=>row.personId===personId&&row.awardId==="award_army_service_ribbon").length,1,"ASR backfill must be idempotent");
}

// If an older save already has the retired legacy ASR representation, upgrade that record in
// place instead of creating a duplicate or adding prestige again.
{
  const store=createCareer(432002); const legacy=structuredClone(store.getState()); const personId=legacy.playerPersonId;
  const row=Object.values(legacy.entities.awardRecords).find(item=>item.personId===personId&&item.awardId==="award_army_service_ribbon");
  assert.ok(row); row.awardId="award_basic_training"; row.schemaVersion=2; const beforePrestige=legacy.entities.people[personId].career.prestige;
  const migrated=migratePayload(payloadFor(legacy,"legacy-asr-upgrade"));
  assert.equal(migrated.worldState.entities.awardRecords[row.id].awardId,"award_army_service_ribbon");
  assert.equal(migrated.worldState.entities.people[personId].career.prestige,beforePrestige,"legacy record upgrade must not double-count prestige");
  assert.equal(Object.values(migrated.worldState.entities.awardRecords).filter(item=>item.personId===personId&&item.awardId==="award_army_service_ribbon").length,1);
}

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
assert.match(html,/class="panel disclosure-panel situation-feed-panel"[^>]*data-persist-key="situation-feed"/);
assert.match(html,/id="situation-feed-count"/);
assert.match(app,/const SITUATION_FEED_PREVIEW_LIMIT = 3;/);
assert.match(app,/Show All \(\$\{feed\.length\}\)/);
assert.match(app,/Show Recent/);
assert.match(css,/\.identity-screen-tabs\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/,"Soldier tabs should use five equal-width columns");
assert.match(css,/@media\(max-width:420px\)\{\.identity-screen-tabs/);
console.log("War Sim v0.4.3.2 mobile polish and legacy award compatibility QA passed");
