/**
 * QA probe 1 — TRANSITIONS AND WHERE YOU LAND.
 *
 * The regression suite pins what each screen looks like. This asks the questions it cannot: leave
 * every screen every way it can be left, and check you end up somewhere sensible, with no error and
 * nothing of yours lost on the way.
 *
 * Findings are candidates, not diffs. Each one names the screen, the exit, and what went wrong.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Projects/BurningBush/tests/lib/harness');

const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
            '.webmanifest': 'application/manifest+json', '.json': 'application/json',
            '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  const f = path.join('C:/Projects/BurningBush', decodeURIComponent(q.url.split('?')[0]));
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { r.writeHead(404).end(); return; }
    r.writeHead(200, { 'Content-Type': T[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  });
});

const findings = [];
const flag = (area, detail) => findings.push({ area, detail });

(async () => {
  await new Promise(r => server.listen(8840, '127.0.0.1', r));
  const b = await chromium().launch();
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8840/burningbush/index.html', { waitUntil: 'load' });

  // a well-stocked account so every screen has something to draw
  await p.evaluate(() => {
    Prog.onboarded = true;
    Prog.doneSkills = ['snd:0-4', 'snd:5-9'].concat([1,2,3,4,5,40,41,42,43].map(n => 'book:' + n))
      .concat(Object.values(VIDEOS).filter(v => v.src).map(v => v.skill));
    Prog.memorized = ['1:1:1','2:2:2','43:3:16','19:23:1','45:8:28'];
    Prog.memorized.forEach(k => { Prog.verseSR = Prog.verseSR || {}; Prog.verseSR[k] = { learnedAt: Date.now()-3*864e5, step: 2, dueAt: Date.now()-864e5, r0: 1 }; });
    Prog.palaces = [{ place: 'Home', stations: ['Door','Hall','Kitchen'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { '1:1:1': { p:0, room:'Door' } };
    Prog.talents = 900; Prog.scratchWon = ['verse','palace','journey','stories'];
    Prog.dailyGoal = 3;
    saveProg(); bustCaches(); updateTabLocks(); syncTabOrder(false);
    if (typeof Onboard !== 'undefined' && Onboard.active()) el('obov').classList.remove('on');
  });

  const snapshot = () => p.evaluate(() => ({
    view: (document.querySelector('.view.active') || {}).id || null,
    modals: [...document.querySelectorAll('.modal')].filter(m => (m.style.display || '') === 'flex').map(m => m.id || '(anon)'),
    verses: (Prog.memorized || []).length,
    talents: Prog.talents || 0,
    palaces: (Prog.palaces || []).filter(Boolean).length,
    skills: (Prog.doneSkills || []).length,
    goal: Prog.dailyGoal,
    text: (document.querySelector('.view.active') || {}).innerText || '',
  }));

  /* ---------- 1. every close control on every screen ---------- */
  const SCREENS = [
    ['learn',   () => { show('learn'); renderPath(); }],
    ['verse',   () => { show('verse'); renderVerse(); }],
    ['palace',  () => { show('palace'); renderPalace(); }],
    ['journey', () => { show('journey'); renderJourney(); }],
    ['stories', () => { show('stories'); renderStories(); }],
  ];

  for (const [name, go] of SCREENS) {
    await p.evaluate(go);
    const base = await snapshot();
    if (base.view !== name) flag('tab', `${name}: show() left the app on "${base.view}"`);
    if (errs.length) { flag('error', `${name}: ${errs.slice(-1)}`); errs.length = 0; }
  }

  /* ---------- 2. the back button, from everywhere ---------- */
  for (const [name, go] of SCREENS) {
    const r = await p.evaluate(async goFn => {
      eval('(' + goFn + ')()');
      await new Promise(r2 => setTimeout(r2, 60));
      const from = (document.querySelector('.view.active') || {}).id;
      const handled = appBack();
      await new Promise(r2 => setTimeout(r2, 120));
      return { from, handled, to: (document.querySelector('.view.active') || {}).id,
               stuck: (document.querySelector('.view.active') || {}).id === from && !handled };
    }, go.toString());
    if (r.from !== 'learn' && r.to === r.from && r.handled)
      flag('back', `${name}: back reported handled but the screen did not change`);
    if (errs.length) { flag('error', `back from ${name}: ${errs.slice(-1)}`); errs.length = 0; }
  }

  /* ---------- 3. every ✕ and ← on every screen leads somewhere ---------- */
  for (const [name, go] of SCREENS) {
    const exits = await p.evaluate(async goFn => {
      eval('(' + goFn + ')()');
      await new Promise(r2 => setTimeout(r2, 60));
      const v = document.querySelector('.view.active');
      return [...v.querySelectorAll('button')]
        .filter(x => x.offsetParent !== null)
        .filter(x => /^[✕←]/.test(x.textContent.trim()) || x.classList.contains('lclose'))
        .map(x => x.id || x.className).slice(0, 6);
    }, go.toString());
    for (const id of exits) {
      const r = await p.evaluate(async ([goFn, sel]) => {
        eval('(' + goFn + ')()');
        await new Promise(r2 => setTimeout(r2, 60));
        const v = document.querySelector('.view.active');
        const btn = sel.startsWith('.') || sel.includes(' ')
          ? v.querySelector('.' + sel.split(' ').join('.'))
          : document.getElementById(sel);
        if (!btn) return { skipped: true };
        const before = (document.querySelector('.view.active') || {}).id;
        btn.click();
        await new Promise(r2 => setTimeout(r2, 200));
        const after = (document.querySelector('.view.active') || {}).id;
        const blank = ((document.querySelector('.view.active') || {}).innerText || '').trim().length < 20;
        return { before, after, blank };
      }, [go.toString(), id]);
      if (r.skipped) continue;
      if (r.blank) flag('exit', `${name}: pressing "${id}" left a blank screen (${r.after})`);
      if (errs.length) { flag('error', `${name} exit "${id}": ${errs.slice(-1)}`); errs.length = 0; }
    }
  }

  /* ---------- 4. nothing of the reader's is lost by moving around ---------- */
  const before = await snapshot();
  await p.evaluate(async () => {
    for (const t of ['learn','verse','palace','journey','stories','verse','learn']) {
      show(t); await new Promise(r => setTimeout(r, 40));
    }
  });
  const after = await snapshot();
  ['verses','talents','palaces','skills','goal'].forEach(f => {
    if (String(before[f]) !== String(after[f]))
      flag('data', `moving between tabs changed ${f}: ${before[f]} -> ${after[f]}`);
  });

  /* ---------- 5. rapid tab switching, which is how a real thumb behaves ---------- */
  await p.evaluate(async () => {
    const tabs = [...document.querySelectorAll('.tabbar button')];
    for (let i = 0; i < 40; i++) tabs[i % tabs.length].click();
    await new Promise(r => setTimeout(r, 400));
  });
  const rapid = await snapshot();
  if (errs.length) { flag('error', `rapid tab switching: ${[...new Set(errs)].join(' | ')}`); errs.length = 0; }
  if (rapid.modals.length) flag('nav', `rapid tab switching left a modal open: ${rapid.modals.join(', ')}`);
  ['verses','talents','palaces','skills'].forEach(f => {
    if (String(before[f]) !== String(rapid[f]))
      flag('data', `rapid switching changed ${f}: ${before[f]} -> ${rapid[f]}`);
  });

  console.log('=== transitions and landings ===');
  if (!findings.length) console.log('  nothing found');
  findings.forEach(f => console.log('  [' + f.area + '] ' + f.detail));
  console.log('\nuncaught page errors: ' + ([...new Set(errs)].join(' | ') || 'none'));
  await b.close();
  server.close();
})();
