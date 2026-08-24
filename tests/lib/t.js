/** tests/lib/t.js — a very small assertion helper, so specs read as statements of fact. */
const results = [];
let group = '';

function describe(name, fn) { group = name; return fn(); }

function check(ok, msg, detail) {
  results.push({ ok: !!ok, name: (group ? group + ' · ' : '') + msg, detail });
  return !!ok;
}
const is = (actual, expected, msg) =>
  check(Object.is(actual, expected), msg, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const ok = (v, msg) => check(!!v, msg, `expected truthy, got ${JSON.stringify(v)}`);
const no = (v, msg) => check(!v, msg, `expected falsy, got ${JSON.stringify(v)}`);
const near = (actual, expected, tol, msg) =>
  check(Math.abs(actual - expected) <= tol, msg, `expected ${expected}±${tol}, got ${actual}`);
const has = (hay, needle, msg) =>
  check(String(hay).includes(needle), msg, `expected to contain ${JSON.stringify(needle)}, got ${JSON.stringify(String(hay).slice(0, 140))}`);
const hasNot = (hay, needle, msg) =>
  check(!String(hay).includes(needle), msg, `expected NOT to contain ${JSON.stringify(needle)}`);

function report(label) {
  const bad = results.filter(r => !r.ok);
  const pad = String(results.length).length;
  console.log(`${label}: ${results.length - bad.length}/${results.length} passed`);
  bad.forEach(r => { console.error(`  ✗ ${r.name}`); if (r.detail) console.error(`      ${r.detail}`); });
  return bad.length;
}

module.exports = { describe, check, is, ok, no, near, has, hasNot, report, results };
