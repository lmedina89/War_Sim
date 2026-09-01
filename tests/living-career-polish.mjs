import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { performActivity } from "../src/commands/performActivity.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { validateWorldState } from "../src/core/validator.js";
import { migratePayload } from "../src/core/migrations.js";

function make(seed=42202){
  const store=createStateStore(createInitialWorldState({seed}));
  createPlayerCareer(store,registries,{firstName:"Living",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  return store;
}

{
  const store=make(); const state=store.getState(), playerId=state.playerPersonId;
  assert.equal(state.schemaVersion,16); assert.equal(state.gameVersion,"0.4.3.22");
  assert.equal(Object.keys(state.entities.personalityProfiles).length,Object.keys(state.entities.people).length,"every generated person should have deterministic personality data");
  assert.ok(Object.values(state.entities.relationshipRecords).every(r=>Number.isFinite(r.rapport)),"relationship records need canonical rapport");
  const career=selectCareerRecord(state,store.getIndexes(),registries,playerId);
  assert.ok(career.relationships.every(r=>r.personalityTraits.length>=1),"player should be able to perceive stable NPC traits");
  assert.equal(validateWorldState(state,registries).ok,true);
}

// Collective activity relationship gains are scoped; the entire squad must not move in lockstep.
{
  const store=make(42203), playerId=store.getState().playerPersonId;
  const ids=[...(store.getIndexes().relationshipsByPersonId.get(playerId)??[])];
  const before=Object.fromEntries(ids.map(id=>[id,store.getState().entities.relationshipRecords[id].trust]));
  performActivity(store,registries,playerId,"activity_squad_drills");
  const after=store.getState();
  const changed=ids.filter(id=>after.entities.relationshipRecords[id].trust!==before[id]);
  assert.ok(changed.length>=1,"shared training should be able to affect a real relationship");
  assert.ok(changed.length<ids.length,"trust must not increase uniformly with every squad relationship");
}

// Time progression should occasionally let the unit/NPCs initiate contextual events and those interactions can be remembered.
{
  const store=make(42204), playerId=store.getState().playerPersonId;
  advanceWorldDays(store,90);
  let state=store.getState();
  const living=Object.values(state.entities.gameplayEventRecords).filter(r=>r.sourceType==="living_career");
  assert.ok(living.length>=1,"living career should generate intermittent NPC-initiated events over a long enough period");
  const pending=living.find(r=>r.status==="pending");
  if(pending){
    const def=registries.gameplayEvents.get(pending.definitionId);
    resolveDecision(store,registries,playerId,pending.id,def.choices[0].id);
    state=store.getState();
    assert.ok(Object.values(state.entities.relationshipMemoryRecords).some(m=>m.sourceId===pending.id),"resolved interpersonal decisions should create relationship memory");
  }
  assert.equal(validateWorldState(store.getState(),registries).ok,true);
}

// Existing schema-15 saves upgrade without regenerating the career.
{
  const store=make(42205), legacy=structuredClone(store.getState()), playerId=legacy.playerPersonId, name=legacy.entities.people[legacy.playerPersonId].identity.displayName;
  legacy.schemaVersion=15; legacy.gameVersion="0.4.2.1"; delete legacy.entities.personalityProfiles; delete legacy.entities.relationshipMemoryRecords; delete legacy.world.livingCareer;
  for(const r of Object.values(legacy.entities.relationshipRecords)) delete r.rapport;
  const migrated=migratePayload({saveFormatVersion:3,saveId:"living-migrate",createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),gameVersion:"0.4.2.1",worldState:legacy});
  assert.equal(migrated.worldState.schemaVersion,16); assert.equal(migrated.worldState.gameVersion,"0.4.3.22");
  assert.equal(migrated.worldState.entities.people[playerId].identity.displayName,name);
  assert.equal(Object.keys(migrated.worldState.entities.personalityProfiles).length,Object.keys(migrated.worldState.entities.people).length);
  assert.ok(Object.values(migrated.worldState.entities.relationshipRecords).every(r=>Number.isFinite(r.rapport)));
}

console.log("War Sim v0.4.3.2 living career, relationship, and migration QA passed");
