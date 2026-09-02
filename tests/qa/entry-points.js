/**
 * QA probe 4 — ONBOARDING, AND THE FRONT DOORS OF EVERY FLOW.
 *
 * Every function a screen can be entered by, handed the things it will one day actually be handed:
 * an index that no longer exists, a reference that is not a verse, a key for something deleted.
 * A throw here is a white screen for somebody.
 */
const { chromium, open, stopServer } = require('C:/Projects/BurningBush/tests/lib/harness');

const findings = [];
const flag = (area, detail) => findings.push({ area, detail });

(async () => {
  const browser = await chromium().launch();
  const page = await open(browser, { which: 'built' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  /* ---- 1. entry points handed rubbish ---- */
  const calls = await page.evaluate(() => {
    const out = [];
    const attempt = (label, fn) => { try { fn(); out.push([label, 'ok']); }
                                     catch (e) { out.push([label, e.message.split('\n')[0]]); } };
    Prog.palaces = []; Prog.memorized = []; Prog.verseLoc = {}; saveProg(); bustCaches();

    attempt('renderMyPalace(0) with no palaces',      () => renderMyPalace(0));
    attempt('renderMyPalace(99)',                     () => renderMyPalace(99));
    attempt('renderPalaceWalk("nope")',               () => renderPalaceWalk('nope'));
    attempt('startPalaceEdit(0) with no palaces',     () => startPalaceEdit(0));
    attempt('renderBookScreen(0)',                    () => renderBookScreen(0));
    attempt('renderBookScreen(67)',                   () => renderBookScreen(67));
    attempt('renderChapterScreen(1, 999)',            () => renderChapterScreen(1, 999));
    attempt('openVerseWizard(99, 1, 1)',              () => openVerseWizard(99, 1, 1, () => {}));
    attempt('openVerseWizard(1, 999, 999)',           () => openVerseWizard(1, 999, 999, () => {}));
    attempt('editVerseScene(99, 1, 1)',               () => editVerseScene(99, 1, 1, () => {}, () => {}));
    attempt('askVerseIn("not-a-key")',                () => askVerseIn('not-a-key'));
    attempt('startLesson(undefined)',                 () => startLesson(undefined));
    attempt('openVideoScreen("nope")',                () => openVideoScreen('nope', () => {}));
    attempt('verseHitHTML on a bad hit',              () => verseHitHTML({ b: 99, c: 1, v: 1, at: 0, len: 1, txt: '' }));
    attempt('stationName(undefined)',                 () => stationName(undefined));
    attempt('bookName(0) / bookName(99)',             () => { bookName(0); bookName(99); });
    attempt('pegFor(-1) / pegFor(9999)',              () => { pegFor(-1); pegFor(9999); });
    attempt('kjvText(99, 999, 999)',                  () => kjvText(99, 999, 999));
    return out;
  });
  calls.forEach(([label, res]) => { if (res !== 'ok') flag('crash', `${label} → ${res}`); });

  /* ---- 2. onboarding, walked start to finish ---- */
  const onb = await page.evaluate(async () => {
    const out = { steps: 0, errors: [], stuck: null };
    Prog = migrateProg(null); saveProg();
    Store.remove('vv_acct'); Store.remove('vv_token');
    try { Onboard.start(); } catch (e) { out.errors.push('start: ' + e.message); return out; }
    if (!Onboard.active()) { out.errors.push('Onboard.start() did not open'); return out; }
    // press whatever moves it forward, up to a generous number of steps
    for (let i = 0; i < 40 && Onboard.active(); i++) {
      const host = document.getElementById('obscroll');
      const btns = [...host.querySelectorAll('button')].filter(b => b.offsetParent !== null && !b.id.startsWith('obBack'));
      if (!btns.length) { out.stuck = 'step ' + i + ' has no way forward'; break; }
      const txt = (host.innerText || '');
      if (/undefined|NaN|\[object/.test(txt)) out.errors.push('step ' + i + ': shows undefined/NaN');
      try { btns[btns.length - 1].click(); } catch (e) { out.errors.push('step ' + i + ': ' + e.message); break; }
      await new Promise(r => setTimeout(r, 60));
      out.steps++;
    }
    out.finished = !Onboard.active();
    out.onboarded = !!Prog.onboarded;
    out.landedOn = (document.querySelector('.view.active') || {}).id;
    return out;
  });
  if (onb.stuck) flag('onboarding', onb.stuck);
  onb.errors.forEach(e => flag('onboarding', e));
  if (!onb.finished) flag('onboarding', `did not finish after ${onb.steps} steps — a reader could be stuck`);
  else {
    if (!onb.onboarded) flag('onboarding', 'finished without marking the profile onboarded');
    if (!onb.landedOn) flag('onboarding', 'finished on no screen at all');
  }

  /* ---- 3. the app reopened on every tab it can remember ---- */
  for (const tab of ['learn', 'verse', 'palace', 'journey', 'stories']) {
    const r = await page.evaluate(async t => {
      Store.set('vv_tab', t);
      // a half-built account: some things missing that a real one would have
      Prog.palaces = []; Prog.memorized = []; Prog.verseLoc = {}; Prog.verseSR = {};
      Prog.onboarded = true; saveProg(); bustCaches();
      let err = null;
      try { show(t); } catch (e) { err = e.message.split('\n')[0]; }
      await new Promise(r2 => setTimeout(r2, 100));
      const v = document.querySelector('.view.active');
      return { err, id: v ? v.id : null, len: v ? (v.innerText || '').trim().length : 0 };
    }, tab);
    if (r.err) flag('boot', `reopening on "${tab}" throws: ${r.err}`);
    if (r.len < 20) flag('boot', `reopening on "${tab}" draws a blank screen`);
  }

  console.log('=== entry points and onboarding ===');
  if (!findings.length) console.log('  nothing found');
  const byArea = {};
  findings.forEach(f => (byArea[f.area] = byArea[f.area] || []).push(f.detail));
  Object.entries(byArea).forEach(([a, list]) => {
    console.log('\n  ' + a.toUpperCase() + ' (' + list.length + ')');
    [...new Set(list)].forEach(d => console.log('    · ' + d));
  });
  console.log('\npage errors: ' + ([...new Set(errs)].slice(0, 4).join(' | ') || 'none'));
  await browser.close();
  await stopServer();
  process.exit(0);
})();
