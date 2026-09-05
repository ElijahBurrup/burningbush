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
      const idx = NT.i;
      res.wrong = { wrongCount: NT.wrong, fb: (document.getElementById('ntFb') || {}).innerText || '',
                    names: bookName(n1),
                    cleared: (document.getElementById('chIn') || {}).value === '',
                    stillAsking: NT.i === idx,
                    stillEditable: !(document.getElementById('chIn') || {}).disabled,
                    revealStillThere: !!document.getElementById('chHint') && !document.getElementById('chHint').disabled };
      // a second wrong answer on the same question must not count it twice
      document.getElementById('chIn').value = 'nonsense again';
      document.getElementById('chGo').click();
      res.wrong.twice = NT.wrong;
    }

    // ── typing it perfectly needs no button ─────────────────────────────────────────────
    const fresh = () => { startChronoTest(); return NT.qs[0].n; };
    const type = (s) => { const i = document.getElementById('chIn');
      i.value = s; i.dispatchEvent(new Event('input')); };

    let bn = fresh();
    type(bookName(bn).toLowerCase());               // exact, bar the capitals
    res.auto = { advanced: NT.i === 1 || NT.ok === 1, ok: NT.ok,
                 green: (document.getElementById('chIn') || {}).style?.color || '' };

    // ...but a prefix must NOT be taken while they are still typing it
    bn = fresh();
    const partial = bookName(bn).slice(0, Math.max(5, bookName(bn).length - 2));
    type(partial);
    res.notEarly = { stillAsking: NT.ok === 0 && NT.i === 0, typed: partial, book: bookName(bn) };

    // ── revealing letters ───────────────────────────────────────────────────────────────
    bn = fresh();
    const H2 = () => document.getElementById('chHint');
    const maskNow = () => (document.getElementById('chMask') || {}).textContent || '';
    res.mask = { atStart: maskNow() };
    H2().click(); res.mask.one = maskNow();
    H2().click(); res.mask.two = maskNow();
    res.mask.book = bookName(bn);
    res.mask.stillAsking = NT.i === 0;

    // typing between reveals breaks the streak, so two more do not give it away
    type('x'); 
    H2().click();
    res.streakReset = { stillAsking: NT.i === 0, mask: maskNow() };

    // ── three in a row hands it over ────────────────────────────────────────────────────
    bn = fresh();
    const before = { ok: NT.ok, wrong: NT.wrong };
    H2().click(); H2().click(); H2().click();
    res.gaveUp = {
      value: (document.getElementById('chIn') || {}).value || '',
      book: bookName(bn),
      disabled: !!(document.getElementById('chIn') || {}).disabled,
      green: (document.getElementById('chIn') || {}).style?.color || '',
      notCountedRight: NT.ok === before.ok,
      counted: NT.wrong === before.wrong + 1,
      stillOnScreen: NT.i === 0,
      hintOff: !!H2().disabled
    };
    // it holds for three seconds rather than snatching the answer away
    await new Promise(r2 => setTimeout(r2, 1200));
    res.gaveUp.stillThereAfter1s = NT.i === 0;
    await new Promise(r2 => setTimeout(r2, 2200));
    res.gaveUp.movedOnAfter3s = NT.i === 1;

    // ── a helped-but-correct answer must not be marked as learned ───────────────────────
    bn = fresh();
    H2().click();                                   // one letter of help
    type(bookName(bn));
    res.helped = { accepted: NT.ok >= 1, box: (document.getElementById('ntFb') || {}).innerText || '' };

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
  say(r.wrong && r.wrong.fb.indexOf(r.wrong.names) < 0,
      '...and does NOT give the answer away: "' + (r.wrong ? r.wrong.fb.replace(/\s+/g, ' ') : '') + '"');
  say(r.wrong && r.wrong.cleared, '...the box is emptied for another go');
  say(r.wrong && r.wrong.stillAsking && r.wrong.stillEditable, '...and it is still asking the same question');
  say(r.wrong && r.wrong.revealStillThere, '...with the reveal still there for anybody who wants out');
  say(r.wrong && r.wrong.twice === 1, '...and a second wrong answer does not count the question twice');

  say(r.auto.advanced, 'typing the book exactly is accepted with no button pressed');
  say(/green/.test(r.auto.green), '...and the box turns green');
  say(r.notEarly.stillAsking, 'a partial answer is NOT taken early ("' + r.notEarly.typed + '" for ' + r.notEarly.book + ')');

  say(r.mask.atStart === '', 'nothing is revealed until it is asked for');
  say(r.mask.one.replace(/[^A-Za-z0-9]/g,'').length === 1, 'one tap reveals one letter: ' + r.mask.one);
  say(r.mask.two.replace(/[^A-Za-z0-9]/g,'').length === 2, '...two taps, two letters: ' + r.mask.two);
  say(r.mask.one[0] === r.mask.book[0], '...starting at the beginning of ' + r.mask.book);
  say(r.mask.stillAsking, '...and it is still asking after two');
  say(r.streakReset.stillAsking, 'typing between reveals breaks the streak, so the next one does not give it away');

  say(r.gaveUp.value === r.gaveUp.book, 'three reveals in a row fills in the whole book (' + r.gaveUp.value + ')');
  say(/green/.test(r.gaveUp.green) && r.gaveUp.disabled, '...green, and no longer asking');
  say(r.gaveUp.hintOff, '...with nothing left to reveal');
  say(r.gaveUp.stillThereAfter1s, '...it stays on screen a second later');
  say(r.gaveUp.movedOnAfter3s, '...and moves on after three seconds');
  say(r.gaveUp.notCountedRight && r.gaveUp.counted, '...and is not counted as one you knew');

  say(r.helped.accepted, 'a right answer after one letter of help is still accepted');
  say(/see this one again/i.test(r.helped.box), '...but says it will come round again: "' + r.helped.box.replace(/\s+/g,' ').trim() + '"');

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
