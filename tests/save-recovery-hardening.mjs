import assert from "node:assert/strict";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { registries } from "../src/data/registries.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";

class ControlledStorage {
  constructor(){ this.map=new Map(); this.failPrimaryWrites=false; }
  getItem(key){ return this.map.has(key) ? this.map.get(key) : null; }
  removeItem(key){ this.map.delete(key); }
  setItem(key,value){
    if (this.failPrimaryWrites && key === "warSim_save_v3_slot_01") {
      const error=new Error("The quota has been exceeded."); error.name="QuotaExceededError"; throw error;
    }
    this.map.set(key,String(value));
  }
}

const storage=new ControlledStorage();
globalThis.localStorage=storage;
const { saveToSlot, loadFromSlot, deleteSaveSlot }=await import("../src/core/saveSystem.js");
const store=createStateStore(createInitialWorldState({seed:4318001}));
createPlayerCareer(store,registries,{firstName:"Recovery",lastName:"Guard",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed:4318001});

// Establish two generations so slot_01 has a known-good recovery backup.
saveToSlot(store.getState(),"slot_01");
const firstGood=storage.getItem("warSim_save_v3_slot_01");
store.mutate(draft=>{draft.world.date="2046-02-11";});
saveToSlot(store.getState(),"slot_01");
assert.equal(storage.getItem("warSim_save_backup_v3_slot_01"),firstGood);

// Damage the primary while leaving the recovery generation intact.
storage.setItem("warSim_save_v3_slot_01","{damaged primary");
const protectedBackup=storage.getItem("warSim_save_backup_v3_slot_01");
assert.ok(protectedBackup);

// Simulate quota failure on the replacement primary write. The valid backup must survive.
storage.failPrimaryWrites=true;
assert.throws(
  ()=>saveToSlot(store.getState(),"slot_01"),
  /existing recovery backup was preserved/i
);
assert.equal(storage.getItem("warSim_save_backup_v3_slot_01"),protectedBackup,"quota failure must not destroy the only valid recovery generation");
storage.failPrimaryWrites=false;

// The protected backup must still be loadable and repair the damaged primary.
const recovered=loadFromSlot("slot_01");
assert.equal(recovered.metadata.recoveredFromBackup,true);
assert.equal(storage.getItem("warSim_save_v3_slot_01"),protectedBackup);

// Public deletion API must reject arbitrary slot identifiers.
assert.throws(()=>deleteSaveSlot("../../unrelated"),/Invalid save slot/);

console.log("War Sim Phase 2 save recovery hardening QA passed");
