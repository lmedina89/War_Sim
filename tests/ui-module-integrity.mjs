import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNavigationController } from "../src/ui/navigation.js";
import { readUiText, writeUiText, readUiJson, writeUiJson } from "../src/ui/uiStorage.js";

const rootDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app=fs.readFileSync(path.join(rootDir,"src/app.js"),"utf8");
const dom=fs.readFileSync(path.join(rootDir,"src/ui/dom.js"),"utf8");
const nav=fs.readFileSync(path.join(rootDir,"src/ui/navigation.js"),"utf8");
const storageSource=fs.readFileSync(path.join(rootDir,"src/ui/uiStorage.js"),"utf8");
const saveManagerSource=fs.readFileSync(path.join(rootDir,"src/ui/dialogs/saveManager.js"),"utf8");
const html=fs.readFileSync(path.join(rootDir,"index.html"),"utf8");

// Phase-1 boundary: app remains the composition root while low-level UI concerns move out.
assert.match(app,/createDomRegistry/);
assert.match(app,/createNavigationController/);
assert.match(app,/initializeDisclosureState/);
assert.match(app,/createSaveManagerController/);
assert.ok(Buffer.byteLength(app,"utf8") < 127_000,`app.js should remain below the Phase-2 127 KB regression ceiling; got ${Buffer.byteLength(app,"utf8")} bytes`);
assert.doesNotMatch(app,/\blocalStorage\b/,"app.js should use the resilient UI-storage module instead of direct localStorage access");

// UI-only modules must stay presentation-only and never reach into canonical mutation layers.
for(const [name,source] of [["dom.js",dom],["navigation.js",nav],["uiStorage.js",storageSource],["dialogs/saveManager.js",saveManagerSource]]){
  assert.doesNotMatch(source,/from\s+["']\.\.\/(?:commands|services|state|core)\//,`${name} must not import canonical mutation/state infrastructure`);
  assert.doesNotMatch(source,/\.innerHTML\s*=/,`${name} must not introduce innerHTML assignment`);
}

// Every selector centralized in dom.js must still resolve to a unique static HTML id.
const htmlIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(htmlIds).size,htmlIds.length,"static DOM ids must remain unique");
const domIds=[...dom.matchAll(/\$\("#([^"]+)"\)/g)].map(m=>m[1]);
assert.ok(domIds.length > 60,"DOM registry should own the application's major static id lookups");
for(const id of domIds) assert.ok(htmlIds.includes(id),`dom.js references missing #${id}`);

// Storage wrapper remains best-effort and non-fatal when storage is blocked.
const memory=new Map();
const memoryStorage={getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value))};
assert.equal(writeUiText("x","value",memoryStorage),true);
assert.equal(readUiText("x","fallback",memoryStorage),"value");
assert.equal(writeUiJson("json",[1,2,3],memoryStorage),true);
assert.deepEqual(readUiJson("json",[],memoryStorage),[1,2,3]);
const blocked={getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");}};
assert.equal(readUiText("x","fallback",blocked),"fallback");
assert.equal(writeUiText("x","value",blocked),false);
assert.deepEqual(readUiJson("json",["fallback"],blocked),["fallback"]);

class FakeElement {
  constructor(dataset={}){this.dataset={...dataset};this.hidden=false;this.attributes=new Map();this.listeners={};}
  setAttribute(k,v){this.attributes.set(k,v);}
  removeAttribute(k){this.attributes.delete(k);}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  click(){for(const fn of this.listeners.click??[]) fn();}
}
const careerScreens=["home","actions","soldier","records","inbox"].map(careerScreen=>new FakeElement({careerScreen}));
const careerTabs=["home","actions","soldier","records","inbox"].map(careerTab=>new FakeElement({careerTab}));
const unitScreens=["overview","roster","readiness","admin"].map(unitScreen=>new FakeElement({unitScreen}));
const unitTabs=["overview","roster","readiness","admin"].map(unitTab=>new FakeElement({unitTab}));
const personnelScreens=["roster","relationships"].map(personnelScreen=>new FakeElement({personnelScreen}));
const personnelTabs=["roster","relationships"].map(personnelTab=>new FakeElement({personnelTab}));
const views=["career","unit","personnel","orders","more"].map(view=>new FakeElement({view}));
const bottomTabs=["career","unit","personnel","orders","more"].map(view=>new FakeElement({view}));
const selectorMap=new Map([
  ["[data-career-screen]",careerScreens],["[data-career-tab]",careerTabs],
  ["[data-unit-screen]",unitScreens],["[data-unit-tab]",unitTabs],
  ["[data-personnel-screen]",personnelScreens],["[data-personnel-tab]",personnelTabs],
  [".game-view[data-view]",views],["#bottom-nav [data-view]",bottomTabs]
]);
const fakeRoot={querySelectorAll:selector=>selectorMap.get(selector)??[]};
const scrollCalls=[]; const fakeWin={scrollTo:args=>scrollCalls.push(args)};
const navStorage=new Map(); const navStore={getItem:k=>navStorage.has(k)?navStorage.get(k):null,setItem:(k,v)=>navStorage.set(k,String(v))};
const controller=createNavigationController({root:fakeRoot,win:fakeWin,storage:navStore});
controller.bindNavigation();
controller.restoreSubscreens();
assert.equal(controller.getActiveSubscreen("career"),"home");
careerTabs.find(x=>x.dataset.careerTab==="records").click();
assert.equal(controller.getActiveSubscreen("career"),"records");
assert.equal(careerScreens.find(x=>x.dataset.careerScreen==="records").hidden,false);
assert.ok(careerScreens.filter(x=>x.dataset.careerScreen!=="records").every(x=>x.hidden));
assert.equal(navStorage.get("war-sim:ui:screen:career"),"records");
bottomTabs.find(x=>x.dataset.view==="personnel").click();
assert.equal(controller.getActiveView(),"personnel");
assert.equal(views.find(x=>x.dataset.view==="personnel").hidden,false);
assert.ok(views.filter(x=>x.dataset.view!=="personnel").every(x=>x.hidden));
controller.reset({view:"career",career:"home",scroll:false});
assert.equal(controller.getActiveView(),"career");
assert.equal(controller.getActiveSubscreen("career"),"home");

assert.doesNotMatch(saveManagerSource,/localStorage|sessionStorage/,"Save Manager presentation module must not access storage directly");
assert.doesNotMatch(saveManagerSource,/validateWorldState|saveToSlot|loadFromSlot|deleteSaveSlot/,"Save Manager presentation module must receive persistence actions through its controller contract");
console.log("War Sim UI architecture Phase 2 integrity QA passed");
