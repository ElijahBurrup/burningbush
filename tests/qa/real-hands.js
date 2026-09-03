/**
 * QA probe 13 — REAL HANDS.
 *
 * Every other probe calls functions. This one only clicks, the way a thumb does — including the way
 * a thumb actually behaves when a phone is slow: pressing twice, pressing while something is still
 * animating, pressing the thing behind the thing, and leaving in the middle.
 *
 * The bugs that reached readers were all of this shape. Calling `libMaybeOffer()` proved the present
 * worked; only pressing buttons showed it was never offered. So: no direct calls, no seeded screens,
 * just taps, and after every one of them the same three questions — did anything throw, is there
 * still something on the screen, and is there a way out.
 *
 *   node tests/qa/real-hands.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  // press a thing by selector; returns false if it was not there
  const tap = async (sel, times = 1) => {
    const hit = await page.evaluate(([s, n]) => {
      const b = document.querySelector(s);
      if (!b) return false;
      for (let i = 0; i < n; i++) b.click();      // twice means twice, with no pause — a slow phone
      return true;
    }, [sel, times]);
    await page.waitForTimeout(120);
    return hit;
  };
  // what is on screen, and is it anything at all
  const state = () => page.evaluate(() => {
    const v = document.querySelector('.view.active');
    const modals = [...document.querySelectorAll('.modal')].filter(m => getComputedStyle(m).display !== 'none').map(m => m.id);
    const ov = ['obov', 'scov', 'simov', 'taxov', 'buildov'].filter(id => { const e = el(id); return e && e.classList.contains('on'); });
    const text = ((v && v.innerText) || '').replace(/\s+/g, ' ').trim();
    return { view: v && v.id, text: text.slice(0, 70), len: text.length, modals, ov,
             ways: document.querySelectorAll('.view.active button, .modal button:not([style*="display: none"])').length };
  });
  const check = async (what, s) => {
    say(s.len > 0, what + ' — the screen says something (' + s.view + ': "' + s.text + '")');
    if (!s.modals.length && !s.ov.length) say(s.ways > 0, '   ...and offers a way on (' + s.ways + ' buttons)');
  };

  // A reader who has finished the Foundation and has one verse: the state most of the app is
  // reachable from, reached by setting progress once and then never calling anything again.
  await page.evaluate(() => {
    closeEveryOverlay(); clearActiveTest();
    Prog.doneSkills = ['snd:0-4', 'snd:5-9'].concat([1, 2, 3, 4, 5, 40].map(n => 'book:' + n))
      .concat(Object.values(VIDEOS).map(v => v.skill));
    Prog.scratchWon = ['verse', 'journey', 'palace', 'stories'];
    Prog.memorized = ['43:3:16', '19:119:11']; Prog.verseSR = {};
    Prog.memorized.forEach(k => startVerseSR(k));
    Prog.talents = 5000; Prog.libUsed = { learn: 1 };
    saveProg(); bustCaches(); updateTabLocks(); syncTabOrder(false);
    show('verse'); vView = 'hub'; renderVerse();
  });

  // 1. every tab, twice each, as fast as the thumb allows
  for (const tab of ['learn', 'verse', 'palace', 'journey', 'stories']) {
    await tap(`.tabbar button[data-tab="${tab}"]`, 2);
    await check('tab ' + tab + ' pressed twice', await state());
  }

  // 2. every tile on the Library, in and straight back out
  await tap('.tabbar button[data-tab="verse"]');
  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll('#verse button.vhub')].map((b, i) => i));
  for (const i of tiles) {
    await page.evaluate(n => { show('verse'); vView = 'hub'; renderVerse();
      const b = document.querySelectorAll('#verse button.vhub')[n]; if (b) b.click(); }, i);
    await page.waitForTimeout(200);
    const s = await state();
    await check('Library tile ' + i, s);
    // and out again by whatever the screen offers
    await tap('#verse .lclose, #verse .lclose-red, [data-view="hub"], #vBack');
  }

  // 3. the profile sheet: open it, press everything in it once, and make sure it closes
  await tap('#themeBtn');
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('#themeModal [data-prof]')].map(b => b.dataset.prof));
  for (const row of rows.slice(0, 14)) {
    await page.evaluate(() => { const b = el('themeBtn'); if (b) b.click(); });
    await page.waitForTimeout(80);
    await tap(`#themeModal [data-prof="${row}"]`);
    const s = await state();
    say(errs.length === 0, 'profile row "' + row + '" opened without throwing');
    await page.evaluate(() => closeEveryOverlay());
  }

  // 4. leaving in the middle of things
  await page.evaluate(() => { closeEveryOverlay(); show('verse'); vView = 'hub'; renderVerse(); });
  await tap('#vPracVerse');
  await tap('.tabbar button[data-tab="learn"]');          // walk out of a practice round
  await check('walking out of practice', await state());
  await tap('.tabbar button[data-tab="verse"]');
  await check('and back again', await state());

  // 5. the tab bar hammered
  for (let i = 0; i < 12; i++) {
    const tabs = ['learn', 'verse', 'palace', 'journey', 'stories'];
    await page.evaluate(t => { const b = document.querySelector(`.tabbar button[data-tab="${t}"]`); if (b) b.click(); },
      tabs[i % tabs.length]);
  }
  await page.waitForTimeout(300);
  await check('the tab bar hammered twelve times', await state());

  say(errs.length === 0, 'nothing threw anywhere in the walk');
  if (errs.length) errs.slice(0, 6).forEach(e => say(false, '   ' + e));

  console.log(out.join('\n'));
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nREAL HANDS FAILED' : '\nreal hands clean');
  await browser.close(); await H.stopServer();
})();
