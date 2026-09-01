import assert from "node:assert/strict";
import { readUiText, readUiJson, writeUiText, initializeDisclosureState } from "../src/ui/uiStorage.js";
import { createNavigationController } from "../src/ui/navigation.js";
import { createSaveManagerController } from "../src/ui/dialogs/saveManager.js";
import { createInitialWorldState } from "../src/state/initialState.js";

class ThrowingStorage {
  getItem(){ throw new Error("SecurityError: storage denied"); }
  setItem(){ throw new Error("SecurityError: storage denied"); }
  removeItem(){ throw new Error("SecurityError: storage denied"); }
}
class MemoryStorage {
  constructor(entries=[]){ this.map=new Map(entries); }
  getItem(k){ return this.map.has(k)?this.map.get(k):null; }
  setItem(k,v){ this.map.set(String(k),String(v)); }
  removeItem(k){ this.map.delete(String(k)); }
}
class FakeElement {
  constructor(tag="div") { this.tagName=tag.toUpperCase(); this.children=[]; this.listeners={}; this.className=""; this.textContent=""; this.open=false; this.type=""; this.hidden=false; this.dataset={}; this.attrs={}; }
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=[...children];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  showModal(){this.open=true;}
  close(){this.open=false;}
}

// UI-only persistence must degrade to fallbacks when storage is denied or malformed.
const denied=new ThrowingStorage();
assert.equal(readUiText("x","fallback",denied),"fallback");
assert.deepEqual(readUiJson("x",["fallback"],denied),["fallback"]);
assert.equal(writeUiText("x","value",denied),false);
const malformed=new MemoryStorage([["bad-json","{not-json"]]);
assert.deepEqual(readUiJson("bad-json",["safe"],malformed),["safe"]);

// Persisted navigation garbage must be sanitized to known screens.
const navStorage=new MemoryStorage([
  ["war-sim:ui:screen:career","totally-invalid"],
  ["war-sim:ui:screen:unit","../../bad"],
  ["war-sim:ui:screen:personnel",""],
]);
const root={querySelectorAll(){return [];}};
const win={scrollTo(){}};
const navigation=createNavigationController({root,win,storage:navStorage});
navigation.restoreSubscreens();
assert.equal(navigation.getActiveSubscreen("career"),"home");
assert.equal(navigation.getActiveSubscreen("unit"),"overview");
assert.equal(navigation.getActiveSubscreen("personnel"),"roster");

// Save-system public boundaries must report denied/unavailable storage cleanly.
Object.defineProperty(globalThis,"localStorage",{configurable:true,get(){throw new Error("SecurityError: denied");}});
const saves=await import("../src/core/saveSystem.js");
const world=createInitialWorldState({seed:43121});
for (const fn of [
  ()=>saves.listSaveSlots(),
  ()=>saves.saveToSlot(world,"slot_01"),
  ()=>saves.loadFromSlot("slot_01"),
  ()=>saves.deleteSaveSlot("slot_01"),
]) {
  assert.throws(fn,/Save storage is unavailable in this browser session/);
}

// Save Manager must still open and contain the storage failure rather than throw.
globalThis.document={createElement:tag=>new FakeElement(tag)};
const dialog=new FakeElement("dialog"), title=new FakeElement("h2"), modeLabel=new FakeElement("p"), slots=new FakeElement("div");
const manager=createSaveManagerController({
  elements:{dialog,title,modeLabel,slots},
  getSlots:()=>saves.listSaveSlots(),
  autosaveSlotId:saves.AUTOSAVE_SLOT,
  describeSlot:()=>[],
  confirmAction:async()=>true,
  onSaveSlot:async()=>false,
  onLoadSlot:async()=>false,
  onDeleteSlot:async()=>false,
});
assert.doesNotThrow(()=>manager.open("load"));
assert.equal(dialog.open,true);
assert.equal(slots.children.length,1);
assert.equal(slots.children[0].children[0].textContent,"Save Storage Unavailable");
assert.match(slots.children[0].children[1].textContent,/current career is still running/);

// Once storage access returns, the same controller can render normally again.
Object.defineProperty(globalThis,"localStorage",{configurable:true,value:new MemoryStorage(),writable:true});
assert.doesNotThrow(()=>manager.render("load"));
assert.equal(slots.children.length,7,"all six manual slots plus autosave should return after storage recovery");

console.log("War Sim startup and persistence hardening QA passed");
