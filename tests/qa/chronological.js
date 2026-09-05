/**
 * QA probe 26 — THE CHRONOLOGICAL RUN.
 *
 * Every book you know, in Bible order, asked one way only: here is a number, name the book. Typed or
 * spoken, with no four options to recognise the answer among and no letters going green as you type.
 * Recognition is not recall, and a run whose whole purpose is to prove you have the order cannot
 * also be handing you the answer.
 *
 * The rules around it are as easy to get wrong as the run itself, and this checks all of them:
 * choosing it clears the six forms, choosing any form clears it, its length is however many books
 * you know, and — the one that would quietly annoy somebody every time — turning it off must put
 * back the number THEY chose, not leave the book count sitting in the field.
 *
 *   node tests/qa/chronological.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(async () => {
    const res = {};
    const sel = id => { const b = document.getElementById(id); return !!b && /\bsel\b/.test(b.className); };
    const forms = () => [...document.querySelectorAll('#ntsForms [data-form]')];
    const chosen = () => forms().filter(b => /\bsel\b/.test(b.className)).map(b => b.dataset.form);
    const count = () => (document.getElementById('ntsCount') || {}).textContent;
    const countLocked = () => !!(document.getElementById('ntsCount') || {}).disabled;

    res.books = knownBookNums().length;

    // start from a known set-up: a deliberate, unusual number and two forms
    Prog.ntPrefs = { types: ['q_n2b', 'q_i2n'], count: 23, chrono: false }; saveProg();
    openNumTestSetup(1);

    res.offered = !!document.getElementById('ntsChrono');
    res.atTop = (() => {
      const c = document.getElementById('ntsChrono'), f = document.getElementById('ntsForms');
      return !!(c && f) && (c.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
    })();
    res.before = { chrono: sel('ntsChrono'), forms: chosen(), count: count(), locked: countLocked() };

    // choose it
    document.getElementById('ntsChrono').click();
    res.after = { chrono: sel('ntsChrono'), forms: chosen(), count: count(), locked: countLocked() };

    // tapping the count while chronological must do nothing at all
    document.getElementById('ntsCount').click();
    res.sheetOpened = !!document.querySelector('#numSheet[style*="flex"], .numsheet[style*="flex"]');
    res.countAfterTap = count();

    // now choose one of the six: chronological must let go, and the number must come back
    forms()[3].click();
    res.back = { chrono: sel('ntsChrono'), forms: chosen(), count: count(), locked: countLocked() };

    // and the run itself
    document.getElementById('ntsChrono').click();
    document.getElementById('ntsGo').click();
    res.run = {
      length: NT.qs.length,
      allChrono: NT.qs.every(q => q.type === 'q_chrono'),
      inBibleOrder: NT.qs.every((q, i) => i === 0 || q.n > NT.qs[i - 1].n),
      firstIsFirstKnown: NT.qs[0].n === knownBookNums()[0]
    };

    const V = document.getElementById('verse');
    res.q = {
      prompt: (V.querySelector('.prompt') || {}).textContent || '',
      shownNumber: (V.querySelector('.bignum') || {}).textContent || '',
      hasBox: !!document.getElementById('chIn'),
      options: V.querySelectorAll('.opt, [data-ok]').length,
      revealScene: !!document.getElementById('ntScene'),
      hasMic: !!document.getElementById('chSpeak')
    };

    // a right answer, typed the awkward way somebody actually types it
    const n0 = NT.qs[0].n;
    document.getElementById('chIn').value = bookName(n0).toUpperCase();
    document.getElementById('chGo').click();
    res.right = { ok: NT.ok, wrong: NT.wrong, fb: (document.getElementById('ntFb') || {}).innerText || '' };

    // a wrong one: it must say the answer plainly and let you go on
    await new Promise(r2 => setTimeout(r2, 900));
    const n1 = NT.qs[NT.i] ? NT.qs[NT.i].n : null;
    if (n1) {
      document.getElementById('chIn').value = 'Habakkuk-nonsense';
      document.getElementById('chGo').click();
      res.wrong = { wrongCount: NT.wrong, fb: (document.getElementById('ntFb') || {}).innerText || '',
                    names: bookName(n1) };
    }

    // the forgiving matcher, which is the difference between practice and an argument
    res.match = {
      exact:    bookAnswerOk('Genesis', 1),
      cased:    bookAnswerOk('  gEnEsis ', 1),
      ordinal:  bookAnswerOk('first samuel', 9) === bookAnswerOk('1 Samuel', 9),
      roman:    bookAnswerOk('II Samuel', 10),
      plural:   bookAnswerOk('Psalm', 19),
      heard:    bookAnswerOk('revelations', 66),
      empty:   !bookAnswerOk('   ', 1),
      wrongOne:!bookAnswerOk('Exodus', 1)
    };
    return res;
  });

  say(r.offered && r.atTop, 'Chronological is offered, above the six forms');
  say(r.before.chrono === false && r.before.forms.length === 2 && r.before.count === '23',
      'it starts off, with the reader\'s own two forms and their number (' + r.before.count + ')');

  say(r.after.chrono === true, 'choosing it turns it on');
  say(r.after.forms.length === 0, '...and clears every other option');
  say(r.after.count === String(r.books), '...and the count becomes how many books you know (' + r.after.count + ')');
  say(r.after.locked, '...and stops being editable');
  say(!r.sheetOpened && r.countAfterTap === String(r.books), '...tapping it opens nothing');

  say(r.back.chrono === false, 'choosing one of the six turns Chronological off again');
  say(r.back.forms.length === 1, '...leaving just the one they chose');
  say(r.back.count === '23', '...and the number goes back to THEIRS, not the book count');
  say(!r.back.locked, '...and is editable again');

  say(r.run.length === r.books, 'the run is one question per book you know (' + r.run.length + ')');
  say(r.run.allChrono, '...every one of them the chronological kind');
  say(r.run.inBibleOrder && r.run.firstIsFirstKnown, '...in Bible order, not shuffled');

  say(/Which book is this number/.test(r.q.prompt), 'it asks which book the number is');
  say(!!r.q.shownNumber, '...showing the number (' + r.q.shownNumber.trim() + ')');
  say(r.q.options === 0, '...with NO multiple choice');
  say(r.q.hasBox, '...an answer box instead');
  say(r.q.hasMic, '...and a way to say it');
  say(!r.q.revealScene, '...and no scene to reveal, which would be the answer');

  say(r.right.ok === 1 && r.right.wrong === 0, 'a right answer counts, whatever the capitals');
  say(r.wrong && r.wrong.wrongCount === 1, 'a wrong answer counts once');
  say(r.wrong && r.wrong.fb.indexOf(r.wrong.names) >= 0,
      '...and says the book plainly rather than colouring letters: "' + (r.wrong ? r.wrong.fb.replace(/\s+/g, ' ') : '') + '"');

  const m = r.match;
  say(m.exact && m.cased, 'the matcher takes it however it is capitalised');
  say(m.ordinal, '..."first samuel" is "1 Samuel"');
  say(m.roman, '..."II Samuel" too');
  say(m.plural && m.heard, '..."Psalm" and "revelations" are not wrong answers');
  say(m.empty && m.wrongOne, '...but blank and wrong are still wrong');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nCHRONOLOGICAL FAILED' : '\nchronological clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
