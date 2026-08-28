/**
 * tests/static/check.js — everything provable without a browser.
 * Syntax, the design-token guardrail, the decorator guardrail, the build's own consistency,
 * and a few invariants about the source that are easy to break by accident.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const T = require('../lib/t');
const { describe, is, ok, no } = T;

const ROOT = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

describe('syntax', () => { });
const html = read('src/index.html');
const script = (html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/) || [])[1];
ok(script, 'the app has one inline script');
try { new vm.Script(script); is(1, 1, 'the app script parses'); }
catch (e) { is(String(e.message), '(parses)', 'the app script parses'); }

// Every bundled text has to parse: one stray character in a 4 MB generated file would take the
// whole app down at load, and the five under src/bibles are machine written from api.bible.
const BIBLES = require('fs').readdirSync(require('path').join(__dirname, '../../src/bibles'))
  .filter(n => n.endsWith('.js')).map(n => 'src/bibles/' + n);
for (const f of ['src/sw.js', 'src/strongs.js', 'src/kjvtag.js', 'src/kjv.js', ...BIBLES]) {
  try { new vm.Script(read(f)); is(1, 1, `${path.basename(f)} parses`); }
  catch (e) { is(String(e.message).slice(0, 60), '(parses)', `${path.basename(f)} parses`); }
}

describe('guardrails', () => { });
for (const tool of ['token-lint.js', 'decor-lint.js']) {
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools', tool)], { stdio: 'pipe' }); is(1, 1, `${tool} passes`); }
  catch (e) { is(String(e.stdout || e.message).slice(-200), '(passes)', `${tool} passes`); }
}

describe('build', () => { });
try { execFileSync(process.execPath, [path.join(ROOT, 'bin/build.js'), '--check'], { stdio: 'pipe' }); is(1, 1, 'published output is current'); }
catch (e) { is(String(e.stdout || e.message).slice(-300), '(current)', 'published output is current — run node bin/build.js'); }

describe('source invariants', () => { });
const ver = (script.match(/const APP_VERSION="([^"]+)"/) || [])[1];
ok(/^\d+\.\d+\.\d+$/.test(ver || ''), `APP_VERSION is a semver (${ver})`);
const logTop = (script.match(/const CHANGELOG=\[\s*\{v:"([^"]+)"/) || [])[1];
is(logTop, ver, 'the changelog names the current version first');

// every Store key the app writes should be namespaced, so a shared origin can never collide
const keys = [...script.matchAll(/Store\.(?:set|setJSON|get|getJSON|remove)\("([^"]+)"/g)].map(m => m[1]);
const stray = [...new Set(keys)].filter(k => !/^vv_/.test(k));
is(stray.length, 0, `every Store key is namespaced${stray.length ? ' — stray: ' + stray.join(', ') : ''}`);

// Every el("id") must be produced somewhere, or it is a typo that silently does nothing.
// Ids composed at runtime — id="${closeId}" and friends — cannot be seen by a text scan, so
// they are listed here explicitly. Add to this list only when the id really is dynamic.
const DYNAMIC_IDS = ['lvClose'];   // verseNavBar(b,c,v,closeId) renders id="${closeId}"
const created = new Set([...script.matchAll(/id="([\w-]+)"/g)].map(m => m[1]));
[...html.matchAll(/id="([\w-]+)"/g)].forEach(m => created.add(m[1]));
DYNAMIC_IDS.forEach(id => created.add(id));
const referenced = [...new Set([...script.matchAll(/\bel\("([\w-]+)"\)/g)].map(m => m[1]))];
const orphans = referenced.filter(id => !created.has(id));
is(orphans.length, 0, `every el("id") is produced somewhere${orphans.length ? ' — orphans: ' + orphans.slice(0, 8).join(', ') : ''}`);

// the CSS must not lose its token discipline in themes either
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
ok(style.includes('--rome-red'), 'Roman tokens are defined');
ok(style.includes('.modal.above'), 'the overlay-stacking escape hatch survives');

describe('size', () => { });
const jsLines = script.split('\n').length;
const cssLines = style.split('\n').length;
console.log(`  (source: ${html.split('\n').length} lines — ${jsLines} JS, ${cssLines} CSS)`);
ok(jsLines > 0 && cssLines > 0, 'source measured');

process.exit(T.report('static') ? 1 : 0);
