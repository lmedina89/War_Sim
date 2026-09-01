import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");

assert.match(html,/War Sim v0\.4\.3\.3/);
for(const tab of ["home","actions","soldier","records","inbox"]) assert.match(html,new RegExp(`data-career-tab="${tab}"`));
for(const screen of ["home","actions","soldier","records","inbox"]) assert.match(html,new RegExp(`data-career-screen="${screen}"`));
for(const tab of ["overview","roster","readiness","admin"]) assert.match(html,new RegExp(`data-unit-tab="${tab}"`));
for(const screen of ["overview","roster","readiness","admin"]) assert.match(html,new RegExp(`data-unit-screen="${screen}"`));
for(const tab of ["roster","relationships"]) assert.match(html,new RegExp(`data-personnel-tab="${tab}"`));
assert.match(app,/function setSubscreen\(/);
assert.match(app,/war-sim:ui:screen:/);
assert.match(app,/identityTabDefs=\[\["uniform","Uniform"\],\["loadout","Loadout"\],\["awards","Awards"\],\["catalog","Catalog"\],\["record","Record"\]\]/);
assert.match(app,/dataset\.identityScreen/);
assert.doesNotMatch(app,/\.innerHTML\s*=/);
assert.match(css,/\.screen-tabs\{position:sticky/);
assert.match(css,/min-height:44px/);
assert.match(css,/\.app-screen\[hidden\]\{display:none!important\}/);
assert.match(css,/prefers-reduced-motion:reduce/);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
assert.deepEqual([...new Set(duplicates)],[],"DOM IDs must remain unique after screen regrouping");
for(const id of ["career-summary","activity-options","soldier-identity","schools-awards","career-inbox","squad-body","unit-history","readiness-breakdown","relationships"]) {
  assert.equal(ids.filter(value=>value===id).length,1,`${id} must remain mounted exactly once`);
}
console.log("War Sim v0.4.3.3.2 mobile app navigation QA passed");
