import assert from "node:assert/strict";
import { createSaveManagerController } from "../src/ui/dialogs/saveManager.js";

class FakeElement {
  constructor(tag="div") { this.tagName=tag.toUpperCase(); this.children=[]; this.listeners={}; this.className=""; this.textContent=""; this.open=false; this.type=""; }
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=[...children];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async click(){for(const fn of this.listeners.click??[]) await fn();}
  showModal(){this.open=true;}
  close(){this.open=false;}
}

globalThis.document={createElement:tag=>new FakeElement(tag)};

const dialog=new FakeElement("dialog"), title=new FakeElement("h2"), modeLabel=new FakeElement("p"), slots=new FakeElement("div");
const slotData=[
  {slotId:"autosave",empty:false,characterName:"Auto Soldier"},
  {slotId:"slot_01",empty:true},
  {slotId:"slot_02",empty:false,characterName:"Saved Soldier"},
];
const calls={save:[],load:[],delete:[],confirm:[]};
let allowConfirm=true;
const controller=createSaveManagerController({
  elements:{dialog,title,modeLabel,slots},
  getSlots:()=>slotData,
  autosaveSlotId:"autosave",
  describeSlot:meta=>[meta.characterName,meta.empty?null:"Game date 2026-01-01"],
  confirmAction:async(titleText,message)=>{calls.confirm.push([titleText,message]);return allowConfirm;},
  onSaveSlot:async meta=>{calls.save.push(meta.slotId);return true;},
  onLoadSlot:async meta=>{calls.load.push(meta.slotId);return true;},
  onDeleteSlot:async meta=>{calls.delete.push(meta.slotId);return true;},
});

controller.open("save");
assert.equal(dialog.open,true);
assert.equal(controller.getMode(),"save");
assert.equal(modeLabel.textContent,"SAVE CAREER");
assert.equal(title.textContent,"Choose Save Slot");
assert.equal(slots.children.length,3);
assert.match(slots.children[0].className,/autosave-slot/);
assert.equal(slots.children[0].children.at(-1).children.length,0,"autosave must not expose manual-save or delete actions");
assert.equal(slots.children[1].children[1].textContent,"Empty");
const emptyActions=slots.children[1].children.at(-1);
assert.equal(emptyActions.children[0].textContent,"Save Here");
await emptyActions.children[0].click();
assert.deepEqual(calls.save,["slot_01"]);

// Re-rendered after save. Exercise overwrite cancellation and success on slot 02.
let slot02=slots.children[2];
let slot02Actions=slot02.children.at(-1);
assert.equal(slot02Actions.children[0].textContent,"Overwrite");
allowConfirm=false;
await slot02Actions.children[0].click();
assert.deepEqual(calls.save,["slot_01"],"cancelled overwrite must not save");
allowConfirm=true;
await slot02Actions.children[0].click();
assert.deepEqual(calls.save,["slot_01","slot_02"]);

controller.render("load");
assert.equal(modeLabel.textContent,"LOAD CAREER");
assert.equal(title.textContent,"Choose Career to Load");
slot02=slots.children[2];
slot02Actions=slot02.children.at(-1);
assert.equal(slot02Actions.children[0].textContent,"Load");
assert.equal(slot02Actions.children[1].textContent,"Delete");
await slot02Actions.children[0].click();
assert.deepEqual(calls.load,["slot_02"]);
assert.equal(dialog.open,false,"successful load should close dialog");

dialog.showModal();
controller.render("load");
slot02Actions=slots.children[2].children.at(-1);
allowConfirm=false;
await slot02Actions.children[1].click();
assert.deepEqual(calls.delete,[],"cancelled delete must not mutate save storage");
allowConfirm=true;
await slot02Actions.children[1].click();
assert.deepEqual(calls.delete,["slot_02"]);

controller.close();
assert.equal(dialog.open,false);

assert.throws(()=>createSaveManagerController({elements:{}}),/requires dialog/);
console.log("War Sim Save Manager module extraction QA passed");
