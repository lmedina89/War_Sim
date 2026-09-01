import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const soldierIdentity=fs.readFileSync(new URL("../src/ui/render/soldierIdentity.js",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");

assert.match(html,/War Sim v0\.4\.3\.12/);

// Shared military metrics carry dynamic content. Long values must be allowed to wrap
// instead of forcing a narrow grid/card to grow beyond the viewport.
assert.match(css,/\.mil-metric > strong \{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/s);
assert.doesNotMatch(css,/\.mil-metric > strong \{[^}]*white-space:\s*nowrap/s);

// Soldier Identity award cards are the concrete iPhone regression case.
assert.match(soldierIdentity,/metricBlock\("WHY EARNED",latest\.reason\)/);
assert.match(css,/\.insignia-card\{[^}]*min-width:0;max-width:100%/s);
assert.match(css,/\.insignia-card \.mil-metric,\.insignia-card \.mil-metric>strong\{[^}]*white-space:normal;[^}]*overflow-wrap:anywhere/s);

// Award catalog copy/title must be shrinkable inside its minmax(0,1fr) grid column.
assert.match(css,/\.award-catalog-card>div,\.award-catalog-head,\.award-catalog-head strong\{min-width:0\}/);
assert.match(css,/\.award-catalog-head strong\{overflow-wrap:anywhere\}/);

// Existing mobile containment gates remain in place for the other high-risk dynamic surfaces.
for(const pattern of [
  /\.record-strip\{grid-template-columns:1fr\}/,
  /\.dd214-preview \.mil-metric>strong\{white-space:normal;overflow-wrap:anywhere/,
  /\.situation-identity-copy>span:last-child\{[^}]*white-space:normal;[^}]*overflow-wrap:anywhere/s,
  /\.school-catalog-head strong\{[^}]*overflow-wrap:anywhere/s,
  /\.unit-command-metrics \.mil-metric>strong\{white-space:normal;overflow-wrap:anywhere/,
  /\.modal\{max-width:calc\(100% - 12px\)\}/
]) assert.match(css,pattern);

// Fixed labels may stay nowrap; dynamic military metric values may not regress back to it.
assert.match(css,/\.screen-tabs button\{[^}]*white-space:nowrap/s);

console.log("War Sim v0.4.3.12 mobile UI hardening QA passed");
