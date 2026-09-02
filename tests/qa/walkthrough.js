/**
 * QA probe 7 — THE ADMIN WALKTHROUGH, STAGE BY STAGE.
 *
 * The walkthrough exists so the whole unlock path can be tested by hand without a fresh account.
 * Its one rule: every stage seeds everything up to the last action, so exactly ONE thing is left to
 * do. This checks that rule holds at every stage — that nothing is already finished when you arrive
 * (which would skip straight past), and that what the stage asks for is actually reachable there.
 *
 * It also proves the run gives your real account back, which is the part that must never break.
 *
 *   node tests/qa/walkthrough.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  // a real account to hand over and get back
  await page.evaluate(() => {
    closeEveryOverlay();
    Prog.memorized = ['43:3:16', '19:119:11']; Prog.talents = 4242;
    Prog.palaces = [{ place: 'My Real Palace', stations: ['A', 'B'], sr: {} }];
    Prog.libWon = ['pair', 'w4w']; saveProg();
  });

  const stages = await page.evaluate(() => {
    const seen = [];
    OnboardWalk.begin();
    for (let i = 0; i < 12; i++) {
      const w = OnboardWalk.where();
      if (!w) break;
      show('verse'); vView = 'hub'; renderVerse();
      seen.push({
        n: w.step, of: w.of, doing: w.doing,
        alreadyDone: w.done,      // must be false on arrival, or the stage is skipped past unseen
        tickets: (Prog.scratchWon || []).join(','),
        presents: (Prog.libWon || []).join(','),
        toolsUsed: Object.keys(Prog.libUsed || {}).sort().join(','),
        verses: (Prog.memorized || []).length,
        palaces: (Prog.palaces || []).filter(Boolean).length,
        streak: Prog.bestStreak || 0,
        tiles: document.querySelectorAll('#verse button.vhub').length,
        nextTicket: (() => { const p = pendingScratchRung(); return p >= 0 ? SCRATCH_LADDER[p].tab : ''; })(),
        nextPresent: (libPending() || {}).id || ''
      });
      if (!OnboardWalk.skip()) break;
    }
    return seen;
  }).catch(e => ({ err: e.message }));

  if (stages.err) { console.log('  FAIL could not walk the stages — ' + stages.err); }
  else {
    say(stages.length === 7, 'the walkthrough has seven stages');
    const premature = stages.filter(s => s.alreadyDone).map(s => s.doing);
    say(!premature.length, 'every stage arrives with its one thing still to do'
        + (premature.length ? ' — already finished at: ' + premature.join('; ') : ''));
    stages.forEach(s => {
      console.log('  ·    ' + s.n + '/' + s.of + '  ' + s.doing);
      console.log('         tickets[' + s.tickets + '] presents[' + s.presents + '] tools[' + s.toolsUsed + ']'
        + ' verses=' + s.verses + ' palaces=' + s.palaces + ' streak=' + s.streak + ' tiles=' + s.tiles
        + ' nextTicket=' + (s.nextTicket || '—') + ' nextPresent=' + (s.nextPresent || '—'));
    });

    const byName = n => stages.find(s => s.doing === n) || {};
    const first = byName('Memorise your first verse');
    say(first.tiles === 4, 'at the first verse the Library shows its opening four tiles');
    say(first.presents === '', '...with no present yet given');

    const round = byName('Finish a round of Practice Verses');
    say(round.presents === 'pair', 'at the practice round My Verses and Practice Verses are already in');
    say(round.tiles === 6, '...so the Library shows six tiles');
    say(round.toolsUsed === 'learn,mem', '...and the round itself is the one thing not yet done');

    const ticket = byName('Scratch the ticket that same round won');
    say(ticket.presents === 'pair,w4w', 'at the Bible stage both presents have been given');
    say(ticket.tiles === 7, '...the Library is complete at seven tiles');
    say(ticket.nextTicket === 'journey', '...and the Bible is the ticket waiting to be scratched');

    const fifth = byName('Memorise your fifth verse');
    say(fifth.verses === 4, 'at the fifth verse four are in');
    say(fifth.streak === 5, '...and the answer streak is already there');
    say(/journey/.test(fifth.tickets), '...with the Bible already won');
    say(fifth.nextTicket === '', '...and nothing to scratch until the fifth verse lands');

    const palace = byName('Build your first palace');
    say(/palace/.test(palace.tickets), 'at the palace stage the Memory Palaces ticket is won');
    say(palace.palaces === 0, '...and there is no palace yet, which is the thing to do');

    const last = byName('Memorise your fifteenth verse');
    say(last.verses === 14, 'at the last stage fourteen verses are in');
    say(last.palaces === 2, '...and the two palaces it asks for');
  }

  // and the real account comes back
  const back = await page.evaluate(async () => {
    OnboardWalk.end();
    await new Promise(r => setTimeout(r, 120));
    return { mem: (Prog.memorized || []).length, tal: Prog.talents,
             pal: (Prog.palaces[0] || {}).place, presents: (Prog.libWon || []).join(','),
             stash: !!Store.getJSON('vv_walk_backup', null), active: OnboardWalk.active() };
  });
  say(back.mem === 2 && back.tal === 4242 && back.pal === 'My Real Palace',
      'ending it hands back your real verses, talents and palaces');
  say(back.presents === 'pair,w4w', '...and the presents you had already been given');
  say(!back.stash && !back.active, '...with nothing of the walkthrough left behind');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nWALKTHROUGH FAILED' : '\nwalkthrough clean');
  await browser.close(); await H.stopServer();
})();
