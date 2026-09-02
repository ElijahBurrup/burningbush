/**
 * QA probe 3 — LABELS, FORMATS AND HOUSE STYLE.
 *
 * One idea should be called one thing everywhere, numbers should be written one way, and a button
 * that does the same job on two screens should carry the same words. This walks every screen the
 * snapshot suite knows about and collects what is actually written, then looks for the places the
 * app contradicts itself.
 */
const { chromium, open, stopServer } = require('C:/Projects/BurningBush/tests/lib/harness');
const SCREENS = require('C:/Projects/BurningBush/tests/snapshot/screens');

const findings = [];
const flag = (area, detail) => findings.push({ area, detail });

// One idea, one name. Left is what the app should say; right is what it must not say instead.
const SYNONYMS = [
  ['Spaced Repetition', /\bspaced repitition\b|\bspaced-repetition\b/i],
  ['memory palace',     /\bmind palace\b/i],
  ['known by heart',    /\bmemorised by heart\b/i],
];

(async () => {
  const browser = await chromium().launch();
  const page = await open(browser, { which: 'built' });   // open() returns the page itself
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  const texts = {};
  for (const s of SCREENS) {
    try {
      await page.evaluate(go => { eval('(' + go + ')()'); }, String(s.go));
      await page.waitForTimeout(40);
      const t = await page.evaluate(sel => {
        const host = sel ? document.querySelector(sel) : document.querySelector('.view.active');
        return host ? host.innerText : '';
      }, s.sel || null);
      texts[s.name] = t || '';
    } catch (e) { flag('screen', `${s.name}: could not be drawn — ${String(e.message).split('\n')[0]}`); }
  }

  /* ---- 1. one idea, one name ---- */
  Object.entries(texts).forEach(([name, t]) => {
    SYNONYMS.forEach(([should, wrong]) => {
      const m = t.match(wrong);
      if (m) flag('wording', `${name}: says "${m[0]}" where the app elsewhere says "${should}"`);
    });
  });

  /* ---- 2. numbers written one way ---- */
  Object.entries(texts).forEach(([name, t]) => {
    // a bare decimal that is really a count, e.g. "3.0 verses"
    const dec = t.match(/\b\d+\.0\b/);
    if (dec) flag('format', `${name}: writes a whole number as "${dec[0]}"`);
    // two spaces mid-sentence, usually a template seam
    if (/[a-z]{2}  [A-Za-z]/.test(t)) flag('format', `${name}: a double space mid-sentence`);
    // a sentence that ends without punctuation before a capital, usually a missing full stop
    const seam = t.match(/[a-z]{3}\.[A-Z][a-z]{3}/);
    if (seam) flag('format', `${name}: no space after a full stop — "${seam[0]}"`);
  });

  /* ---- 3. buttons doing the same job should read the same ---- */
  const buttons = {};
  for (const s of SCREENS) {
    try {
      await page.evaluate(go => { eval('(' + go + ')()'); }, String(s.go));
      await page.waitForTimeout(30);
      const list = await page.evaluate(() => {
        const v = document.querySelector('.view.active');
        return v ? [...v.querySelectorAll('button')].filter(b => b.offsetParent !== null)
          .map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(x => x && x.length < 34) : [];
      });
      list.forEach(l => { (buttons[l] = buttons[l] || []).push(s.name); });
    } catch (e) {}
  }
  // the same action written two ways
  const PAIRS = [
    [/^Done$/i, /^Amen · done$/i, 'Done'],
    [/^Save$/i, /^Save & done$/i, 'Save'],
    [/^Begin Practice$/i, /^Begin practice$/i, 'Begin Practice'],
    [/^Got it!?$/i, /^Got It!?$/i, 'Got it'],
  ];
  const labels = Object.keys(buttons);
  PAIRS.forEach(([a, bb, name]) => {
    const ha = labels.filter(l => a.test(l)), hb = labels.filter(l => bb.test(l));
    if (ha.length && hb.length && ha[0] !== hb[0])
      flag('label', `"${ha[0]}" and "${hb[0]}" are the same action written two ways (${name})`);
  });

  /* ---- 4. book title capitalisation on buttons, which is the house rule ---- */
  const SMALL = new Set(['a','an','and','as','at','but','by','for','if','in','of','on','or','the','to','up','via','vs']);
  labels.forEach(l => {
    if (!/^[A-Za-z][a-z]+ [a-z]/.test(l)) return;              // only plain multi-word labels
    if (/[.!?:·]/.test(l)) return;                              // sentences and compound labels are their own thing
    const words = l.split(/\s+/);
    if (words.length < 2 || words.length > 5) return;
    const lower = words.slice(1).filter(w => /^[a-z]/.test(w) && !SMALL.has(w.toLowerCase()));
    if (lower.length) flag('caps', `button "${l}" is sentence case; the house rule is book title case (on ${buttons[l][0]})`);
  });

  console.log('=== labels, formats and house style ===');
  if (!findings.length) console.log('  nothing found');
  const byArea = {};
  findings.forEach(f => (byArea[f.area] = byArea[f.area] || []).push(f.detail));
  Object.entries(byArea).forEach(([a, list]) => {
    console.log('\n  ' + a.toUpperCase() + ' (' + list.length + ')');
    [...new Set(list)].slice(0, 14).forEach(d => console.log('    · ' + d));
    if (list.length > 14) console.log('    … and ' + (list.length - 14) + ' more');
  });
  console.log('\npage errors: ' + ([...new Set(errs)].join(' | ') || 'none'));
  await browser.close();
  await stopServer();
  process.exit(0);
})();
