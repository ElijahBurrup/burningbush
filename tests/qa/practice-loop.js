/**
 * QA probe 10 — CAN A ROUND OF PRACTICE ACTUALLY BE FINISHED?
 *
 * Practice Verses draws on a deck. Two rules act on that deck and they pull against each other:
 * answering a verse correctly takes it out of the round, and a verse practised before its four-hour
 * mark is put BACK at the mark so the first real look-back happens sooner. Between them there is an
 * obvious way to get a deck that never empties — and a reader who can never finish a round can
 * never win the Bible, because the Bible is won by finishing one.
 *
 * This answers the deck's questions until it says it is done, and shouts if it never does.
 *
 *   node tests/qa/practice-loop.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    const HOUR = 3600000;
    const res = {};
    const setup = ageHours => {
      closeEveryOverlay(); clearActiveTest(); MS = null;
      Prog.memorized = ['43:3:16', '19:119:11', '40:6:33'];
      Prog.verseSR = {};
      Prog.memorized.forEach(k => { Prog.verseSR[k] = { learnedAt: Date.now() - ageHours * HOUR, step: 1, r0: 0 }; });
      saveProg(); bustCaches();
    };

    // A reader who learned three verses an hour ago and answers every one of them right.
    setup(1);
    let rounds = 0, answered = 0;
    while (deckKeys().length && answered < 200) {
      deckKeys().forEach(k => { markAnswer(k, true, true); answered++; });
      if (!deckKeys().length) break;
      if (++rounds > 20) break;
    }
    res.freshCleared = !deckKeys().length;
    res.freshAnswers = answered;

    // The same reader, five hours on. The harness freezes the clock, so "later" is expressed by
    // moving the verse back rather than moving the clock forward: learned five hours ago, and
    // answered an hour after that — which is an hour BEFORE its four-hour mark.
    Prog.memorized.forEach(k => {
      const o = Prog.verseSR[k];
      o.learnedAt = Date.now() - 5 * HOUR;
      o.lc = o.learnedAt + HOUR;            // cleared early, before the mark
    }); saveProg();
    const backAtMark = deckKeys().length;
    let guard = 0;
    while (deckKeys().length && guard < 60) { deckKeys().forEach(k => markAnswer(k, true, true)); guard++; }
    res.backAtMark = backAtMark;
    res.settles = !deckKeys().length;
    res.passes = guard;

    // And the screen a cleared deck leads to must offer a way on rather than rebuilding itself.
    setup(1);
    deckKeys().forEach(k => markAnswer(k, true, true));
    Prog.memorized.forEach(k => { Prog.verseSR[k].learnedAt = Date.now() - 5 * HOUR; }); saveProg();
    memTestRecent = []; suppressGrowth = false;
    practiceNext(true);
    res.afterClear = (el('verse').innerText || '').replace(/\s+/g, ' ').slice(0, 60);
    res.asksSomething = !!el('mtCheck') || /Deck cleared|done for today|Well done/i.test(res.afterClear);

    // A brand new reader with a single verse must still be given a question, not an empty round.
    closeEveryOverlay(); clearActiveTest(); MS = null;
    Prog.memorized = ['43:3:16']; Prog.verseSR = {};
    startVerseSR('43:3:16'); saveProg(); bustCaches();
    memTestRecent = []; suppressGrowth = false;
    practiceNext(true);
    res.oneVerseAsks = !!el('mtCheck');
    res.oneVerseScreen = (el('verse').innerText || '').replace(/\s+/g, ' ').slice(0, 60);
    return res;
  });

  say(r.freshCleared, 'a round of fresh verses can be cleared (' + r.freshAnswers + ' answers)');
  say(r.backAtMark > 0, 'verses practised early come back at their four hour mark (' + r.backAtMark + ')');
  say(r.settles, '...and clearing them then sticks, in ' + r.passes + ' pass(es)');
  say(r.asksSomething, 'a cleared deck leads somewhere: "' + r.afterClear.trim() + '"');
  say(r.oneVerseAsks, 'a reader with a single verse is still asked something');
  if (!r.oneVerseAsks) say(false, '   ...instead they got: "' + r.oneVerseScreen.trim() + '"');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nPRACTICE LOOP FAILED' : '\npractice loop clean');
  await browser.close(); await H.stopServer();
})();
