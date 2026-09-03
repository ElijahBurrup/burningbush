/**
 * QA probe 15 — THE BIBLE SEARCH, GIVEN WHAT PEOPLE ACTUALLY TYPE.
 *
 * The search takes free text and, when nothing matches, guesses at misspellings and drops words from
 * the end until something hits. That is a lot of string handling on input nobody controls, and it is
 * the one recently-written feature with no probe of its own.
 *
 * Everything here is something a person would plausibly type, plus the things that break search
 * boxes: regex metacharacters, one letter, a whole verse, punctuation only, and a very long line.
 * None of it may throw, hang, or return a result that does not contain what was asked for.
 *
 *   node tests/qa/bible-search.js
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
    const timings = [];
    const queries = [
      'for God so loved',                 // the obvious one
      'For God so loved the world',       // longer, exact
      'god so lovd the wrld',             // misspelled, the case the guesser exists for
      'in the beginnning',                // one wrong word
      'shepherd',                         // a single common word
      'a',                                // one letter
      'zzzzzzzz',                         // nothing on earth
      '',                                 // empty
      '   ',                              // whitespace only
      '...',                              // punctuation only
      '.*',                               // regex, if the search builds one
      '(',                                // an unbalanced bracket
      '[a-z]+',                           // a whole pattern
      '\\\\',                             // a lone backslash
      'the LORD is my shepherd; I shall not want',   // a full verse with punctuation
      'jesus wept',                       // the shortest verse
      'THE WORD WAS GOD',                 // shouting
      '  for god so loved  ',             // padded
      'x'.repeat(400),                    // absurd
      'love '.repeat(50),                 // repetitive and long
    ];

    queries.forEach(q => {
      const t0 = performance.now();
      let res;
      // Exactly what the search box does: the plain substring search, and the loose one that
      // guesses at misspellings when the first finds nothing.
      try { res = searchVerses(q); if (!res.hits.length) res = searchVersesLoose(q); }
      catch (e) { findings.push('threw on ' + JSON.stringify(q.slice(0, 30)) + ' -> ' + e.message); return; }
      const ms = performance.now() - t0;
      timings.push({ q: q.slice(0, 24), ms: Math.round(ms), n: (res && res.hits ? res.hits.length : 0) });
      if (ms > 4000) findings.push('took ' + Math.round(ms) + 'ms on ' + JSON.stringify(q.slice(0, 30)));
      if (res && !Array.isArray(res.hits)) findings.push('gave no list of hits for ' + JSON.stringify(q.slice(0, 30)));
      (res && res.hits || []).forEach(h => {
        if (!(h.b >= 1 && h.b <= 66)) findings.push('hit outside the Bible for ' + JSON.stringify(q.slice(0, 20)) + ': book ' + h.b);
        if (!kjvText(h.b, h.c, h.v)) findings.push('hit with no verse behind it for ' + JSON.stringify(q.slice(0, 20)));
      });
    });

    // a real phrase must actually find its verse
    const known = searchVerses('For God so loved the world');
    const foundJohn = (known.hits || []).some(h => h.b === 43 && h.c === 3 && h.v === 16);
    // and a misspelling of it must still get there
    const fuzzy = searchVersesLoose('for god so lovd the wrld');
    const fuzzyFound = (fuzzy.hits || []).some(h => h.b === 43 && h.c === 3 && h.v === 16);

    return { findings, timings, foundJohn, fuzzyFound, fuzzyNote: (fuzzy.fixed || []).join(' ') };
  }).catch(e => ({ fatal: e.message }));

  if (r.fatal) {
    say(false, 'could not run: ' + r.fatal);
  } else {
    r.findings.slice(0, 20).forEach(f => say(false, f));
    if (!r.findings.length) say(true, 'nothing thrown, hung, or returned outside the Bible');
    say(r.foundJohn, 'a phrase typed correctly finds its verse');
    say(r.fuzzyFound, '...and one typed badly still gets there' + (r.fuzzyNote ? ' ("' + r.fuzzyNote + '")' : ''));
    const slow = r.timings.filter(t => t.ms > 1500);
    say(!slow.length, 'no search took longer than a second and a half'
      + (slow.length ? ' — ' + slow.map(s => s.q + ':' + s.ms + 'ms').join(', ') : ''));
  }

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nBIBLE SEARCH FAILED' : '\nbible search clean');
  await browser.close(); await H.stopServer();
})();
