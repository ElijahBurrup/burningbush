/**
 * QA probe 16 — THE MONTHLY RECORD.
 *
 * Every account keeps a small month-by-month tally: verses memorized, questions answered and how
 * many were right, reviews, word-for-word passes, books, palaces, talents, and days with real work
 * on them. Nothing reads it yet — it exists so that a chart can be drawn later from numbers that
 * were being kept all along, which is the one thing that cannot be done retroactively.
 *
 * So the only question worth asking of it is: does it actually record, and does it survive the
 * things that move an account about — a sync merge, and a second device.
 *
 *   node tests/qa/stats.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    closeEveryOverlay(); clearActiveTest(); MS = null;
    Prog.stats = {}; saveProg();
    const month = statMonth();
    const row = () => (Prog.stats || {})[month] || {};

    // a verse learned, talents earned with it — one the seeded account does not already have
    Prog.memorized = (Prog.memorized || []).filter(k => k !== '43:3:16');
    addMemorized({ b: 'John', c: 3, v: 16 });
    const afterVerse = { v: row().v, t: row().t, d: row().d };

    // saving one already known must not count a second time
    addMemorized({ b: 'John', c: 3, v: 16 });
    const twice = row().v;

    // questions, right and wrong
    statBump('q'); statBump('qc'); statBump('q');
    const afterQs = { q: row().q, qc: row().qc };

    // the day counter must not move again on the same day, however much is done
    for (let i = 0; i < 20; i++) statBump('q');
    const sameDay = row().d;

    // totals across every month
    Prog.stats['2026-01'] = { v: 4, q: 100 };
    Prog.stats['2026-02'] = { v: 6, q: 50 };
    const totals = { v: statTotal('v'), q: statTotal('q'), year: statYear('v', 2026) };

    // a merge takes the higher of the two, and never doubles what both devices already knew
    const A = migrateProg({ stats: { '2026-03': { v: 5, q: 40 }, '2026-04': { v: 1 } } });
    const B = migrateProg({ stats: { '2026-03': { v: 3, q: 90 }, '2026-05': { v: 2 } } });
    const m1 = mergeProg(A, B);
    const m2 = mergeProg(m1, B);                    // merging again must change nothing
    const merged = {
      v3: m1.stats['2026-03'].v, q3: m1.stats['2026-03'].q,
      only4: m1.stats['2026-04'].v, only5: m1.stats['2026-05'].v,
      idempotent: JSON.stringify(m1.stats) === JSON.stringify(m2.stats),
    };

    // and a wrong-shaped record must not take the app down
    let survived = true;
    try { migrateProg({ stats: null }); migrateProg({ stats: 'x' }); migrateProg({ stats: 7 });
          mergeProg(migrateProg({ stats: null }), migrateProg({ stats: { '2026-06': { v: 1 } } })); }
    catch (e) { survived = false; }

    return { afterVerse, twice, afterQs, sameDay, totals, merged, survived, month };
  });

  say(r.month && /^\d{4}-\d{2}$/.test(r.month), 'the month is keyed as YYYY-MM (' + r.month + ')');
  say(r.afterVerse.v === 1, 'memorizing a verse records it');
  say(r.afterVerse.t > 0, '...along with the talents it earned (' + r.afterVerse.t + ')');
  say(r.afterVerse.d === 1, '...and marks the day as one with work on it');
  say(r.twice === 1, '...and saving a verse already known does not count it twice');
  say(r.afterQs.q === 2 && r.afterQs.qc === 1, 'questions and correct answers count separately');
  say(r.sameDay === 1, 'twenty more answers the same day still count as one day');
  say(r.totals.v === 11 && r.totals.q === 172, 'totals add every month up (' + r.totals.v + ' verses)');
  say(r.totals.year === 11, '...and a year can be totalled on its own');
  say(r.merged.v3 === 5 && r.merged.q3 === 90, 'a merge keeps the higher count of each field');
  say(r.merged.only4 === 1 && r.merged.only5 === 2, '...and loses no month either device had');
  say(r.merged.idempotent, '...and merging twice changes nothing, so nothing is double counted');
  say(r.survived, 'a wrong-shaped record does not take the app down');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nSTATS FAILED' : '\nstats clean');
  await browser.close(); await H.stopServer();
})();
