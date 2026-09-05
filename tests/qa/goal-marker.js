/**
 * QA probe 29 — THE LAST MARKER IS THE REVIEW.
 *
 * A day's goal is N markers and the last belongs to spaced repetition. Ordinary work fills the first
 * N-1 and then stops counting: three word-for-word against a goal of three earns two markers, and
 * the day is not done until the review is.
 *
 * Two edges decide whether that rule is fair or infuriating, and both are here:
 *
 *   NOTHING DUE          Some days have no review in them. The marker cannot be earned, so it is not
 *                        reserved either, or a quiet day would be impossible to finish.
 *   MORE ARRIVING LATER  Clearing every review at breakfast and finding three more due by tea is the
 *                        system working. It must not take the day back — which is exactly what used
 *                        to happen, and what cost a real reader her streak.
 *
 *   node tests/qa/goal-marker.js
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
    const today = dayKey(new Date());

    // A day with a goal of 3 and reviews waiting.
    const setUp = (goal, due, srDone, otherWork) => {
      Prog.dailyGoal = goal; Prog.goalByDay = {}; Prog.goalWeekday = null; Prog.goalWeekend = null;
      Prog.goalDay = { date: today, count: otherWork + (srDone ? 1 : 0), celebrated: false, target: goal };
      Prog.srGoalDay = { date: today, count: srDone ? 1 : 0 };
      Prog.srDay = srDone ? today : '';
      window.reviewDueCount = () => due;
      saveProg();
    };

    // ── work alone cannot finish it ─────────────────────────────────────────────────────
    setUp(3, 5, false, 3);
    res.workOnly = { count: goalCount(), met: goalMet(), cap: goalOtherCap(), target: goalToday() };

    setUp(3, 5, false, 99);                       // however much of it there is
    res.lotsOfWork = { count: goalCount(), met: goalMet() };

    // ── the review finishes it ──────────────────────────────────────────────────────────
    setUp(3, 0, true, 2);
    res.withReview = { count: goalCount(), met: goalMet() };

    // ── and the review alone does not, either ───────────────────────────────────────────
    setUp(3, 0, true, 0);
    res.reviewOnly = { count: goalCount(), met: goalMet() };

    // ── MORE ARRIVING LATER must not take the day back ──────────────────────────────────
    setUp(3, 0, true, 2);
    const before = goalMet();
    window.reviewDueCount = () => 4;              // tea time: four more have come due
    res.later = { metBefore: before, metAfter: goalMet(), count: goalCount() };

    // ...and the streak is credited despite them
    Prog.lastReviewDay = dayKey(new Date(Date.now() - 86400000));
    Prog.dayStreak = 5;
    creditToday();
    res.later.credited = Prog.lastReviewDay === today;
    res.later.streak = Prog.dayStreak;

    // ── a day with nothing due is finishable by work alone ──────────────────────────────
    setUp(3, 0, false, 3);
    res.quietDay = { count: goalCount(), met: goalMet(), cap: goalOtherCap(), inPlay: srInPlay() };

    // ...but doing nothing on a quiet day is still nothing
    setUp(3, 0, false, 0);
    res.didNothing = { count: goalCount(), met: goalMet() };

    // ── a quiet day that was FINISHED must stay finished when reviews turn up at teatime ──
    setUp(3, 0, false, 3);
    const quietMet = goalMet();                  // finished on ordinary work alone
    window.reviewDueCount = () => 6;             // and now six fall due
    res.stillDone = { before: quietMet, after: goalMet(), count: goalCount() };
    // the streak is credited and the new reviews are simply tomorrow's work
    Prog.lastReviewDay = dayKey(new Date(Date.now() - 86400000)); Prog.dayStreak = 2;
    creditToday();
    res.stillDone.credited = Prog.lastReviewDay === today;

    // ── a goal of one, with a review waiting, IS the review ─────────────────────────────
    setUp(1, 2, false, 5);
    res.goalOne = { count: goalCount(), met: goalMet(), cap: goalOtherCap() };
    setUp(1, 0, true, 0);
    res.goalOneDone = { count: goalCount(), met: goalMet() };

    // ── what the reader is told ─────────────────────────────────────────────────────────
    setUp(3, 4, false, 2);
    Prog.lastReviewDay = '';
    res.needLine = streakNeedLine().replace(/\s+/g, ' ');

    // ── and what they are shown: the last marker, in blue ───────────────────────────────
    setUp(3, 4, false, 2);
    goalFlash(2, 3);
    const nodes = [...document.querySelectorAll('.goalflash .gf-node')];
    res.nodes = { n: nodes.length,
                  srIsLast: nodes.length ? nodes[nodes.length - 1].classList.contains('sr') : false,
                  srFilled: nodes.length ? nodes[nodes.length - 1].classList.contains('done') : null,
                  otherFilled: nodes.filter(x => !x.classList.contains('sr') &&
                                (x.classList.contains('done') || x.classList.contains('just'))).length };
    document.querySelectorAll('.goalflash').forEach(x => x.remove());

    setUp(3, 0, true, 2);
    goalFlash(3, 3);
    const n2 = [...document.querySelectorAll('.goalflash .gf-node')];
    res.nodesDone = { srFilled: n2.length ? (n2[n2.length - 1].classList.contains('done') ||
                                             n2[n2.length - 1].classList.contains('just')) : false };
    document.querySelectorAll('.goalflash').forEach(x => x.remove());

    // a quiet day draws no review marker at all
    setUp(3, 0, false, 1);
    goalFlash(1, 3);
    res.quietNodes = { sr: document.querySelectorAll('.goalflash .gf-node.sr').length };
    document.querySelectorAll('.goalflash').forEach(x => x.remove());

    return res;
  });

  say(r.workOnly.count === 2 && !r.workOnly.met,
      'three word-for-word against a goal of three earns ' + r.workOnly.count + ' markers, not three');
  say(r.workOnly.cap === 2, '...ordinary work is capped at ' + r.workOnly.cap + ' of ' + r.workOnly.target);
  say(r.lotsOfWork.count === 2 && !r.lotsOfWork.met, '...and no amount of it finishes the day');
  say(r.withReview.count === 3 && r.withReview.met, 'the review earns the last marker and finishes it');
  say(r.reviewOnly.count === 1 && !r.reviewOnly.met, '...but the review on its own is one marker, not three');

  say(r.later.metBefore && r.later.metAfter,
      'reviews arriving later do NOT take the day back');
  say(r.later.credited && r.later.streak === 6, '...and the streak is still credited (' + r.later.streak + ' days)');

  say(r.quietDay.met && !r.quietDay.inPlay,
      'a day with nothing due is finishable by ordinary work alone');
  say(r.quietDay.cap === 3, '...because the marker is not reserved when it cannot be earned');
  say(!r.didNothing.met, '...but doing nothing on a quiet day is still nothing');
  say(r.stillDone.before && r.stillDone.after,
      'a quiet day already finished stays finished when reviews fall due later');
  say(r.stillDone.count === 3, '...still showing ' + r.stillDone.count + ' of 3, not dropping back');
  say(r.stillDone.credited, '...and the streak is credited; the new reviews are tomorrow\'s work');

  say(r.goalOne.count === 0 && !r.goalOne.met,
      'with a goal of one and a review waiting, the day IS the review');
  say(r.goalOneDone.met, '...and doing it finishes the day');

  say(/spaced repetition/i.test(r.needLine),
      'the banner names the review rather than saying "1 more": "' + r.needLine.replace(/<[^>]*>/g, '') + '"');

  say(r.nodes.n === 3 && r.nodes.srIsLast, 'the review marker is drawn last');
  say(r.nodes.srFilled === false && r.nodes.otherFilled === 2, '...empty while the review is outstanding');
  say(r.nodesDone.srFilled, '...and filled once a set is finished');
  say(r.quietNodes.sr === 0, '...and not drawn at all on a day with nothing due');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nGOAL MARKER FAILED' : '\ngoal marker clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
