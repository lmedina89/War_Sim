import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const achievement = fs.readFileSync(new URL("../src/ui/dialogs/achievementDialog.js", import.meta.url), "utf8");

assert.match(app, /const COMMAND_DUPLICATE_GUARD_MS = 450;/, "controller must retain a bounded duplicate-interaction guard");
assert.match(app, /commandInteractionGuards = new Map\(\)/, "duplicate guard must be keyed, not a global lock");
assert.match(app, /interactionKey: `activity:\$\{personId\}:\$\{activityId\}`/, "activities must use semantic interaction keys");
assert.match(app, /interactionKey: "time:advance:1"/, "time advance must be protected against duplicate activation");
assert.match(app, /interactionKey: `opportunity:accept:\$\{id\}`/, "opportunity acceptance must be protected against duplicate activation");
assert.match(app, /interactionKey: `decision:\$\{personId\}:\$\{decisionId\}`/, "decision resolution must be protected against duplicate activation");
assert.match(achievement, /ACKNOWLEDGEMENT_GUARD_MS = 450/, "queued achievement acknowledgement must have its own duplicate-tap guard");
assert.match(achievement, /if \(acknowledgementLocked\) return;/, "queued notices must not be consumed by a rapid second acknowledgement");

console.log("War Sim interaction/state consistency hardening QA passed");
