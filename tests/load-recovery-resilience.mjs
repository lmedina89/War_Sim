import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { fnv1a32, stableStringify } from "../src/core/checksum.js";

class MemoryStorage {
  constructor(){ this.map=new Map(); }
  getItem(key){ return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

globalThis.localStorage=new MemoryStorage();
const { saveToSlot, loadFromSlot, listSaveSlots }=await import("../src/core/saveSystem.js");
const store=createStateStore(createInitialWorldState({seed:4319001}));
createPlayerCareer(store,registries,{firstName:"Legacy",lastName:"Career",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed:4319001});

// Explicit backward compatibility: a v0.4.3.17 world using save format 3/schema 16 remains loadable.
const legacyWorld=structuredClone(store.getState()); legacyWorld.gameVersion="0.4.3.17";
const legacyBase={saveFormatVersion:3,saveId:"save_legacy_4317",createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),gameVersion:"0.4.3.17",worldState:legacyWorld};
localStorage.setItem("warSim_save_v3_slot_01",JSON.stringify({...legacyBase,checksum:fnv1a32(stableStringify(legacyBase))}));
const legacyLoaded=loadFromSlot("slot_01");
assert.equal(legacyLoaded.worldState.gameVersion,"0.4.3.22");
assert.equal(legacyLoaded.worldState.schemaVersion,16);

// A damaged primary with a good backup is clearly recoverable and remains loadable.
saveToSlot(store.getState(),"slot_01");
store.mutate(draft=>{ draft.world.date="2046-03-01"; });
saveToSlot(store.getState(),"slot_01");
localStorage.setItem("warSim_save_v3_slot_01","{broken primary");
let meta=listSaveSlots().find(slot=>slot.slotId==="slot_01");
assert.equal(meta.recoveredFromBackup,true);
assert.equal(meta.loadable,true);
assert.equal(meta.loadIssue,"recovery");
assert.equal(loadFromSlot("slot_01").metadata.recoveredFromBackup,true);

// Both copies damaged: classify as unloadable corruption without exposing parser internals.
localStorage.setItem("warSim_save_v3_slot_02","{broken");
localStorage.setItem("warSim_save_backup_v3_slot_02","also broken");
meta=listSaveSlots().find(slot=>slot.slotId==="slot_02");
assert.equal(meta.loadable,false);
assert.equal(meta.corrupted,true);
assert.equal(meta.incompatible,false);
assert.match(meta.loadIssueMessage,/damaged/i);
assert.throws(()=>loadFromSlot("slot_02"),/primary save is damaged.*recovery backup is also invalid/i);

// Future save-format data must be classified as incompatible, never partially loaded.
const futureWorld=structuredClone(store.getState());
const base={saveFormatVersion:4,saveId:"save_future_format",createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),gameVersion:"9.0.0",worldState:futureWorld};
localStorage.setItem("warSim_save_v3_slot_03",JSON.stringify({...base,checksum:fnv1a32(stableStringify(base))}));
meta=listSaveSlots().find(slot=>slot.slotId==="slot_03");
assert.equal(meta.loadable,false);
assert.equal(meta.incompatible,true);
assert.equal(meta.corrupted,false);
assert.throws(()=>loadFromSlot("slot_03"),/unsupported version of War Sim/i);

// Future world-schema data under the current save format must also be rejected safely.
const futureSchemaWorld=structuredClone(store.getState()); futureSchemaWorld.schemaVersion=17;
const schemaBase={saveFormatVersion:3,saveId:"save_future_schema",createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),gameVersion:"0.5.0",worldState:futureSchemaWorld};
localStorage.setItem("warSim_save_v3_slot_04",JSON.stringify({...schemaBase,checksum:fnv1a32(stableStringify(schemaBase))}));
meta=listSaveSlots().find(slot=>slot.slotId==="slot_04");
assert.equal(meta.loadable,false);
assert.equal(meta.incompatible,true);
assert.throws(()=>loadFromSlot("slot_04"),/unsupported version of War Sim/i);

console.log("War Sim Phase 2 load/recovery resilience QA passed");
