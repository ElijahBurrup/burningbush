/**
 * tests/snapshot/run.js — render every screen in every theme and compare against the golden set.
 *
 *   node tests/snapshot/run.js            compare (fails on any difference)
 *   node tests/snapshot/run.js --bless    record the current output as the new golden set
 *   node tests/snapshot/run.js --built    test the published output instead of src/
 *   node tests/snapshot/run.js --theme=X  just one theme
 *   node tests/snapshot/run.js --only=Y   just the screens whose name contains Y
 */
const fs = require('fs');
const path = require('path');
const { chromium, open, stopServer, ROOT } = require('../lib/harness');
const { CAPTURE, hash, shape } = require('../lib/normalize');
const SCREENS = require('./screens');

const THEMES = ['classic', 'illumined', 'glass', 'quest', 'buddy'];
const GOLDEN = path.join(__dirname, 'golden.json');
const arg = k => process.argv.find(a => a.startsWith('--' + k + '='))?.split('=')[1];
const has = k => process.argv.includes('--' + k);

async function main() {
  const bless = has('bless');
  const which = has('built') ? 'built' : 'src';
  const onlyTheme = arg('theme');
  const onlyName = arg('only');
  const themes = onlyTheme ? [onlyTheme] : THEMES;
  const screens = onlyName ? SCREENS.filter(s => s.name.includes(onlyName)) : SCREENS;

  const browser = await chromium().launch();
  const results = {};
  const errors = [];
  let n = 0;

  for (const pro of [false, true]) {
    if (!screens.some(s => !!s.pro === pro)) continue;
    const page = await open(browser, { which, pro, prog: require('../lib/harness').SEEDED });
    for (const theme of themes) {
      await page.evaluate(t => applyTheme(t), theme);
      for (const s of screens.filter(x => !!x.pro === pro)) {
        const key = `${theme}/${s.name}`;
        try {
          await page.evaluate(() => window.__reseed && window.__reseed(12345));
          await page.evaluate(fn => {
            document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
            ['taxov', 'buildov'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on', 'march'); });
            // eslint-disable-next-line no-new-func
            new Function('return (' + fn + ')')()();
          }, s.go.toString());
          await page.waitForTimeout(60);
          const html = await page.evaluate(CAPTURE, s.sel);
          if (html == null) { errors.push(`${key}: element ${s.sel} not found`); continue; }
          results[key] = { h: hash(html), ...shape(html) };
          n++;
        } catch (e) {
          errors.push(`${key}: ${String(e.message).split('\n')[0]}`);
        }
      }
    }
    errors.push(...page.__errors.map(e => `console: ${e}`));
    await page.close();
  }
  await browser.close();
  stopServer();

  if (bless) {
    fs.writeFileSync(GOLDEN, JSON.stringify(results, null, 1));
    console.log(`blessed ${n} snapshots → tests/snapshot/golden.json`);
    if (errors.length) { console.error('\nbut these failed to capture:'); errors.forEach(e => console.error('  ' + e)); process.exit(1); }
    return;
  }

  if (!fs.existsSync(GOLDEN)) { console.error('no golden set — run with --bless first'); process.exit(1); }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const changed = [], missing = [], added = [];
  for (const k of Object.keys(golden)) {
    if (!(k in results)) { missing.push(k); continue; }
    if (results[k].h !== golden[k].h) changed.push(k);
  }
  for (const k of Object.keys(results)) if (!(k in golden)) added.push(k);

  console.log(`snapshots: ${n} captured, ${Object.keys(golden).length} golden`);
  if (changed.length) {
    console.error(`\n${changed.length} screen(s) CHANGED:`);
    for (const k of changed.slice(0, 20)) {
      const a = golden[k], b = results[k];
      console.error(`  ${k}`);
      console.error(`     was  len=${a.len} els=${a.els} btn=${a.buttons} svg=${a.svgs} | ${a.text.slice(0, 70)}`);
      console.error(`     now  len=${b.len} els=${b.els} btn=${b.buttons} svg=${b.svgs} | ${b.text.slice(0, 70)}`);
    }
    if (changed.length > 20) console.error(`  …and ${changed.length - 20} more`);
  }
  if (missing.length) console.error(`\n${missing.length} screen(s) no longer captured: ${missing.slice(0, 8).join(', ')}`);
  if (added.length) console.log(`\n${added.length} new screen(s) (bless to record): ${added.slice(0, 8).join(', ')}`);
  if (errors.length) { console.error(`\n${errors.length} capture error(s):`); errors.slice(0, 10).forEach(e => console.error('  ' + e)); }

  const bad = changed.length + missing.length + errors.length;
  if (bad) { console.error(`\nFAIL — ${bad} problem(s).`); process.exit(1); }
  console.log('PASS — every screen renders exactly as recorded.');
}

main().catch(e => { console.error(e); process.exit(1); });
