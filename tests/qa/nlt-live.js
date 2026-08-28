/**
 * tests/qa/nlt-live.js — is the New Living Translation actually working in production?
 *
 *   node tests/qa/nlt-live.js
 *   node tests/qa/nlt-live.js --url=https://kingdombuilders.ai/burningbush
 *
 * The regression suite cannot answer this. It runs against a local build with no network, and the
 * NLT is the one translation that is not bundled: it is read live through burningbush-api, which
 * holds the api.bible key. So the only way to know it works is to drive the real page against the
 * real service, which is what this does, on a phone-sized viewport because that is where it is read.
 *
 * Every check is a claim that can fail on its own, so a red line names the thing that is broken
 * rather than "NLT is down".
 */
const { chromium } = require('../lib/harness');

const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const URL = arg('url') || 'https://kingdombuilders.ai/burningbush';

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (detail ? '\n      ' + detail : '')); }
};

(async () => {
  console.log('NLT · live check\n' + '='.repeat(48));
  console.log('page: ' + URL + '\n');

  const b = await chromium().launch();
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  const calls = [];
  page.on('response', r => { if (/\/api\/bible/.test(r.url())) calls.push({ status: r.status(), url: r.url() }); });

  await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);

  const boot = await page.evaluate(() => ({
    version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
    api: typeof API_BASE !== 'undefined' ? API_BASE : null,
    ids: typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS.map(t => t.id) : [],
    nltIsLive: typeof TRANSLATIONS !== 'undefined' && (TRANSLATIONS.find(t => t.id === 'NLT') || {}).api === 'nlt',
  }));
  console.log('the page');
  ok(!!boot.version, 'it loaded', 'no APP_VERSION on the page');
  ok(boot.ids.includes('NLT'), 'the NLT is offered', 'translations: ' + boot.ids.join(','));
  ok(boot.nltIsLive, 'it is wired as a live text rather than a bundled one');
  console.log('      v' + boot.version + ' · api ' + boot.api);

  // the service, straight
  console.log('\nthe service');
  const svc = await page.evaluate(async () => {
    try {
      const r = await fetch(API_BASE + '/bible/nlt?refs=43.3');
      return { status: r.status, body: (await r.text()).slice(0, 200) };
    } catch (e) { return { status: 'threw', body: e.message }; }
  });
  const configured = svc.status === 200;
  ok(configured, 'GET /api/bible/nlt answers 200',
     'HTTP ' + svc.status + '  ' + svc.body +
     (svc.status === 503 ? '\n      → BIBLE_API_KEY is not set on the burningbush-api service.' : ''));

  // the reader
  console.log('\nreading it');
  const read = await page.evaluate(async () => {
    const o = {};
    o.kjv = kjvText(43, 3, 16);
    Prog.memorized = ['43:3:16', '19:23:1']; saveProg();
    setTranslation('NLT');
    await new Promise(r => setTimeout(r, 6000));
    o.john = kjvText(43, 3, 16);
    o.psalm = kjvText(19, 23, 1);
    o.cached = Object.keys(_apiCh).length;
    o.credit = scriptureCopyright();
    setTranslation('KJV');
    o.back = kjvText(43, 3, 16);
    setTranslation('NLT');
    await new Promise(r => setTimeout(r, 500));
    o.again = kjvText(43, 3, 16);
    return o;
  });
  const isKjvJohn = /whosoever believeth/i.test(read.john);
  ok(read.cached >= 2, 'the chapters this reader owns are fetched', 'cached ' + read.cached + ' chapters');
  ok(!isKjvJohn && /one and only Son/i.test(read.john), 'John 3:16 reads New Living, not King James',
     read.john.slice(0, 90));
  ok(/all that I need/i.test(read.psalm), 'Psalm 23:1 reads New Living', read.psalm.slice(0, 90));
  ok(!/shepherd;I/.test(read.psalm), 'poetry lines keep the space between them', read.psalm.slice(0, 90));
  ok(/whosoever believeth/i.test(read.back), 'switching back to King James is untouched', read.back.slice(0, 90));
  ok(read.again === read.john, 'switching forward again is served from cache');
  ok(/Tyndale/i.test(read.credit || ''), 'Tyndale’s attribution is shown', read.credit || '(none)');

  const roundTrips = calls.filter(c => /\/api\/bible/.test(c.url)).length;
  ok(roundTrips <= 3, 'the chapters are batched, not fetched one by one', roundTrips + ' calls');
  calls.slice(0, 4).forEach(c => console.log('      ' + c.status + ' ' + c.url.split('/api/')[1]));

  await b.close();
  console.log('\n' + '='.repeat(48));
  console.log(fail ? `FAIL · ${fail} of ${pass + fail} checks failed` : `PASS · all ${pass} checks`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.stack); process.exit(1); });
