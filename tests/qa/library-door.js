/**
 * QA probe 6 — THE WAY INTO THE LIBRARY.
 *
 * A book lesson offers a verse from that book; building that verse wins the Library; the room opens
 * with every tile on it and two golden stickers saying what lifts them. This walks that path,
 * because it is the one a new reader takes and the one nothing else exercises end to end.
 *
 * (It replaces library-ladder.js, which walked the ladder of presents that v1.103 removed.)
 *
 *   node tests/qa/library-door.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  // a reader who knows books 1-5, has just finished Matthew, and has no verse yet
  const lesson = await page.evaluate(() => {
    closeEveryOverlay();
    Prog.memorized = []; Prog.scratchWon = []; Prog.libUsed = {}; Prog.palaces = [];
    Prog.doneSkills = ['snd:0-4', 'snd:5-9'].concat([1, 2, 3, 4, 5, 40].map(n => 'book:' + n))
      .concat(Object.values(VIDEOS).map(v => v.skill).filter(s => s !== VIDEOS.sr.skill));
    saveProg(); bustCaches(); updateTabLocks();
    LESSON_DONE = { ok: 8, msg: '', unlocked: '', hasNew: false,
                    canBuild: (suggestedByBook()[40] || []).length > 0, buildBook: 40 };
    renderLessonDone();
    return { offers: !!el('lBuild'), libraryLocked: !tabWon('verse'),
             label: (el('lBuild') || {}).textContent || '' };
  });
  say(lesson.offers, 'a book lesson offers a verse even when it opened none: "' + lesson.label.trim() + '"');
  say(lesson.libraryLocked, '...while the Library is still locked');

  // taking the offer keeps the reader on Learn rather than showing the room first
  const door = await page.evaluate(() => {
    el('lBuild').click();
    return { view: (document.querySelector('.view.active') || {}).id,
             picking: !!document.querySelector('.modal[style*="flex"]') };
  });
  say(door.view === 'learn', 'the offer opens over the Learn screen, not the locked Library');
  say(door.picking, "...with that book's verses to choose from");

  // and the verse itself wins the room
  const won = await page.evaluate(() => {
    document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
    addMemorized({ b: 'Matthew', c: 6, v: 33 });
    saveProg(); updateTabLocks();
    const rung = SCRATCH_LADDER.find(x => x.tab === 'verse');
    return { gate: rung.gate(), asks: rung.reqs[0].label };
  });
  say(won.gate, 'the first verse wins the Library ticket');
  say(/first verse/i.test(won.asks), '...which is what the ticket asked for: "' + won.asks + '"');

  const room = await page.evaluate(() => {
    Prog.scratchWon = ['verse']; saveProg();
    closeEveryOverlay(); show('verse'); vView = 'hub'; renderVerse();
    return { tiles: [...document.querySelectorAll('#verse button.vhub')]
               .map(b => (b.querySelector('span:nth-child(2)') || {}).textContent).filter(Boolean),
             foils: [...document.querySelectorAll('#verse .slock .slock-t')].map(x => x.textContent) };
  });
  say(room.tiles.length === 7, 'the Library opens with every tile: ' + room.tiles.join(', '));
  say(room.foils.join(' + ') === 'Build a Memory Palace + Practice Verses to Unlock',
      '...and two stickers saying what opens them: ' + room.foils.join(' + '));

  // practice lifts one of them, on both screens, and wins the Bible
  const practised = await page.evaluate(() => {
    libUse('verses');
    show('verse'); vView = 'hub'; renderVerse();
    const hub = [...document.querySelectorAll('#verse .slock .slock-t')].map(x => x.textContent);
    renderLearnedVerse(40, 6, 33, () => {});
    const onVerse = [...document.querySelectorAll('#verse .slock .slock-t')].map(x => x.textContent);
    return { hub, onVerse, bible: SCRATCH_LADDER.find(x => x.tab === 'journey').gate() };
  });
  say(practised.hub.join('') === 'Build a Memory Palace', 'a round of practice lifts the Word for Word sticker');
  say(!practised.onVerse.length, '...on the verse screen too');
  say(practised.bible, '...and the same round wins the Bible');

  const palace = await page.evaluate(() => {
    markVideoSeen('sr'); saveProg(); bustCaches();
    show('verse'); vView = 'hub'; renderVerse();
    return document.querySelectorAll('#verse .slock').length;
  });
  say(palace === 0, 'the first palace lifts the last sticker, and the room is fully open');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nWALK FAILED' : '\nwalk clean');
  await browser.close(); await H.stopServer();
})();
