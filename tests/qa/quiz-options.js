/**
 * QA probe 9 — WHAT A QUESTION ACTUALLY OFFERS.
 *
 * Every multiple-choice question in the app is built the same way: the right answer, plus wrong ones
 * from `distract()` or `otherPictures()`, shuffled. Four things must hold every time, and none of
 * them is checked anywhere:
 *
 *   1. there are as many choices as the screen promises — a question with three is easier
 *   2. no choice appears twice — a duplicate is either two right answers or a wasted slot
 *   3. exactly one of them is right
 *   4. once a reader is past the Foundation, every wrong answer is a book they have learned
 *
 * This walks every question type across many items and several states of progress, because the
 * distractor pool is drawn from what has been learned and so changes shape as a reader grows.
 *
 *   node tests/qa/quiz-options.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    const findings = [];
    const states = [
      { name: 'the Foundation only', books: [1, 2, 3, 4, 5, 40] },
      { name: 'two books in', books: [1, 2] },
      { name: 'a phase and a half', books: [1, 2, 3, 4, 5, 40, 41, 42, 43, 44, 45, 46] },
      { name: 'most of the New Testament', books: [1, 2, 3, 4, 5].concat(Array.from({ length: 26 }, (_, i) => 41 + i)) },
    ];

    states.forEach(st => {
      Prog.doneSkills = ['snd:0-4', 'snd:5-9'].concat(st.books.map(n => 'book:' + n));
      Prog.extraKnown = []; saveProg(); bustCaches();
      const known = new Set([...knownNumbers()]);

      st.books.forEach(n => {
        // the two whole-number pools, and the picture pools, exactly as the question builders use them
        const pools = {
          'number distractors': distract('num', n, 3),
          'book distractors': distract('book', n, 3),
        };
        Object.entries(pools).forEach(([what, got]) => {
          if (got.length !== 3) findings.push(`${st.name}: ${what} for ${n} gave ${got.length}, not 3`);
          if (new Set(got).size !== got.length) findings.push(`${st.name}: ${what} for ${n} repeated itself — ${got.join(',')}`);
          if (got.includes(n)) findings.push(`${st.name}: ${what} for ${n} offered the right answer as a wrong one`);
          if (what === 'book distractors' && st.books.length >= 4) {
            const strangers = got.filter(x => !known.has(x));
            if (strangers.length) findings.push(`${st.name}: book distractors for ${n} used books never learned — ${strangers.join(',')}`);
          }
        });

        // and the option lists as the screen actually renders them
        const lists = {
          'number → image': [pegFor(n).word].concat(distract('num', n, 3).map(x => pegFor(x).word)),
          'image → number': [n].concat(distract('num', n, 3)),
          'number → book': [bookName(n)].concat(distract('book', n, 3).map(bookName)),
          'book → number': [n].concat(distract('book', n, 3)),
          'book → image': [pegFor(n).word].concat(distract('book', n, 3).map(x => pegFor(x).word)),
        };
        if (bookWordOf(n)) lists['picture of the name'] = [bookWordOf(n)].concat(otherPictures('name', n, 3));
        if (numRefOf(n)) lists['picture of the number'] = [numRefOf(n)].concat(otherPictures('num', n, 3));

        Object.entries(lists).forEach(([what, opts]) => {
          if (opts.length !== 4) findings.push(`${st.name}: "${what}" for ${n} offered ${opts.length} choices`);
          const seen = opts.map(o => String(o).toLowerCase());
          if (new Set(seen).size !== seen.length)
            findings.push(`${st.name}: "${what}" for ${n} offered the same thing twice — ${opts.join(' / ')}`);
        });
      });
    });
    return findings;
  });

  r.slice(0, 40).forEach(f => say(false, f));
  if (!r.length) say(true, 'every question offers four distinct choices, one of them right');
  else say(false, `${r.length} finding(s) in total`);

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(r.length ? '\nQUIZ OPTIONS FAILED' : '\nquiz options clean');
  await browser.close(); await H.stopServer();
})();
