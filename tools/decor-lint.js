// decor-lint — the theme-decorator module may only DECORATE.
// It enforces the contract in the "THEME DECORATORS" comment block: decorators must not
// touch app state/logic; the only sanctioned state bridge is DecorAPI (which alone may read Prog).
// Run:  node tools/decor-lint.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const m = html.match(/\/\*\s*===== THEME DECORATORS[\s\S]*?===== END THEME DECORATORS ===== \*\//);
if (!m) { console.error('decor-lint: markers not found'); process.exit(1); }
let block = m[0];

// Strip comments (the contract comment itself names the forbidden identifiers).
block = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
// Remove the sanctioned DecorAPI bridge (it alone may read Prog), so we scan only the
// decorators + helpers that must stay side-effect-free.
block = block.replace(/const DecorAPI = Object\.freeze\(\{[\s\S]*?\}\);/, '');

const FORBID = /\b(Prog|SRS|Store|localStorage|saveProg|gradeKey|startLesson|openPaywall|fetch)\b|\bshow\s*\(|\brender[A-Z]\w*\s*\(/g;
const hits = [];
block.split('\n').forEach((line, i) => {
  let mm; FORBID.lastIndex = 0;
  while ((mm = FORBID.exec(line))) hits.push({ i, tok: mm[0].trim(), line: line.trim().slice(0, 100) });
});

// Every decorator entry must tag its nodes with the class "theme-decor".
const decorators = (block.match(/\b(buddy|quest|glass|illumined|classic)\s*:\s*\(/g) || []).length;
const tagCount = (block.match(/theme-decor/g) || []).length;

console.log('=== decor-lint: theme decorator module ===');
if (hits.length) {
  hits.forEach(h => console.log(`  FORBIDDEN "${h.tok}"  →  ${h.line}`));
  console.log(`\n${hits.length} violation(s). Decorators may only read DecorAPI + the DOM.`);
  process.exit(1);
}
if (decorators > 0 && tagCount < decorators) {
  console.log('  Each decorator must give its nodes class "theme-decor".');
  process.exit(1);
}
console.log(`PASS — ${decorators} decorator(s), side-effect-free, all nodes tagged .theme-decor.`);
