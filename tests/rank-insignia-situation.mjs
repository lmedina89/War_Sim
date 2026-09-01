import assert from "node:assert/strict";
import fs from "node:fs";

const insignia=fs.readFileSync(new URL("../src/ui/insignia.js",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const personProfileUniform=fs.readFileSync(new URL("../src/ui/render/personProfileUniform.js",import.meta.url),"utf8");
const situation=fs.readFileSync(new URL("../src/ui/render/situation.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");

for(const rankId of ["rank_army_e1","rank_army_e2","rank_army_e3","rank_army_e4","rank_army_e5","rank_army_e6","rank_army_e7","rank_army_e8_msg","rank_army_e8","rank_army_o1","rank_army_o2","rank_army_o3"]){
  assert.match(insignia,new RegExp(rankId),`rank SVG mapping missing for ${rankId}`);
}
assert.match(insignia,/export function createRankInsignia/);
assert.match(personProfileUniform,/rankMark\.append\(createRankInsignia\(/);
assert.doesNotMatch(personProfileUniform,/rankMark\.textContent=identity\.rank/);
assert.match(situation,/formationView = assignment\.chain\.find\(item => item\.formationInsigniaId\)/);
assert.match(situation,/createNamedInsignia\(formationView\.formationInsigniaId/);
assert.match(css,/\.situation-identity>\.named-insignia/);
assert.match(css,/\.uniform-rank-mark\{width:46px;height:46px/);
console.log("War Sim v0.4.3.19 rank-insignia and situation-patch QA passed");
