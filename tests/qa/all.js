#!/usr/bin/env node
/**
 * tests/qa/all.js — run every QA probe, one after another, and report.
 *
 *   node tests/qa/all.js                 every probe
 *   node tests/qa/all.js --only=hostile  just the probes whose name contains "hostile"
 *   node tests/qa/all.js --built         probes that support it, against the published artifact
 *   node tests/qa/all.js --list          what would run
 *
 * The probes are not a regression suite: each asks a question a suite cannot, and prints findings
 * rather than passes. This runner exists so nobody has to remember thirty file names, and so a
 * release can say "every probe was run" and mean it.
 *
 * One browser at a time, in this process, because this machine is short of memory: two Playwright
 * runs at once have been killed by the system. Each probe gets its own node process so one crash
 * cannot take the rest down, and a probe that hangs is stopped rather than left.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1] || '';
const built = args.includes('--built');
const TIMEOUT = Number((args.find(a => a.startsWith('--timeout=')) || '').split('=')[1] || 600) * 1000;

// nlt-live asks production for a paid translation: it belongs to a release check, not a sweep.
const SKIP = new Set(['all.js', 'nlt-live.js']);

const probes = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && !SKIP.has(f))
  .filter(f => !only || f.includes(only))
  .sort();

if (args.includes('--list')) { console.log(probes.join('\n')); process.exit(0); }

const t0 = Date.now();
const results = [];
console.log('QA probes — ' + probes.length + (built ? ', against the built artifact' : ''));

for (const file of probes) {
  process.stdout.write('\n— ' + file.replace(/\.js$/, '') + '\n');
  const r = spawnSync(process.execPath, [path.join(__dirname, file), ...(built ? ['--built'] : [])],
    { encoding: 'utf8', timeout: TIMEOUT });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (out) console.log(out.split('\n').map(l => '  ' + l).join('\n'));
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  // A probe reports findings its own way; the exit code is what it thinks of them.
  results.push({ file, status: timedOut ? 'timed out' : r.status === 0 ? 'clean' : 'findings', code: r.status });
}

const by = s => results.filter(r => r.status === s);
console.log('\n' + '='.repeat(64));
console.log('clean ' + by('clean').length + ' · findings ' + by('findings').length + ' · timed out ' + by('timed out').length +
  ' · ' + Math.round((Date.now() - t0) / 1000) + 's');
for (const r of results.filter(x => x.status !== 'clean')) console.log('  ' + r.status.padEnd(9) + r.file);
process.exitCode = by('findings').length || by('timed out').length ? 1 : 0;
