import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const mod = fs.readFileSync(new URL("../src/ui/render/administration.js", import.meta.url), "utf8");

assert.match(app, /createAdministrationRenderer/);
assert.doesNotMatch(app, /function renderAdministration\s*\(/);
assert.match(mod, /export function createAdministrationRenderer/);
assert.doesNotMatch(mod, /from\s+["']\.\.\/\.\.\/(?:commands|services|state|core|selectors)\//);
assert.match(mod, /selectPersonnelAdministration/);
assert.match(mod, /renderList/);
assert.doesNotMatch(mod, /runCommand|store\.|saveToSlot|advanceWorldDays|promotePerson/);

console.log("War Sim v0.4.3.19 administration presentation module QA passed");
