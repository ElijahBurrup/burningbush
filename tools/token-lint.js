// token-lint — guardrail for the "one app, four apps" theming architecture.
// Base COMPONENT css must read ONLY design tokens (var(--x)). Hardcoded colors are
// allowed only in token-definition sites (:root / .phone[data-theme=...]) and in a
// few decorative rules (logo glow, starfield motes, story-mark shadow, cracked tile).
// Run:  node tools/token-lint.js     (exits non-zero on any violation)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];

function stripBlocks(css) {
  return css
    .replace(/:root\s*\{[^{}]*\}/g, '')
    .replace(/[^{}]*\[data-theme=[^{}]*\{[^{}]*\}/g, '')      // theme token + chrome blocks
    .replace(/\.(sky-star|sky-mote|storymark)[^{}]*\{[^{}]*\}/g, '')
    .replace(/\.logo svg\s*\{[^{}]*\}/g, '')
    .replace(/\.grouphead\.grp-cracked[^{}]*\{[^{}]*\}/g, '');
}

const base = stripBlocks(style);
const violations = [];
base.split(/(?<=[;{}])/).forEach(seg => {
  const s = seg.trim();
  if (!s || s.includes('raw-ok')) return;
  if (/^--[\w-]+\s*:/.test(s)) return;          // token definition
  if (s.includes('data:image')) return;         // inline SVG data-URI
  const noVar = s.replace(/var\([^)]*\)/g, 'var()');
  const hex = noVar.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const rgba = noVar.match(/\brgba?\([0-9][^)]*\)/g) || [];
  if (hex.length || rgba.length) violations.push({ seg: s.slice(0, 120), colors: [...hex, ...rgba] });
});

console.log('=== token-lint: hardcoded colors in BASE component CSS ===');
if (!violations.length) { console.log('PASS — base CSS reads only tokens.'); process.exit(0); }
violations.forEach(v => console.log(`  ${v.colors.join(', ')}   in:  ${v.seg}`));
console.log(`\n${violations.length} violation(s). Route these through a design token (see :root).`);
process.exit(1);
