/**
 * QA probe 6 — THE LIBRARY LADDER, WALKED.
 *
 * The behaviour suite pins each piece of the ladder on its own. This walks the whole thing the way
 * a reader meets it: open the Library cold, memorize a verse, close what that puts on screen, take
 * the present that follows, practise, take the next one, and check the Bible arrives at the end.
 *
 * It exists because the unit-level specs all passed while the real path was broken: finishing a
 * verse leaves a badge and then the goal flash on screen, the present was refused behind them, and
 * nothing looked again. Only a walk finds that.
 *
 *   node tests/qa/library-ladder.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const b = await H.chromium().launch();
  const page = await H.open(b, { which: 'built' });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const tiles = () => page.evaluate(() => {
    show('verse'); vView = 'hub'; renderVerse();
    return [...document.querySelectorAll('#verse button.vhub')]
      .map(x => (x.querySelector('span:nth-child(2)') || {}).textContent).filter(Boolean);
  });

  // a brand new reader, just given the Library
  await page.evaluate(() => {
    Prog.libWon = []; Prog.libUsed = {}; Prog.memorized = []; Prog.scratchWon = ['verse'];
    Prog.verseSR = {}; saveProg(); bustCaches(); closeEveryOverlay();
  });
  const t0 = await tiles();
  say(t0.length === 4, 'opens with four tiles: ' + t0.join(', '));
  say(!t0.includes('My Verses'), 'My Verses is not there yet');

  // the hint says what to do, and never what it is worth
  const hint = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#verse p.hint')].map(x => x.textContent).join(' | ');
    return p;
  });
  say(/Memorize your first verse/.test(hint), 'the hint names the next thing to do: "' + hint.trim() + '"');
  say(!/My Verses|Practice Verses|Word for Word/.test(hint), '...without naming what is inside');

  // memorize one, the way the app does it
  await page.evaluate(() => { addMemorized('43:3:16'); saveProg(); });
  await page.waitForTimeout(1200);                 // the offer is deferred by design
  const why = await page.evaluate(() => {
    show('verse'); vView = 'hub'; renderVerse();
    return { modals: [...document.querySelectorAll('.modal')].filter(m=>getComputedStyle(m).display!=='none').map(m=>m.id).join('+') };
  });
  say(!!why.modals, 'finishing a verse leaves something on screen first (' + why.modals + ')');
  const early = await page.evaluate(() => libMaybeOffer());
  say(!early, '...and the present does not open on top of it');
  // The reader closes what is up, the way they would — and finishing a verse can queue more than
  // one: the badge first, then the goal flash behind it. Keep closing until the screen is clear.
  let cleared = '';
  for (let i = 0; i < 6; i++) {
    const still = await page.evaluate(() => {
      const open = [...document.querySelectorAll('.modal')].filter(m => getComputedStyle(m).display !== 'none');
      open.forEach(m => (m.style.display = 'none'));
      return open.map(m => m.id).join('+');
    });
    if (still) cleared += (cleared ? ' then ' : '') + still;
    await page.waitForTimeout(1100);
    const any = await page.evaluate(() => [...document.querySelectorAll('.modal')].some(m => getComputedStyle(m).display !== 'none'));
    if (!any) break;
  }
  say(!!cleared, 'the reader closes what finishing a verse put up (' + cleared + ')');
  await page.waitForTimeout(1200);
  const offered = await page.evaluate(() => {
    const on = !!document.querySelector('#scov.on');
    return { on, title: (document.getElementById('scTitle') || {}).textContent || '',
             claim: (document.getElementById('scClaim') || {}).textContent || '',
             name: (document.getElementById('scName') || {}).textContent || '' };
  });
  say(offered.on, 'a ticket is waiting on the Library after the first verse');
  say(/Got It/i.test(offered.claim), '...and the button reads "' + offered.claim.trim() + '"');
  say(/My Verses/.test(offered.name), '...for ' + offered.name);

  // the foil must be scratched before it can be claimed
  const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('scClaim')).display === 'none');
  say(hidden, 'the claim button is hidden until the foil is scratched');

  // claim it
  await page.evaluate(() => {
    const r = LIB_LADDER.find(x => x.id === 'pair');
    Prog.libWon.push(r.id); saveProg();
    document.getElementById('scov').classList.remove('on');
  });
  const t1 = await tiles();
  say(t1.length === 6 && t1.includes('My Verses') && t1.includes('Practice Verses'),
      'both arrive together: ' + t1.join(', '));

  // a round of practice earns the last one
  await page.evaluate(() => { libUse('verses'); });
  await page.waitForTimeout(1200);
  const second = await page.evaluate(() => {
    show('verse'); vView = 'hub'; renderVerse(); libMaybeOffer();
    return { on: !!document.querySelector('#scov.on'), name: (document.getElementById('scName')||{}).textContent||'' };
  });
  say(second.on && /Word for Word/.test(second.name), 'the next ticket is Word for Word');
  await page.evaluate(() => { Prog.libWon.push('w4w'); saveProg(); document.getElementById('scov').classList.remove('on'); });
  const t2 = await tiles();
  say(t2.length === 7, 'the finished Library carries seven: ' + t2.join(', '));

  // and nothing more is offered
  const done = await page.evaluate(() => { show('verse'); vView='hub'; renderVerse(); return libMaybeOffer(); });
  say(!done, 'nothing further is offered once every present is given');
  const noHint = await page.evaluate(() => [...document.querySelectorAll('#verse p.hint')].map(x=>x.textContent).join(' '));
  say(!/\u{1F381}/u.test(noHint), '...and the hint line is gone');

  // the Bible arrives once every tool has been used
  const bible = await page.evaluate(() => {
    const req = () => SCRATCH_LADDER.find(x => x.tab === 'journey').reqs[0];
    // everything used except the round of practice the Bible actually asks for
    Prog.libUsed = { learn:1, numbers:1, videos:1, mem:1, w4w:1 }; saveProg();
    const short = { done: req().done(), prog: req().prog() };
    Prog.libUsed.verses = 1; saveProg();
    return { short, ready: req().done(), prog: req().prog(), label: req().label,
             order: SCRATCH_LADDER.map(x => x.tab).join(',') };
  });
  say(!bible.short.done && bible.short.prog === '0/1', 'the Bible shows ' + bible.short.prog + ' until a round of practice is finished');
  say(bible.ready && bible.prog === '1/1', '...and that round wins it — "' + bible.label + '"');
  say(bible.order === 'verse,journey,palace,stories', '...and it is the second ticket on the ladder, not the last');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nWALK FAILED' : '\nwalk clean');
  await b.close(); await H.stopServer();
})();
