/**
 * QA probe 17 — WHERE THE FILMS COME FROM.
 *
 * The films moved out of the app: it knows their names and asks a manifest at runtime where the
 * files are and which cut is current, so a film can be re-cut without anybody downloading anything.
 * Three things have to hold or that trade is a bad one:
 *
 *   the built-in table still works when the manifest cannot be reached (a plane, a bad network);
 *   a broken or hostile manifest changes nothing except which file plays;
 *   an absolute URL in the manifest wins, which is how the films move host without a release.
 *
 *   node tests/qa/films.js
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
    Store.remove('vv_films');

    // 1. nothing fetched yet: the built-in table is in charge
    res.cold = { intro: filmSrc('intro'), rev: filmRev('intro'), has: filmHas('intro'),
                 unrecorded: filmSrc('recall') };

    // 2. the manifest moves a film to another host entirely
    Store.setJSON('vv_films', { films: {
      intro: { src: 'https://films.example.com/intro-v2.mp4', rev: '20270101' },
      book:  { src: 'other.mp4', rev: '9' }
    }});
    // FilmHost caches its read, so a fresh read is what a new page load would see
    location.hash = '';
    res.moved = null;
    return res;
  });

  // the cached-map read happens once per page, so the second half needs a fresh page
  const page2 = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const r2 = await page2.evaluate(() => {
    Store.setJSON('vv_films', { films: {
      intro: { src: 'https://films.example.com/intro-v2.mp4', rev: '20270101' },
      book:  { src: 'other.mp4', rev: '9' }
    }});
    return { moved: filmSrc('intro'), movedRev: filmRev('intro'),
             relative: filmSrc('book'),
             untouched: filmSrc('palace'),
             url: filmURL(VIDEOS.intro) };
  });

  // a manifest full of nonsense must leave the app exactly as it was
  const page3 = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const r3 = await page3.evaluate(() => {
    const bad = [null, 'nope', 42, {}, {films: null}, {films: 'x'},
                 {films: {intro: {src: 12345}}}, {films: {intro: null}}];
    const survived = bad.every(b => { try { Store.setJSON('vv_films', b); filmSrc('intro'); filmURL(VIDEOS.intro); return true; } catch (e) { return false; } });
    Store.remove('vv_films');
    return { survived, stillThere: filmSrc('intro') };
  });

  say(/intro\.mp4$/.test(r.cold.intro), 'with no manifest the built-in film is used (' + r.cold.intro + ')');
  say(r.cold.rev === '20260831', '...at the cut the app shipped with');
  say(r.cold.has, '...and it counts as playable');
  say(r.cold.unrecorded === '', 'a film with no source stays empty, so the placeholder card still draws');

  say(r2.moved === 'https://films.example.com/intro-v2.mp4', 'an absolute url in the manifest wins outright');
  say(r2.movedRev === '20270101', '...with its own revision');
  say(/\/videos\/other\.mp4$/.test(r2.relative), 'a relative one resolves against the film host (' + r2.relative + ')');
  say(/palace\.mp4$/.test(r2.untouched), 'a film the manifest does not mention is left alone');
  say(/\?v=20270101$/.test(r2.url), 'the revision goes on the url, so a re-cut is never served from cache');

  say(r3.survived, 'every shape of broken manifest is survived');
  say(/intro\.mp4$/.test(r3.stillThere), '...and the app falls back to what it shipped with');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nFILMS FAILED' : '\nfilms clean');
  await browser.close(); await H.stopServer();
})();
