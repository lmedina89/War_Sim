import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/ui/styles.css',import.meta.url),'utf8');
assert.match(css,/\.breadcrumbs button, \.unit-link \{ min-height: 44px;/,'breadcrumb/unit links keep 44px mobile touch target');
assert.match(css,/\.compact-button \{ min-height: 44px;/,'compact buttons keep 44px mobile touch target');
assert.match(css,/\.inbox-item \.compact-button\{min-height:44px;/,'inbox actions keep 44px mobile touch target');
assert.match(css,/input, select \{[^}]*font-size: 16px;/s,'mobile form controls keep 16px text to avoid iOS focus zoom');
assert.match(css,/\.modal-card\{box-sizing:border-box;max-height:calc\(100dvh/s,'dialogs are bounded to dynamic viewport height');
assert.match(css,/padding-bottom:calc\(18px \+ env\(safe-area-inset-bottom\)\)/,'dialogs retain bottom safe-area padding');
assert.match(css,/\.bottom-nav\{bottom:max\(6px,env\(safe-area-inset-bottom\)\)/,'bottom navigation respects iPhone safe area');
console.log('War Sim mobile resilience static QA passed');
