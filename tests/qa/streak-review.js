/**
 * QA probe 28 — WHY THE STREAK BROKE, AND GOING BACK FOR IT.
 *
 * A streak day needs BOTH halves: the daily goal AND every review that came due. Somebody who did
 * one of them has genuinely worked, and when the number reset the app could not tell them which half
 * was missing — because Prog.goalDay only ever held TODAY and the rollover destroyed the evidence
 * before anybody could ask. That is the bug this feature exists for, so it is the first thing tested.
 *
 * Then: the loss is recorded, shown on a timeline, and can be bought back at one Streak Freeze per
 * missed day — buying the freezes with talents in the same action rather than sending somebody to a
 * store and back.
 *
 *   node tests/qa/streak-review.js
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
    const D = 86400000;
    const key = ms => dayKey(new Date(ms));
    const now = Date.now();

    // ── the evidence is kept, instead of being overwritten ──────────────────────────────
    Prog.goalLog = []; Prog.streakLost = null;
    Prog.goalDay = { date: key(now - D), count: 2, celebrated: false, target: 5, dueAtEnd: 1 };
    goalState();                                    // rolling into today must archive yesterday
    res.archived = (Prog.goalLog || [])[0] || null;

    // ── a broken streak is recorded, with how far back it goes ──────────────────────────
    Prog.dayStreak = 12;
    Prog.lastReviewDay = key(now - 4 * D);          // last counted day was four days ago
    Prog.freezes = 0; Prog.talents = 5000;
    Prog.streakLost = null;
    // creditToday only records when both halves are done, so make them done
    const realGoalMet = window.goalMet, realDue = window.reviewDueCount;
    window.goalMet = () => true; window.reviewDueCount = () => 0;
    creditToday();
    res.lost = Prog.streakLost ? { ...Prog.streakLost } : null;
    res.resetTo = Prog.dayStreak;

    // ── the offer ───────────────────────────────────────────────────────────────────────
    const R1 = canRestoreStreak();
    res.offer = R1 ? { had: R1.had, cost: R1.cost, have: R1.have, short: R1.short,
                       talents: R1.talents, canPay: R1.canPay, ago: R1.ago } : null;

    // too long ago is not the same streak
    Prog.streakLost = { at: key(now - 20 * D), had: 30, from: key(now - 22 * D), missed: 1 };
    res.tooOld = canRestoreStreak();
    Prog.streakLost = res.lost;

    // ── the screen ──────────────────────────────────────────────────────────────────────
    closeEveryOverlay();
    openStreakReview();
    const m = document.getElementById('streakRevModal');
    res.screen = {
      opened: !!m && m.style.display === 'flex',
      text: (m.innerText || '').replace(/\s+/g, ' '),
      hasTimeline: !!m.querySelector('div[style*="overflow-x:auto"] span[title]'),
      timelineDays: m.querySelectorAll('div[style*="overflow-x:auto"] span[title]').length,
      hasButton: !!document.getElementById('srvBuy'),
      buttonLabel: (document.getElementById('srvBuy') || {}).textContent || '',
      buttonEnabled: !!document.getElementById('srvBuy') && !document.getElementById('srvBuy').disabled
    };

    // ── going back ──────────────────────────────────────────────────────────────────────
    const talentsBefore = Prog.talents;
    document.getElementById('srvBuy').click();
    res.after = {
      streak: Prog.dayStreak,
      freezes: Prog.freezes,
      talentsSpent: talentsBefore - Prog.talents,
      lossCleared: Prog.streakLost === null,
      receipt: ((document.getElementById('srvDone') || {}).innerText || '').replace(/\s+/g, ' ')
    };

    // ── and it cannot be done twice, or without the talents ─────────────────────────────
    res.twice = canRestoreStreak();
    Prog.streakLost = { at: key(now), had: 9, from: key(now - 3 * D), missed: 2 };
    Prog.freezes = 0; Prog.talents = 10;
    const R2 = canRestoreStreak();
    res.broke = { canPay: R2 && R2.canPay, restored: restoreStreak() };

    window.goalMet = realGoalMet; window.reviewDueCount = realDue;
    Prog.streakLost = null; closeEveryOverlay();
    return res;
  });

  const a = r.archived;
  say(!!a, 'the day that ends is archived instead of being overwritten');
  say(a && a.got === 2 && a.need === 5, '...with what was done AND what was asked (' + (a ? a.got + ' of ' + a.need : '—') + ')');
  say(a && a.ok === false, '...and whether it counted');

  say(!!r.lost, 'a broken streak is recorded');
  say(r.lost && r.lost.had === 12, '...how long it was (' + (r.lost || {}).had + ' days)');
  say(r.lost && r.lost.missed === 3, '...and how many days were missed (' + (r.lost || {}).missed + ')');
  say(r.resetTo === 1, '...while the streak itself restarts at 1');

  say(r.offer && r.offer.cost === 3, 'going back costs one freeze per missed day (' + (r.offer || {}).cost + ')');
  say(r.offer && r.offer.short === 3 && r.offer.talents === 750,
      '...with none banked, that is ' + (r.offer || {}).talents + ' talents');
  say(r.tooOld === null, 'a streak lost three weeks ago is out of reach');

  say(r.screen.opened, 'the streak review opens');
  say(/both/i.test(r.screen.text), '...and explains a day needs both halves');
  say(r.screen.hasTimeline && r.screen.timelineDays > 3,
      '...with a timeline of ' + r.screen.timelineDays + ' days showing where it broke');
  say(/Go back/i.test(r.screen.buttonLabel) && r.screen.buttonEnabled,
      '...and an offer to go back: "' + r.screen.buttonLabel.trim() + '"');

  say(r.after.streak === 13, 'going back restores the streak (12 + today = ' + r.after.streak + ')');
  say(r.after.talentsSpent === 750, '...buying the freezes it needed (' + r.after.talentsSpent + ' talents)');
  say(r.after.freezes === 0, '...and spending them in the same breath');
  say(/purchased/i.test(r.after.receipt) && /restored/i.test(r.after.receipt),
      '...saying so on screen: "' + r.after.receipt + '"');
  say(r.twice === null, '...and it cannot be bought twice');
  say(r.broke.canPay === false && r.broke.restored === null,
      'without the talents it is refused rather than half-done');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nSTREAK REVIEW FAILED' : '\nstreak review clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
