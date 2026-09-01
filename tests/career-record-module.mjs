import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const mod = fs.readFileSync(new URL("../src/ui/render/careerRecord.js", import.meta.url), "utf8");

assert.match(app, /createCareerRecordRenderer/);
assert.match(app, /renderCareerRecord\(state, career, assignment, squad\)/);
assert.doesNotMatch(app, /SERVICE RECORD HIGHLIGHTS/);
assert.match(mod, /SERVICE RECORD HIGHLIGHTS/);
assert.match(mod, /Required Qualifications \/ PME/);
assert.match(mod, /Ribbons, Medals & Decorations/);
assert.match(mod, /onOpenPromotionProgress/);
assert.doesNotMatch(mod, /\.\.\/\.\.\/commands\//);
assert.doesNotMatch(mod, /\.\.\/\.\.\/core\//);
assert.doesNotMatch(mod, /\.\.\/\.\.\/state\//);

console.log("career-record module checks passed");
