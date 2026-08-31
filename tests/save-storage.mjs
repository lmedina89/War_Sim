import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";

class FakeStorage {
  constructor(limit=Infinity){this.map=new Map();this.limit=limit;}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  removeItem(k){this.map.delete(k);}
  setItem(k,v){v=String(v);const next=new Map(this.map);next.set(k,v);const bytes=[...next].reduce((n,[a,b])=>n+a.length+b.length,0);if(bytes>this.limit){const e=new Error("The quota has been exceeded.");e.name="QuotaExceededError";throw e;}this.map=next;}
}

globalThis.localStorage=new FakeStorage();
const { saveToSlot, AUTOSAVE_SLOT }=await import("../src/core/saveSystem.js");
const store=createStateStore(createInitialWorldState({seed:9901}));
createPlayerCareer(store,registries,{firstName:"Save",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed:9901});
saveToSlot(store.getState(),AUTOSAVE_SLOT); saveToSlot(store.getState(),AUTOSAVE_SLOT);
assert.equal(localStorage.getItem("warSim_save_backup_v3_autosave"),null,"autosave must not duplicate itself into a full backup");
saveToSlot(store.getState(),"slot_01"); saveToSlot(store.getState(),"slot_01");
assert.ok(localStorage.getItem("warSim_save_backup_v3_slot_01"),"manual overwrite should retain a recovery backup when storage permits");

// Friendly quota failure rather than leaking browser DOMException wording.
const limited=new FakeStorage(1000); globalThis.localStorage=limited;
assert.throws(()=>saveToSlot(store.getState(),"slot_02"),/Save storage is full\. Delete an older manual save/);
console.log("War Sim v0.4.3.2 save-storage quota QA passed");
