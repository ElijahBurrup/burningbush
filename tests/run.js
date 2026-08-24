#!/usr/bin/env node
/**
 * tests/run.js — the whole suite.
 *
 *   node tests/run.js                everything
 *   node tests/run.js --fast         skip the snapshot sweep (the slow one)
 *   node tests/run.js --built        also render-check the published artifact over HTTP
 *   node tests/run.js static|spec|snapshot|layout    just that layer
 */
const { spawnSync } = require('child_process');
const path = require('path');
const ROOT = __dirname;

const has = k => process.argv.includes('--' + k);
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));

const LAYERS = [
  { name: 'static', file: 'static/check.js', args: [] },
  { name: 'spec', file: 'spec/behaviour.js', args: [] },
  { name: 'snapshot', file: 'snapshot/run.js', args: [], slow: true },
  { name: 'layout', file: 'layout/overflow.js', args: [], slow: true },
];

const run = (file, args) => spawnSync(process.execPath, [path.join(ROOT, file), ...args], { stdio: 'inherit' }).status || 0;

let failed = 0;
const t0 = Date.now();
console.log('Burning Bush — regression suite\n' + '='.repeat(48));

for (const L of LAYERS) {
  if (only.length && !only.includes(L.name)) continue;
  if (has('fast') && L.slow) { console.log(`\n— ${L.name}: skipped (--fast)`); continue; }
  console.log(`\n— ${L.name}`);
  failed += run(L.file, L.args) ? 1 : 0;
}

// The published artifact must render exactly like the source. Served over HTTP because its
// asset paths are absolute for the trailing-slash-less production URL.
if (has('built') && (!only.length || only.includes('snapshot'))) {
  console.log('\n— snapshot (built artifact, served as production)');
  failed += run('snapshot/run.js', ['--built']) ? 1 : 0;
}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log('\n' + '='.repeat(48));
if (failed) { console.error(`FAIL — ${failed} layer(s) failed in ${secs}s`); process.exit(1); }
console.log(`PASS — every layer green in ${secs}s`);
