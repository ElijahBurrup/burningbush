/**
 * QA probe 11 — EVERY DOOR INTO A PAID LESSON.
 *
 * A lesson outside the Foundation costs a subscription or a thousand talents. There is more than one
 * way to reach one — the path tile, a swipe between lessons, and the offer to learn a book you need
 * for a verse you are saving — and a door that forgets to ask is a door that gives the app away.
 * The verse route was exactly that until v1.106: it ran a free lesson of its own.
 *
 * This tries every door, with and without Pro, and checks the talent unlock actually opens one.
 *
 *   node tests/qa/paywall-doors.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    const res = {};
    const PAID = 46, FREE = 3;                 // 1 Corinthians costs; Leviticus is in the Foundation
    const payUp = () => { const m = el('payModal'); return !!m && getComputedStyle(m).display !== 'none'; };
    const reset = () => {
      closeEveryOverlay(); LZ = null; LESSON_DONE = null;
      Billing.revoke(); Prog.lessonUnlocks = []; Prog.talents = 0;
      Prog.doneSkills = ['snd:0-4', 'snd:5-9'].concat([1, 2, 3, 4, 5, 40].map(n => 'book:' + n));
      Prog.extraKnown = []; markVideoSeen('book'); saveProg(); bustCaches(); updateTabLocks();
    };
    const skillFor = n => { let s = null; UNITS.forEach(U => U.skills.forEach(x => { if (x.id === 'book:' + n) s = x; })); return s; };

    // 1. straight at the lesson
    reset(); startLesson(skillFor(PAID));
    res.direct = { asked: payUp(), opened: !!LZ };
    closeEveryOverlay();

    // 2. through the verse route — the one that used to give it away
    reset(); startAdhocLearn(PAID, true, () => {});
    res.viaVerse = { asked: payUp(), opened: !!LZ, miniLesson: !!AB };
    closeEveryOverlay();

    // 3. a free lesson must not be stopped by any of it
    reset(); startLesson(skillFor(FREE));
    res.free = { asked: payUp(), opened: !!(LZ && LZ.sk.id === 'book:' + FREE) };
    closeEveryOverlay(); LZ = null;

    // 4. the talent unlock: too poor, then rich enough
    reset(); Prog.talents = LESSON_UNLOCK_COST - 1; saveProg();
    startLesson(skillFor(PAID));
    const btn = el('payLesson');
    res.poor = { offered: !!btn, disabled: !!btn && btn.disabled };
    closeEveryOverlay(); LZ = null;

    reset(); Prog.talents = LESSON_UNLOCK_COST + 50; saveProg();
    startLesson(skillFor(PAID));
    const buy = el('payLesson');
    res.rich = { offered: !!buy, disabled: !!buy && buy.disabled };
    if (buy && !buy.disabled) buy.click();
    res.bought = { unlocked: (Prog.lessonUnlocks || []).includes('book:' + PAID),
                   spent: Prog.talents, opened: !!(LZ && LZ.sk.id === 'book:' + PAID) };
    closeEveryOverlay(); LZ = null;

    // 5. and once bought it opens by any door, without asking again
    startAdhocLearn(PAID, true, () => {});
    res.afterBuy = { asked: payUp(), opened: !!(LZ && LZ.sk.id === 'book:' + PAID) };
    closeEveryOverlay(); LZ = null;

    // 6. with Pro, nothing asks
    reset(); Billing.grant();
    startAdhocLearn(PAID, true, () => {});
    res.pro = { asked: payUp(), opened: !!(LZ && LZ.sk.id === 'book:' + PAID) };
    closeEveryOverlay(); LZ = null; Billing.revoke();
    return res;
  });

  say(r.direct.asked && !r.direct.opened, 'a paid lesson opened straight asks to be bought');
  say(r.viaVerse.asked && !r.viaVerse.opened, '...and so does the same book reached through a verse');
  say(!r.viaVerse.miniLesson, '...with no free mini lesson slipping past it');
  say(!r.free.asked && r.free.opened, 'a Foundation book is never asked for money');
  say(r.poor.offered && r.poor.disabled, 'short of talents, the unlock is shown but cannot be pressed');
  say(r.rich.offered && !r.rich.disabled, '...and with enough it can');
  say(r.bought.unlocked, 'buying it records the unlock');
  say(r.bought.spent < 100, '...and takes the talents (' + r.bought.spent + ' left)');
  say(r.bought.opened, '...and opens the lesson');
  say(!r.afterBuy.asked && r.afterBuy.opened, 'a bought lesson opens by any door without asking again');
  say(!r.pro.asked && r.pro.opened, 'and Pro opens everything without being asked');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nPAYWALL DOORS FAILED' : '\npaywall doors clean');
  await browser.close(); await H.stopServer();
})();
