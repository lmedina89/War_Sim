import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

assert.match(app, /function\s+scrollToCareerTarget\s*\(/, "startup composition must define scrollToCareerTarget");
assert.match(app, /function\s+openOpportunityRecord\s*\(/, "startup composition must define openOpportunityRecord");
assert.match(app, /openOpportunity:\s*openOpportunityRecord/, "achievement controller must receive opportunity navigation callback");
assert.match(app, /onOpenOpportunity:\s*openOpportunityRecord/, "Inbox renderer must receive opportunity navigation callback");

const firstUse = app.indexOf("openOpportunity: openOpportunityRecord");
const definition = app.indexOf("function openOpportunityRecord");
assert.ok(definition >= 0 && firstUse >= 0, "opportunity callback definition and use must both exist");

console.log("War Sim v0.4.3.16 startup composition QA passed");

// Browser startup gate: app.js is served via <script type="module">.
const moduleParse = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: app, encoding: "utf8" });
assert.equal(moduleParse.status, 0, `app.js must parse as an ES module: ${moduleParse.stderr}`);
