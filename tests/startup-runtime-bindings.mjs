import assert from "node:assert/strict";
import fs from "node:fs";
import { createHistoryArchiveController } from "../src/ui/historyArchive.js";

const backing = new Map();
const storage = {
  getItem(key) { return backing.has(key) ? backing.get(key) : null; },
  setItem(key, value) { backing.set(key, String(value)); },
  removeItem(key) { backing.delete(key); },
};
let changes = 0;
const history = createHistoryArchiveController({ onChange: () => { changes += 1; }, storage });
assert.equal(typeof history.write, "function", "history archive controller must expose write() for profile archive editing");
history.write("person-career-activity", "person-1", new Set(["activity-1", "activity-2"]));
assert.deepEqual([...history.read("person-career-activity", "person-1")].sort(), ["activity-1", "activity-2"]);
assert.equal(changes, 0, "low-level write should not trigger render implicitly");

const app = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const bindingIndex = app.indexOf("const writeUiArchive = historyArchive.write;");
const profileIndex = app.indexOf("personProfile = createPersonProfileController({");
assert.ok(bindingIndex >= 0, "app must bind historyArchive.write as writeUiArchive");
assert.ok(profileIndex > bindingIndex, "writeUiArchive must be defined before the person profile controller is created");
assert.match(app, /readUiArchive,\s*writeUiArchive,/, "person profile composition must receive both archive read and write callbacks");

console.log("War Sim v0.4.3.20 startup runtime binding QA passed");
