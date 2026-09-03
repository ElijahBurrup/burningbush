/**
 * QA probe 12 — GARBAGE INTO THE NEWEST CODE.
 *
 * `hostile.js` attacks the app's long-standing flows. This one attacks what was written in the last
 * few releases, which is where the bugs actually are: the sound engine, the Library stickers, the
 * distractor pools, the book-lesson guard, and the fields that now travel with an account.
 *
 * Nothing here is a realistic user action. That is the point: none of it should throw, and a throw
 * inside a render is what takes the whole screen down.
 *
 *   node tests/qa/hostile-new.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    const bad = [];
    const tryIt = (what, fn) => { try { fn(); } catch (e) { bad.push(what + ' -> ' + e.message); } };

    Sfx.unlock();

    // ---- the sound engine, given nonsense ----
    [NaN, -1, 0, Infinity, -Infinity, null, undefined, '12', 1e9].forEach(v => {
      tryIt('coins(' + String(v) + ')', () => Sfx.coins(v));
      tryIt('tick(' + String(v) + ')', () => Sfx.tick(v));
      tryIt('wrong(' + String(v) + ')', () => Sfx.wrong(v));
      tryIt('streakDay(' + String(v) + ')', () => Sfx.streakDay(v));
      tryIt('goalStep(' + String(v) + ')', () => Sfx.goalStep(v));
      tryIt('stone(' + String(v) + ')', () => Sfx.stone(v));
      tryIt('knock(' + String(v) + ')', () => Sfx.knock(v));
    });
    [null, undefined, '', 'nope', 42, {}].forEach(v =>
      tryIt('screen(' + JSON.stringify(v) + ')', () => Sfx.screen(v)));

    // ---- distractors, given numbers that are not books ----
    [0, -3, 67, 176, 999, NaN, null, undefined].forEach(n => {
      tryIt('distract(book,' + String(n) + ')', () => distract('book', n, 3));
      tryIt('distract(num,' + String(n) + ')', () => distract('num', n, 3));
      tryIt('otherPictures(name,' + String(n) + ')', () => otherPictures('name', n, 3));
    });
    tryIt('distract asking for more than exists', () => distract('book', 1, 200));
    tryIt('distract asking for none', () => distract('book', 1, 0));

    // ---- the Library, with its record in the wrong shape ----
    const keep = JSON.parse(JSON.stringify(Prog));
    [null, undefined, 'yes', 42, [], { verses: 'later' }].forEach(v => {
      tryIt('hub with libUsed=' + JSON.stringify(v), () => {
        Prog.libUsed = v; show('verse'); vView = 'hub'; renderVerse();
      });
    });
    tryIt('hub with Word for Word switched off', () => {
      Prog.libUsed = {}; setFeat('w4w', false); show('verse'); vView = 'hub'; renderVerse();
      setFeat('w4w', true);
    });
    tryIt('the verse screen with libUsed missing', () => {
      delete Prog.libUsed; Prog.memorized = ['43:3:16'];
      show('verse'); renderLearnedVerse(43, 3, 16, () => {});
    });
    Object.assign(Prog, keep); saveProg(); bustCaches();

    // ---- the book guard, pressed at the wrong moments ----
    tryIt('demanding pictures with no card on screen', () => { show('learn'); bbDemandPicks(['word', 'num']); });
    tryIt('demanding nothing', () => bbDemandPicks([]));
    tryIt('missing pictures for a number that is not a book', () => bbMissingPicks(900));
    tryIt('a lesson for a book that does not exist', () => lessonFor(999, true));
    tryIt('a lesson for nothing at all', () => lessonFor(null, true));

    // ---- what now travels with an account ----
    [null, undefined, 'x', 7, []].forEach(v => {
      tryIt('migrate with libUsed=' + JSON.stringify(v), () => migrateProg({ libUsed: v }));
      tryIt('migrate with compPro=' + JSON.stringify(v), () => migrateProg({ compPro: v }));
    });
    tryIt('merging two accounts with odd Library records', () =>
      mergeProg(migrateProg({ libUsed: null, compPro: 'x' }), migrateProg({ libUsed: { verses: 1 } })));

    // ---- and the screen still works afterwards ----
    Object.assign(Prog, keep); saveProg(); bustCaches();
    tryIt('the Library still draws', () => { show('verse'); vView = 'hub'; renderVerse(); });
    const tiles = document.querySelectorAll('#verse button.vhub').length;
    return { bad, tiles };
  });

  r.bad.slice(0, 25).forEach(b => say(false, b));
  if (!r.bad.length) say(true, 'nothing thrown by any of it');
  else say(false, r.bad.length + ' throw(s) in total');
  say(r.tiles === 7, 'and the Library still draws all seven tiles afterwards');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nHOSTILE FAILED' : '\nhostile clean');
  await browser.close(); await H.stopServer();
})();
