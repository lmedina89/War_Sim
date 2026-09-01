import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const uniform = fs.readFileSync(new URL("../src/ui/render/personProfileUniform.js", import.meta.url), "utf8");
const award = fs.readFileSync(new URL("../src/ui/awardPresentation.js", import.meta.url), "utf8");

assert.match(app, /createPersonProfileUniformRenderer/);
assert.match(app, /awardDeviceLabel/);
assert.doesNotMatch(app, /function createProfileUniform\s*\(/);
assert.doesNotMatch(app, /function awardDeviceLabel\s*\(/);
assert.match(uniform, /export function createPersonProfileUniformRenderer/);
for (const text of ["Service Uniform", "U.S. ARMY", "NO RIBBONS", "uniform-ribbon-rack", "uniform-badge-rack"]) {
  assert.match(uniform, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.doesNotMatch(uniform, /from\s+["']\.\.\/\.\.\/(?:commands|services|state|core|selectors)\//);
assert.doesNotMatch(uniform, /store\.|runCommand|saveToSlot|advanceWorldDays|promotePerson/);
assert.match(award, /export function awardDeviceLabel/);
for (const text of ["oak_leaf_cluster", "service_star", "numeral", "knot"]) assert.match(award, new RegExp(text));
assert.doesNotMatch(award, /from\s+["']/);

console.log("War Sim person-profile presentation cleanup QA passed");
