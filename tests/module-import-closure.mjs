import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(src).filter(file => /\.js$/.test(file));
let checked = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const specs = [
    ...source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g),
  ].map(match => match[1]);
  for (const spec of specs) {
    const target = path.resolve(path.dirname(file), spec);
    assert.ok(fs.existsSync(target), `${path.relative(root,file)} imports missing relative module ${spec}`);
    checked++;
  }
}
assert.ok(checked > 80, `expected substantial runtime import graph, checked only ${checked} edges`);
console.log(`War Sim runtime module import-closure QA passed (${checked} relative imports)`);
